export type CompanyRecordStatus = 'active' | 'inactive';

export type CompanyListStatusFilter = 'all' | CompanyRecordStatus;

export interface CompanyAssociatedUserVm {
  userId: string;
  backendId?: string | null;
  fullName: string;
  email: string;
  roleLabel: string | null;
  status: CompanyRecordStatus;
  avatarUrl: string | null;
}

export interface CompanyRowVm {
  id: string;
  backendId?: string | null;
  code: string;
  companyName: string;
  nit: string;
  sector: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  status: CompanyRecordStatus;
  logoUrl: string | null;
  associatedUsersCount: number;
  associatedUsers: CompanyAssociatedUserVm[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface CompanyDetailVm extends CompanyRowVm {
  operationStartDate: string | null;
  baseCurrency: string;
  timezone: string;
  language: string;
  taxConfiguration: string;
  initialConfiguration: string;
}

export interface CompanyListFilters {
  search: string;
  status: CompanyListStatusFilter;
  sector: string | 'all';
  dateFrom: string | null;
  dateTo: string | null;
}

export interface CompanyCatalogOption {
  value: string;
  label: string;
}

export interface CompanyFormCatalogs {
  sectors: CompanyCatalogOption[];
  countries: CompanyCatalogOption[];
  currencies: CompanyCatalogOption[];
  timezones: CompanyCatalogOption[];
  languages: CompanyCatalogOption[];
}

export interface SaveCompanyPayload {
  companyName: string;
  nit: string;
  sector: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  status: CompanyRecordStatus;
  operationStartDate: string | null;
  baseCurrency: string;
  timezone: string;
  language: string;
  taxConfiguration: string;
  initialConfiguration: string;
  logoUrl: string | null;
}

export interface CompaniesStore {
  companies: CompanyDetailVm[];
  catalogs: CompanyFormCatalogs;
}

export const EMPTY_COMPANY_FORM_CATALOGS: CompanyFormCatalogs = {
  sectors: [],
  countries: [],
  currencies: [],
  timezones: [],
  languages: [],
};