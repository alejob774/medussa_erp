import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { VendorsFacadeService } from '../../../application/facade/vendors.facade';
import { DEFAULT_VENDOR_FILTERS, VendorFilters } from '../../../domain/models/vendor-filters.model';
import { SaveVendorPayload, VendorFormMode } from '../../../domain/models/vendor-form.model';
import {
  EMPTY_VENDOR_CATALOGS,
  Vendor,
  VendorAssignableClient,
  VendorCatalogs,
  VendorStatus,
} from '../../../domain/models/vendor.model';
import { EMPTY_VENDOR_LIST_RESPONSE, VendorListResponse } from '../../../domain/models/vendor-response.model';
import { VendorFormComponent } from '../../components/vendor-form/vendor-form.component';
import { VendorsListComponent } from '../../components/vendors-list/vendors-list.component';

@Component({
  selector: 'app-vendors-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    VendorFormComponent,
    VendorsListComponent,
  ],
  templateUrl: './vendors-page.component.html',
  styleUrl: './vendors-page.component.scss',
})
export class VendorsPageComponent {
  private readonly vendorsFacade = inject(VendorsFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: VendorCatalogs = EMPTY_VENDOR_CATALOGS;
  listResponse: VendorListResponse = EMPTY_VENDOR_LIST_RESPONSE;
  validationVendors: Vendor[] = [];
  assignableClients: VendorAssignableClient[] = [];
  selectedVendor: Vendor | null = null;
  formMode: VendorFormMode = 'create';
  isFormVisible = false;
  filters: VendorFilters = { ...DEFAULT_VENDOR_FILTERS };
  loadingCatalogs = true;
  loadingVendors = true;
  loadingSelection = false;
  loadingAssignableClients = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.vendorsFacade.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.activeCompanyId = company.id;
        this.activeCompanyName = company.name;
        this.filters = {
          ...DEFAULT_VENDOR_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationVendors();
        this.loadVendors(this.filters);
      });
  }

  get totalVendors(): number {
    return this.validationVendors.length;
  }

  get activeVendors(): number {
    return this.validationVendors.filter((vendor) => vendor.estado === 'ACTIVO').length;
  }

  get inactiveVendors(): number {
    return this.validationVendors.filter((vendor) => vendor.estado === 'INACTIVO').length;
  }

  get totalAssignedClients(): number {
    return this.validationVendors.reduce(
      (total, vendor) => total + vendor.cantidadClientesAsignados,
      0,
    );
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection(true, true);
    this.loadAssignableClients(null);
  }

  handleFiltersChange(filters: VendorFilters): void {
    this.loadVendors({
      ...this.filters,
      ...filters,
      empresaId: this.activeCompanyId,
    });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadVendors({
      ...this.filters,
      page: event.page,
      pageSize: event.pageSize,
      empresaId: this.activeCompanyId,
    });
  }

  handleSelectVendor(vendor: Vendor): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadVendor(vendor.id, 'view');
  }

  handleEditVendor(vendor: Vendor): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadVendor(vendor.id, 'edit');
  }

  handleZoneChanged(zone: string | null): void {
    this.loadAssignableClients(zone);
  }

  enableEditMode(): void {
    if (!this.selectedVendor) {
      return;
    }

    this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedVendor) {
      this.formMode = 'view';
      this.isFormVisible = true;
      this.loadAssignableClients(this.selectedVendor.zona);
      return;
    }

    this.resetSelection();
  }

  closeForm(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection();
  }

  saveVendor(payload: SaveVendorPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.vendorsFacade
      .saveVendor(payload, this.formMode === 'edit' ? this.selectedVendor?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedVendor = result.vendor;
          this.formMode = result.vendor ? 'view' : 'create';
          this.isFormVisible = false;
          this.loadValidationVendors();
          this.loadVendors(this.buildPostSaveFilters(result.vendor, result.action), false);
          this.assignableClients = [];
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el vendedor.');
        },
      });
  }

  deleteVendor(vendor: Vendor): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        vendor.tieneDependenciasActivas
          ? 'El vendedor tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el vendedor ${vendor.nombreVendedor}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    this.deletingId = vendor.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.vendorsFacade
      .deleteVendor(vendor.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedVendor?.id === vendor.id) {
            if (result.vendor) {
              this.selectedVendor = result.vendor;
              this.formMode = 'view';
              this.isFormVisible = false;
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationVendors();
          this.loadVendors(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del vendedor.');
        },
      });
  }

  toggleVendorStatus(vendor: Vendor): void {
    const nextStatus: VendorStatus = vendor.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = vendor.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.vendorsFacade
      .updateVendorStatus(vendor.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedVendor?.id === vendor.id && result.vendor) {
            this.selectedVendor = result.vendor;
          }

          this.loadValidationVendors();
          this.loadVendors(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del vendedor.');
        },
      });
  }

  retryVendors(): void {
    this.loadVendors(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.vendorsFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_VENDOR_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los catálogos de vendedores.',
          );
        },
      });
  }

  private loadVendors(filters: VendorFilters, clearMessages = true): void {
    this.loadingVendors = true;
    this.filters = {
      ...DEFAULT_VENDOR_FILTERS,
      ...filters,
      empresaId: this.activeCompanyId,
    };

    if (clearMessages) {
      this.errorMessage = '';
    }

    this.vendorsFacade
      .listVendors(this.filters)
      .pipe(finalize(() => (this.loadingVendors = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;

          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadVendors({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = {
            ...EMPTY_VENDOR_LIST_RESPONSE,
            filters: this.filters,
          };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los vendedores.');
        },
      });
  }

  private loadValidationVendors(): void {
    this.vendorsFacade
      .listVendors({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        zona: null,
        canal: null,
        search: '',
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationVendors = response.items;
        },
        error: () => {
          this.validationVendors = this.listResponse.items;
        },
      });
  }

  private loadAssignableClients(zone: string | null): void {
    this.loadingAssignableClients = true;

    this.vendorsFacade
      .listAssignableClients(zone)
      .pipe(finalize(() => (this.loadingAssignableClients = false)))
      .subscribe({
        next: (clients) => {
          this.assignableClients = clients;
        },
        error: (error: unknown) => {
          this.assignableClients = [];
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los clientes asignables para la zona seleccionada.',
          );
        },
      });
  }

  private loadVendor(vendorId: string, mode: VendorFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.vendorsFacade
      .getVendor(vendorId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (vendor) => {
          this.selectedVendor = vendor;
          this.formMode = mode;
          this.isFormVisible = true;
          this.loadAssignableClients(vendor.zona);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el vendedor seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true, keepFormVisible = false): void {
    this.selectedVendor = null;
    this.formMode = 'create';
    this.loadingSelection = false;
    this.isFormVisible = keepFormVisible;
    this.assignableClients = [];

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private buildPostSaveFilters(
    vendor: Vendor | null,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'inactivated',
  ): VendorFilters {
    if (!vendor || action !== 'created') {
      return {
        ...this.filters,
        page: 0,
      };
    }

    return {
      ...DEFAULT_VENDOR_FILTERS,
      empresaId: this.activeCompanyId,
      search: vendor.idVendedor,
      page: 0,
    };
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de vendedores. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}