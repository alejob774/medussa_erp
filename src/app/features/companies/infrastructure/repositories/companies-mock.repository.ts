import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { mapCompanyDetailToRow } from '../../application/mappers/company-administration.mapper';
import {
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyListFilters,
  CompanyRecordStatus,
  CompanyRowVm,
  CompaniesStore,
  SaveCompanyPayload,
} from '../../domain/models/company-administration.model';
import { CompaniesRepository } from '../../domain/repositories/companies.repository';
import { INITIAL_COMPANIES_STORE } from '../data/companies.mock';

@Injectable({
  providedIn: 'root',
})
export class CompaniesMockRepository implements CompaniesRepository {
  private readonly storageKey = 'medussa.erp.mock.companies-administration';

  listCompanies(filters: CompanyListFilters): Observable<CompanyRowVm[]> {
    const normalizedSearch = normalizeValue(filters.search);

    const companies = this.readStore().companies
      .map((company) => this.cloneCompany(company))
      .filter((company) => {
        const matchesStatus = filters.status === 'all' || company.status === filters.status;
        const matchesSector = filters.sector === 'all' || company.sector === filters.sector;
        const matchesSearch =
          !normalizedSearch ||
          [
            company.companyName,
            company.nit,
            company.sector,
            company.city,
            company.country,
            company.email,
          ].some((value) => normalizeValue(value).includes(normalizedSearch));
        const matchesDate = this.matchesDateRange(company.createdAt, filters);

        return matchesStatus && matchesSector && matchesSearch && matchesDate;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((company) => mapCompanyDetailToRow(company));

    return of(companies).pipe(delay(240));
  }

  getCompany(companyId: string): Observable<CompanyDetailVm> {
    const company = this.readStore().companies.find((item) => item.id === companyId);

    if (!company) {
      return throwError(() => new Error('No se encontró la empresa solicitada.'));
    }

    return of(this.cloneCompany(company)).pipe(delay(180));
  }

  getFormCatalogs(): Observable<CompanyFormCatalogs> {
    return of(structuredClone(this.readStore().catalogs)).pipe(delay(120));
  }

  saveCompany(payload: SaveCompanyPayload, companyId?: string): Observable<CompanyDetailVm> {
    const store = this.readStore();
    const currentCompany = companyId
      ? store.companies.find((company) => company.id === companyId)
      : undefined;

    const validationError = this.validatePayload(store, payload, companyId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const nextCompany: CompanyDetailVm = {
      id: currentCompany?.id ?? this.buildCompanyId(payload.companyName),
      backendId: currentCompany?.backendId ?? null,
      code: currentCompany?.code ?? this.buildCompanyCode(payload.companyName, store),
      companyName: payload.companyName.trim(),
      nit: payload.nit.trim(),
      sector: payload.sector,
      address: payload.address.trim(),
      city: payload.city.trim(),
      country: payload.country,
      phone: payload.phone.trim(),
      email: payload.email.trim().toLowerCase(),
      status: payload.status,
      logoUrl: payload.logoUrl,
      associatedUsers: currentCompany?.associatedUsers.map((user) => ({ ...user })) ?? [],
      associatedUsersCount: currentCompany?.associatedUsersCount ?? 0,
      createdAt: currentCompany?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operationStartDate: payload.operationStartDate,
      baseCurrency: payload.baseCurrency,
      timezone: payload.timezone,
      language: payload.language,
      taxConfiguration: payload.taxConfiguration.trim(),
      initialConfiguration: payload.initialConfiguration.trim(),
    };

    const nextCompanies = currentCompany
      ? store.companies.map((company) =>
          company.id === currentCompany.id ? nextCompany : company,
        )
      : [nextCompany, ...store.companies];

    this.writeStore({
      ...store,
      companies: nextCompanies,
    });

    return of(this.cloneCompany(nextCompany)).pipe(delay(420));
  }

  updateCompanyStatus(
    companyId: string,
    status: CompanyRecordStatus,
  ): Observable<CompanyDetailVm> {
    const store = this.readStore();
    const currentCompany = store.companies.find((company) => company.id === companyId);

    if (!currentCompany) {
      return throwError(() => new Error('No se encontró la empresa solicitada.'));
    }

    const nextCompany: CompanyDetailVm = {
      ...this.cloneCompany(currentCompany),
      status,
      updatedAt: new Date().toISOString(),
    };

    this.writeStore({
      ...store,
      companies: store.companies.map((company) =>
        company.id === companyId ? nextCompany : company,
      ),
    });

    return of(this.cloneCompany(nextCompany)).pipe(delay(280));
  }

  private readStore(): CompaniesStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_COMPANIES_STORE);
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeStore(structuredClone(INITIAL_COMPANIES_STORE));
      return structuredClone(INITIAL_COMPANIES_STORE);
    }

    try {
      return JSON.parse(raw) as CompaniesStore;
    } catch {
      this.writeStore(structuredClone(INITIAL_COMPANIES_STORE));
      return structuredClone(INITIAL_COMPANIES_STORE);
    }
  }

  private writeStore(store: CompaniesStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: CompaniesStore,
    payload: SaveCompanyPayload,
    companyId?: string,
  ): string | null {
    const normalizedCompanyName = normalizeValue(payload.companyName);
    const normalizedNit = normalizeValue(payload.nit);

    if (!normalizedCompanyName) {
      return 'El nombre de la empresa es obligatorio.';
    }

    if (!normalizedNit) {
      return 'El NIT es obligatorio.';
    }

    if (!payload.sector.trim()) {
      return 'El sector es obligatorio.';
    }

    if (
      store.companies.some(
        (company) => company.id !== companyId && normalizeValue(company.companyName) === normalizedCompanyName,
      )
    ) {
      return 'Ya existe una empresa con ese nombre.';
    }

    if (
      store.companies.some(
        (company) => company.id !== companyId && normalizeValue(company.nit) === normalizedNit,
      )
    ) {
      return 'Ya existe una empresa con ese NIT.';
    }

    return null;
  }

  private matchesDateRange(createdAt: string, filters: CompanyListFilters): boolean {
    const createdDate = createdAt.slice(0, 10);

    if (filters.dateFrom && createdDate < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && createdDate > filters.dateTo) {
      return false;
    }

    return true;
  }

  private cloneCompany(company: CompanyDetailVm): CompanyDetailVm {
    return {
      ...company,
      associatedUsers: company.associatedUsers.map((user) => ({ ...user })),
    };
  }

  private buildCompanyId(companyName: string): string {
    const slug = companyName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `company-${slug}` : `company-${Date.now()}`;
  }

  private buildCompanyCode(companyName: string, store: CompaniesStore): string {
    const baseCode = companyName
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean)
      .slice(0, 4)
      .map((token) => token.charAt(0).toUpperCase())
      .join('') || 'COMP';

    let nextCode = baseCode;
    let sequence = 2;

    while (store.companies.some((company) => company.code === nextCode)) {
      nextCode = `${baseCode}${sequence}`;
      sequence += 1;
    }

    return nextCode;
  }
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}