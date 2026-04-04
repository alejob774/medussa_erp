import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyListFilters,
  CompanyRecordStatus,
  CompanyRowVm,
  SaveCompanyPayload,
} from '../../domain/models/company-administration.model';
import { CompaniesRepository } from '../../domain/repositories/companies.repository';
import { CompaniesApiRepository } from '../../infrastructure/repositories/companies-api.repository';
import { CompaniesMockRepository } from '../../infrastructure/repositories/companies-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class CompaniesFacadeService {
  private readonly mockRepository = inject(CompaniesMockRepository);
  private readonly apiRepository = inject(CompaniesApiRepository);

  listCompanies(filters: CompanyListFilters): Observable<CompanyRowVm[]> {
    return this.repository.listCompanies(filters);
  }

  getCompany(companyId: string): Observable<CompanyDetailVm> {
    return this.repository.getCompany(companyId);
  }

  getFormCatalogs(): Observable<CompanyFormCatalogs> {
    return this.repository.getFormCatalogs();
  }

  saveCompany(
    payload: SaveCompanyPayload,
    companyId?: string,
  ): Observable<CompanyDetailVm> {
    return this.repository.saveCompany(payload, companyId);
  }

  updateCompanyStatus(
    companyId: string,
    status: CompanyRecordStatus,
  ): Observable<CompanyDetailVm> {
    return this.repository.updateCompanyStatus(companyId, status);
  }

  private get repository(): CompaniesRepository {
    return environment.useCompaniesAdministrationMock
      ? this.mockRepository
      : this.apiRepository;
  }
}