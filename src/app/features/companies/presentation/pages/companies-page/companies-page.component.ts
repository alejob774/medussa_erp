import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { CompaniesFacadeService } from '../../../application/facade/companies.facade';
import {
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyListFilters,
  CompanyRecordStatus,
  CompanyRowVm,
  EMPTY_COMPANY_FORM_CATALOGS,
  SaveCompanyPayload,
} from '../../../domain/models/company-administration.model';
import { CompanyFormPanelComponent } from '../../components/company-form-panel.component';

@Component({
  selector: 'app-companies-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    CompanyFormPanelComponent,
  ],
  templateUrl: './companies-page.component.html',
  styleUrl: './companies-page.component.scss',
})
export class CompaniesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companiesFacade = inject(CompaniesFacadeService);

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>('all'),
    sector: this.fb.nonNullable.control<string>('all'),
    dateFrom: this.fb.control<string | null>(null),
    dateTo: this.fb.control<string | null>(null),
  });

  catalogs: CompanyFormCatalogs = EMPTY_COMPANY_FORM_CATALOGS;
  companies: CompanyRowVm[] = [];
  selectedCompany: CompanyDetailVm | null = null;
  loading = true;
  loadingCatalogs = true;
  panelOpen = false;
  panelLoading = false;
  savingCompany = false;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.loadCatalogs();
    this.loadCompanies();
  }

  get totalCompanies(): number {
    return this.companies.length;
  }

  get activeCompanies(): number {
    return this.companies.filter((company) => company.status === 'active').length;
  }

  get representedSectors(): number {
    return new Set(this.companies.map((company) => company.sector)).size;
  }

  applyFilters(): void {
    this.loadCompanies();
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'all',
      sector: 'all',
      dateFrom: null,
      dateTo: null,
    });
    this.loadCompanies();
  }

  openNewCompany(): void {
    this.successMessage = '';
    this.selectedCompany = null;
    this.panelLoading = false;
    this.panelOpen = true;
  }

  editCompany(company: CompanyRowVm): void {
    this.successMessage = '';
    this.panelOpen = true;
    this.panelLoading = true;
    this.selectedCompany = null;

    this.companiesFacade
      .getCompany(company.id)
      .pipe(finalize(() => (this.panelLoading = false)))
      .subscribe({
        next: (detail) => {
          this.selectedCompany = detail;
        },
        error: (error: unknown) => {
          this.panelOpen = false;
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar la empresa.');
        },
      });
  }

  closePanel(): void {
    this.panelOpen = false;
    this.panelLoading = false;
    this.selectedCompany = null;
  }

  saveCompany(payload: SaveCompanyPayload): void {
    this.savingCompany = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companiesFacade
      .saveCompany(payload, this.selectedCompany?.id)
      .pipe(finalize(() => (this.savingCompany = false)))
      .subscribe({
        next: (company) => {
          this.closePanel();
          this.successMessage = this.selectedCompany
            ? `La empresa ${company.companyName} fue actualizada correctamente.`
            : `La empresa ${company.companyName} fue creada correctamente.`;
          this.loadCompanies();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar la empresa.');
        },
      });
  }

  toggleCompanyStatus(company: CompanyRowVm): void {
    const nextStatus: CompanyRecordStatus = company.status === 'active' ? 'inactive' : 'active';

    this.statusUpdatingId = company.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.companiesFacade
      .updateCompanyStatus(company.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (updatedCompany) => {
          this.successMessage =
            updatedCompany.status === 'active'
              ? `La empresa ${updatedCompany.companyName} fue activada.`
              : `La empresa ${updatedCompany.companyName} fue inactivada.`;
          this.loadCompanies();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible actualizar el estado de la empresa.',
          );
        },
      });
  }

  hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();

    return !!(
      value.search.trim() ||
      value.status !== 'all' ||
      value.sector !== 'all' ||
      value.dateFrom ||
      value.dateTo
    );
  }

  visibleAssociatedUsers(company: CompanyRowVm): CompanyRowVm['associatedUsers'] {
    return company.associatedUsers.slice(0, 2);
  }

  remainingAssociatedUsers(company: CompanyRowVm): number {
    return Math.max(company.associatedUsersCount - this.visibleAssociatedUsers(company).length, 0);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
    }).format(new Date(date));
  }

  locationLabel(company: CompanyRowVm): string {
    return company.city ? `${company.city} / ${company.country}` : company.country;
  }

  rowActionLabel(status: CompanyRecordStatus): string {
    return status === 'active' ? 'Inactivar' : 'Activar';
  }

  isUpdatingStatus(companyId: string): boolean {
    return this.statusUpdatingId === companyId;
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.companiesFacade
      .getFormCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los catálogos del formulario.',
          );
        },
      });
  }

  private loadCompanies(): void {
    this.loading = true;

    this.companiesFacade
      .listCompanies(this.currentFilters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (companies) => {
          this.companies = companies;
        },
        error: (error: unknown) => {
          this.companies = [];
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar el catálogo global de empresas.',
          );
        },
      });
  }

  private get currentFilters(): CompanyListFilters {
    const value = this.filterForm.getRawValue();

    return {
      search: value.search,
      status: value.status,
      sector: value.sector,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
    };
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}