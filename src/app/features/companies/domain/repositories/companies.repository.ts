import { Observable } from 'rxjs';
import {
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyListFilters,
  CompanyRecordStatus,
  CompanyRowVm,
  SaveCompanyPayload,
} from '../models/company-administration.model';

export interface CompaniesRepository {
  listCompanies(filters: CompanyListFilters): Observable<CompanyRowVm[]>;
  getCompany(companyId: string): Observable<CompanyDetailVm>;
  getFormCatalogs(): Observable<CompanyFormCatalogs>;
  saveCompany(payload: SaveCompanyPayload, companyId?: string): Observable<CompanyDetailVm>;
  updateCompanyStatus(
    companyId: string,
    status: CompanyRecordStatus,
  ): Observable<CompanyDetailVm>;
}