import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { SuppliersFacadeService } from '../../../application/facade/suppliers.facade';
import { DEFAULT_SUPPLIER_FILTERS, SupplierFilters } from '../../../domain/models/supplier-filters.model';
import { SaveSupplierPayload, SupplierFormMode } from '../../../domain/models/supplier-form.model';
import {
  EMPTY_SUPPLIER_CATALOGS,
  Supplier,
  SupplierCatalogs,
  SupplierStatus,
} from '../../../domain/models/supplier.model';
import {
  EMPTY_SUPPLIER_LIST_RESPONSE,
  SupplierListResponse,
} from '../../../domain/models/supplier-response.model';
import { SupplierFormComponent } from '../../components/supplier-form/supplier-form.component';
import { SuppliersListComponent } from '../../components/suppliers-list/suppliers-list.component';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    SupplierFormComponent,
    SuppliersListComponent,
  ],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.scss',
})
export class SuppliersPageComponent {
  private readonly suppliersFacade = inject(SuppliersFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: SupplierCatalogs = EMPTY_SUPPLIER_CATALOGS;
  listResponse: SupplierListResponse = EMPTY_SUPPLIER_LIST_RESPONSE;
  validationSuppliers: Supplier[] = [];
  selectedSupplier: Supplier | null = null;
  formMode: SupplierFormMode = 'create';
  isFormVisible = false;
  filters: SupplierFilters = { ...DEFAULT_SUPPLIER_FILTERS };
  loadingCatalogs = true;
  loadingSuppliers = true;
  loadingSelection = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.suppliersFacade.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) return;

        this.activeCompanyId = company.id;
        this.activeCompanyName = company.name;
        this.filters = {
          ...DEFAULT_SUPPLIER_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationSuppliers();
        this.loadSuppliers(this.filters);
      });
  }

  get totalSuppliers(): number {
    return this.validationSuppliers.length;
  }

  get activeSuppliers(): number {
    return this.validationSuppliers.filter((supplier) => supplier.estado === 'ACTIVO').length;
  }

  get inactiveSuppliers(): number {
    return this.validationSuppliers.filter((supplier) => supplier.estado === 'INACTIVO').length;
  }

  get mirSuppliers(): number {
    return this.validationSuppliers.filter((supplier) => supplier.tipoAbastecimiento === 'MIR').length;
  }

  get logisticsSuppliers(): number {
    return this.validationSuppliers.filter((supplier) => supplier.tipoAbastecimiento === 'LOGISTICA').length;
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) return;
    this.resetSelection(true, true);
  }

  handleFiltersChange(filters: SupplierFilters): void {
    this.loadSuppliers({ ...this.filters, ...filters, empresaId: this.activeCompanyId });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadSuppliers({ ...this.filters, page: event.page, pageSize: event.pageSize, empresaId: this.activeCompanyId });
  }

  handleSelectSupplier(supplier: Supplier): void {
    if (!this.confirmDiscard()) return;
    this.loadSupplier(supplier.id, 'view');
  }

  handleEditSupplier(supplier: Supplier): void {
    if (!this.confirmDiscard()) return;
    this.loadSupplier(supplier.id, 'edit');
  }

  enableEditMode(): void {
    if (this.selectedSupplier) this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedSupplier) {
      this.formMode = 'view';
      this.isFormVisible = true;
      return;
    }

    this.resetSelection();
  }

  closeForm(): void {
    if (!this.confirmDiscard()) return;
    this.resetSelection();
  }

  saveSupplier(payload: SaveSupplierPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.suppliersFacade
      .saveSupplier(payload, this.formMode === 'edit' ? this.selectedSupplier?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedSupplier = result.supplier;
          this.formMode = result.supplier ? 'view' : 'create';
          this.isFormVisible = false;
          this.loadValidationSuppliers();
          this.loadSuppliers(this.buildPostSaveFilters(result.supplier, result.action), false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el proveedor.');
        },
      });
  }

  deleteSupplier(supplier: Supplier): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        supplier.tieneDependenciasActivas
          ? 'El proveedor tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el proveedor ${supplier.nombreProveedor}?`,
      );

      if (!confirmed) return;
    }

    this.deletingId = supplier.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.suppliersFacade
      .deleteSupplier(supplier.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedSupplier?.id === supplier.id) {
            if (result.supplier) {
              this.selectedSupplier = result.supplier;
              this.formMode = 'view';
              this.isFormVisible = false;
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationSuppliers();
          this.loadSuppliers(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del proveedor.');
        },
      });
  }

  toggleSupplierStatus(supplier: Supplier): void {
    const nextStatus: SupplierStatus = supplier.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = supplier.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.suppliersFacade
      .updateSupplierStatus(supplier.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          if (this.selectedSupplier?.id === supplier.id && result.supplier) {
            this.selectedSupplier = result.supplier;
          }
          this.loadValidationSuppliers();
          this.loadSuppliers(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del proveedor.');
        },
      });
  }

  retrySuppliers(): void {
    this.loadSuppliers(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.suppliersFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_SUPPLIER_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los catálogos de proveedores.');
        },
      });
  }

  private loadSuppliers(filters: SupplierFilters, clearMessages = true): void {
    this.loadingSuppliers = true;
    this.filters = { ...DEFAULT_SUPPLIER_FILTERS, ...filters, empresaId: this.activeCompanyId };

    if (clearMessages) this.errorMessage = '';

    this.suppliersFacade
      .listSuppliers(this.filters)
      .pipe(finalize(() => (this.loadingSuppliers = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;
          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadSuppliers({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = { ...EMPTY_SUPPLIER_LIST_RESPONSE, filters: this.filters };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los proveedores.');
        },
      });
  }

  private loadValidationSuppliers(): void {
    this.suppliersFacade
      .listSuppliers({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        search: '',
        ciudadId: null,
        tipoAbastecimiento: null,
        productoPrincipal: null,
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationSuppliers = response.items;
        },
        error: () => {
          this.validationSuppliers = this.listResponse.items;
        },
      });
  }

  private loadSupplier(supplierId: string, mode: SupplierFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.suppliersFacade
      .getSupplier(supplierId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (supplier) => {
          this.selectedSupplier = supplier;
          this.formMode = mode;
          this.isFormVisible = true;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el proveedor seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true, keepFormVisible = false): void {
    this.selectedSupplier = null;
    this.formMode = 'create';
    this.loadingSelection = false;
    this.isFormVisible = keepFormVisible;
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private buildPostSaveFilters(
    supplier: Supplier | null,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'inactivated',
  ): SupplierFilters {
    if (!supplier || action !== 'created') {
      return { ...this.filters, page: 0 };
    }

    return {
      ...DEFAULT_SUPPLIER_FILTERS,
      empresaId: this.activeCompanyId,
      search: supplier.nit,
      page: 0,
    };
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de proveedores. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
