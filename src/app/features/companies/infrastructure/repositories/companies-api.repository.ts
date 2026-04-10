import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { Company } from '../../../../core/company/models/company.model';
import { environment } from '../../../../../environments/environment';
import {
  BackendCompanyCatalogsDto,
  BackendCompanyDto,
  mapBackendCompanyToDetail,
  mapCompanyDetailToContextCompany,
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
  private readonly baseUrl = `${environment.apiUrl}/configuracion`;

  listContextCompanies(): Observable<Company[]> {
    return this.withFallback(
      () =>
        this.fetchCompanies().pipe(
          map((response) =>
            response
              .map((company) => mapBackendCompanyToDetail(company))
              .filter((company) => company.status === 'active')
              .map((company) => mapCompanyDetailToContextCompany(company)),
          ),
        ),
      () => this.mockRepository.listContextCompanies(),
      'contexto de empresas',
    );
  }

  listCompanies(filters: CompanyListFilters): Observable<CompanyRowVm[]> {
    return this.withFallback(
      () =>
        this.fetchCompanies()
          .pipe(
            map((response) =>
              response
                .map((company) => mapCompanyDetailToRow(mapBackendCompanyToDetail(company)))
                .filter((company) => this.matchesFilters(company, filters))
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
    return this.mockRepository.getFormCatalogs();
  }

  saveCompany(payload: SaveCompanyPayload, companyId?: string): Observable<CompanyDetailVm> {
    return this.withFallback(
      () => {
        const requestBody = mapCompanyPayloadToBackend(payload);

        if (companyId) {
          return this.resolveCompanyRequestId(companyId).pipe(
            switchMap((requestCompanyId) =>
              this.http
                .put<BackendCompanyDto | void>(
                  `${this.withTrailingSlash(this.baseUrl)}${requestCompanyId}`,
                  requestBody,
                )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedCompany(response, [companyId, requestCompanyId]),
                  ),
                ),
            ),
          );
        }

        return this.http
          .post<BackendCompanyDto>(this.withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((company) => this.resolveSavedCompany(company)),
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
        this.loadCompany(companyId).pipe(
          switchMap((company) =>
            this.resolveCompanyRequestId(companyId).pipe(
              switchMap((requestCompanyId) =>
                this.http
                  .put<BackendCompanyDto | void>(
                    `${this.withTrailingSlash(this.baseUrl)}${requestCompanyId}`,
                    mapCompanyPayloadToBackend({
                      companyName: company.companyName,
                      nit: company.nit,
                      sector: company.sector,
                      address: company.address,
                      city: company.city,
                      country: company.country,
                      phone: company.phone,
                      email: company.email,
                      status,
                      operationStartDate: company.operationStartDate,
                      baseCurrency: company.baseCurrency,
                      timezone: company.timezone,
                      language: company.language,
                      taxConfiguration: company.taxConfiguration,
                      initialConfiguration: company.initialConfiguration,
                      logoUrl: company.logoUrl,
                    }),
                  )
                  .pipe(
                    switchMap((response) =>
                      this.resolveSavedCompany(response, [companyId, requestCompanyId]),
                    ),
                  ),
              ),
            ),
          ),
        ),
      () => this.mockRepository.updateCompanyStatus(companyId, status),
      'estado de empresa',
    );
  }

  private loadCompany(companyId: string): Observable<CompanyDetailVm> {
    return this.fetchCompanies().pipe(
      map((companies) => {
        const company = companies.find((candidate) => this.matchesCompanyReference(candidate, companyId));

        if (!company) {
          throw new Error('No se encontró la empresa solicitada.');
        }

        return mapBackendCompanyToDetail(company);
      }),
    );
  }

  private fetchCompanies(): Observable<BackendCompanyDto[]> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.baseUrl), {
        params: new HttpParams().set('limit', '500'),
      })
      .pipe(map((response) => this.extractArrayPayload<BackendCompanyDto>(response)));
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

  private matchesFilters(company: CompanyRowVm, filters: CompanyListFilters): boolean {
    const normalizedSearch = this.normalizeValue(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        company.companyName,
        company.nit,
        company.sector,
        company.city,
        company.country,
        company.email,
        company.backendId ?? '',
      ].some((value) => this.normalizeValue(value).includes(normalizedSearch));
    const matchesStatus = filters.status === 'all' || company.status === filters.status;
    const matchesSector = filters.sector === 'all' || company.sector === filters.sector;
    const createdDate = company.createdAt.slice(0, 10);
    const matchesFrom = !filters.dateFrom || createdDate >= filters.dateFrom;
    const matchesTo = !filters.dateTo || createdDate <= filters.dateTo;

    return matchesSearch && matchesStatus && matchesSector && matchesFrom && matchesTo;
  }

  private matchesCompanyReference(company: BackendCompanyDto, companyId: string): boolean {
    const normalizedCompanyId = companyId.trim();
    const candidates = [
      this.resolveNullableText(company.id),
      this.resolveNullableText(company.empresa_id),
      this.resolveNullableText(company.backend_id),
    ];

    return candidates.includes(normalizedCompanyId);
  }

  private resolveCompanyRequestId(companyId: string): Observable<string> {
    return this.fetchCompanies().pipe(
      map((companies) => {
        const company = companies.find((candidate) => this.matchesCompanyReference(candidate, companyId));
        const requestCompanyId = company ? this.resolveNullableText(company.id) : null;

        if (!requestCompanyId) {
          throw new Error('No fue posible resolver el identificador interno de la empresa.');
        }

        return requestCompanyId;
      }),
    );
  }

  private resolveSavedCompany(
    company: BackendCompanyDto | void,
    fallbackReferences: string[] = [],
  ): Observable<CompanyDetailVm> {
    const responseCompanyId = company ? this.resolveId(company) : null;
    const responseBackendCompanyId = company ? this.resolveNullableText(company.empresa_id) : null;
    const references = [responseCompanyId, responseBackendCompanyId, ...fallbackReferences].filter(
      (value): value is string => !!value,
    );

    if (company && responseCompanyId) {
      return of(mapBackendCompanyToDetail(company));
    }

    if (!references.length) {
      return throwError(() => new Error('No fue posible recuperar la empresa guardada.'));
    }

    return this.loadCompany(references[0]);
  }

  private resolveId(company: BackendCompanyDto): string | null {
    const candidate = company.id ?? company.backend_id ?? company.empresa_id;

    if (typeof candidate === 'number') {
      return String(candidate);
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    return null;
  }

  private resolveNullableText(value: number | string | null | undefined): string | null {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return null;
  }

  private extractArrayPayload<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === 'object') {
      const candidate = payload as {
        items?: unknown[];
        results?: unknown[];
        data?: unknown[];
      };

      if (Array.isArray(candidate.items)) {
        return candidate.items as T[];
      }

      if (Array.isArray(candidate.results)) {
        return candidate.results as T[];
      }

      if (Array.isArray(candidate.data)) {
        return candidate.data as T[];
      }
    }

    return [];
  }

  private normalizeValue(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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