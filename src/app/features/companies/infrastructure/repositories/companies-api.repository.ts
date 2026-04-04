import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  BackendCompanyCatalogsDto,
  BackendCompanyDto,
  mapBackendCompanyToDetail,
  mapCompanyDetailToRow,
  mapCompanyPayloadToBackend,
} from '../../application/mappers/company-administration.mapper';
import {
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyListFilters,
  CompanyRecordStatus,
  CompanyRowVm,
  SaveCompanyPayload,
} from '../../domain/models/company-administration.model';
import { CompaniesRepository } from '../../domain/repositories/companies.repository';
import { CompaniesMockRepository } from './companies-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class CompaniesApiRepository implements CompaniesRepository {
  private readonly http = inject(HttpClient);
  private readonly mockRepository = inject(CompaniesMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/companies`;

  listCompanies(filters: CompanyListFilters): Observable<CompanyRowVm[]> {
    return this.withFallback(
      () =>
        this.http
          .get<BackendCompanyDto[]>(this.withTrailingSlash(this.baseUrl), {
            params: this.buildListParams(filters),
          })
          .pipe(
            map((response) =>
              response
                .map((company) => mapCompanyDetailToRow(mapBackendCompanyToDetail(company)))
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
            ),
          ),
      () => this.mockRepository.listCompanies(filters),
      'catálogo de empresas',
    );
  }

  getCompany(companyId: string): Observable<CompanyDetailVm> {
    return this.withFallback(
      () => this.loadCompany(companyId),
      () => this.mockRepository.getCompany(companyId),
      'empresa',
    );
  }

  getFormCatalogs(): Observable<CompanyFormCatalogs> {
    return this.withFallback(
      () =>
        this.http
          .get<BackendCompanyCatalogsDto>(`${this.withTrailingSlash(this.baseUrl)}catalogs`)
          .pipe(map((response) => this.mapCatalogs(response))),
      () => this.mockRepository.getFormCatalogs(),
      'catálogos de empresas',
    );
  }

  saveCompany(payload: SaveCompanyPayload, companyId?: string): Observable<CompanyDetailVm> {
    return this.withFallback(
      () => {
        const requestBody = mapCompanyPayloadToBackend(payload);

        if (companyId) {
          return this.http
            .put<void>(`${this.withTrailingSlash(this.baseUrl)}${companyId}`, requestBody)
            .pipe(switchMap(() => this.loadCompany(companyId)));
        }

        return this.http
          .post<BackendCompanyDto>(this.withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((company) => {
              const createdId = this.resolveId(company);

              if (!createdId) {
                return throwError(() => new Error('La API no devolvió el id de la empresa creada.'));
              }

              return this.loadCompany(createdId);
            }),
          );
      },
      () => this.mockRepository.saveCompany(payload, companyId),
      companyId ? 'actualización de empresa' : 'creación de empresa',
    );
  }

  updateCompanyStatus(
    companyId: string,
    status: CompanyRecordStatus,
  ): Observable<CompanyDetailVm> {
    return this.withFallback(
      () =>
        this.http
          .patch<void>(`${this.withTrailingSlash(this.baseUrl)}${companyId}/status`, {
            estado: status === 'active',
          })
          .pipe(switchMap(() => this.loadCompany(companyId))),
      () => this.mockRepository.updateCompanyStatus(companyId, status),
      'estado de empresa',
    );
  }

  private loadCompany(companyId: string): Observable<CompanyDetailVm> {
    return this.http
      .get<BackendCompanyDto>(`${this.withTrailingSlash(this.baseUrl)}${companyId}`)
      .pipe(map((response) => mapBackendCompanyToDetail(response)));
  }

  private buildListParams(filters: CompanyListFilters): HttpParams {
    let params = new HttpParams();

    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }

    if (filters.status !== 'all') {
      params = params.set('status', filters.status);
    }

    if (filters.sector !== 'all') {
      params = params.set('sector', filters.sector);
    }

    if (filters.dateFrom) {
      params = params.set('date_from', filters.dateFrom);
    }

    if (filters.dateTo) {
      params = params.set('date_to', filters.dateTo);
    }

    return params;
  }

  private mapCatalogs(response: BackendCompanyCatalogsDto): CompanyFormCatalogs {
    return {
      sectors: this.normalizeCatalog(response.sectores ?? []),
      countries: this.normalizeCatalog(response.countries ?? response.paises ?? []),
      currencies: this.normalizeCatalog(response.currencies ?? response.monedas ?? []),
      timezones: this.normalizeCatalog(response.timezones ?? response.zonas_horarias ?? []),
      languages: this.normalizeCatalog(response.languages ?? response.idiomas ?? []),
    };
  }

  private normalizeCatalog(
    options: Array<{ value?: string | null; label?: string | null } | string>,
  ) {
    return options
      .map((option) => {
        if (typeof option === 'string') {
          return { value: option, label: option };
        }

        const value = option.value?.trim() ?? option.label?.trim() ?? '';
        const label = option.label?.trim() ?? option.value?.trim() ?? value;

        return value ? { value, label } : null;
      })
      .filter((option): option is { value: string; label: string } => option !== null);
  }

  private resolveId(company: BackendCompanyDto): string | null {
    const candidate = company.id ?? company.empresa_id;

    if (typeof candidate === 'number') {
      return String(candidate);
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    return null;
  }

  private withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context = 'módulo de empresas',
  ): Observable<T> {
    return operation().pipe(
      catchError((error: unknown) => {
        if (environment.enableCompaniesAdministrationFallback) {
          console.warn(`Se activó fallback mock para ${context}.`, error);
          return fallback();
        }

        return throwError(() => this.mapHttpError(error, context));
      }),
    );
  }

  private mapHttpError(error: unknown, context: string): Error {
    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error?.detail === 'string'
          ? error.error.detail
          : typeof error.error?.message === 'string'
            ? error.error.message
            : '';

      return new Error(
        backendMessage || `No fue posible completar la operación de ${context}.`,
      );
    }

    return error instanceof Error
      ? error
      : new Error(`No fue posible completar la operación de ${context}.`);
  }
}