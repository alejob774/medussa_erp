import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { StorageLayoutFacadeService } from '../../../application/facade/storage-layout.facade';
import {
  DEFAULT_STORAGE_LAYOUT_FILTERS,
  StorageLayoutFilters,
} from '../../../domain/models/storage-layout-filters.model';
import {
  EMPTY_STORAGE_LAYOUT_DASHBOARD,
  StorageLayoutDashboard,
} from '../../../domain/models/storage-layout-response.model';
import { StorageLocation } from '../../../domain/models/storage-location.model';
import { Warehouse } from '../../../domain/models/warehouse.model';
import { StorageLocationAssignment } from '../../../domain/models/storage-location-assignment.model';
import { StorageLayoutFiltersComponent } from '../../components/storage-layout-filters/storage-layout-filters.component';
import { StorageLayoutKpisComponent } from '../../components/storage-layout-kpis/storage-layout-kpis.component';
import { StorageLayoutMapComponent } from '../../components/storage-layout-map/storage-layout-map.component';
import { StorageLayoutAlertsComponent } from '../../components/storage-layout-alerts/storage-layout-alerts.component';
import { StorageLayoutTableComponent } from '../../components/storage-layout-table/storage-layout-table.component';
import { StorageLayoutAbcComponent } from '../../components/storage-layout-abc/storage-layout-abc.component';
import {
  StorageLayoutFormComponent,
  StorageLayoutFormMode,
  StorageLayoutFormValue,
} from '../../components/storage-layout-form/storage-layout-form.component';

@Component({
  selector: 'app-storage-layout-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    StorageLayoutFiltersComponent,
    StorageLayoutKpisComponent,
    StorageLayoutMapComponent,
    StorageLayoutAlertsComponent,
    StorageLayoutTableComponent,
    StorageLayoutAbcComponent,
    StorageLayoutFormComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-031</p>
            <h1 class="erp-page-title">Layout y Almacenamiento Estrategico</h1>
            <p class="erp-page-description">
              Modela la estructura fisica de {{ activeCompanyName }}, cruza capacidad, restricciones sanitarias,
              ocupacion y asignacion ABC para ordenar la bodega con criterio logistico real.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal de layout para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Cobertura</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ dashboard.warehouses.length }} bodegas · {{ dashboard.locations.length }} ubicaciones
              </p>
              <p class="erp-meta-card__hint">Base estructural que soporta conteos ciclicos y exactitud.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      @if (successMessage) {
        <div class="erp-alert erp-alert--success">{{ successMessage }}</div>
      }

      <div class="flex flex-wrap gap-3">
        <button type="button" mat-flat-button color="primary" (click)="openWarehouseForm()">
          Nueva bodega
        </button>
        <button type="button" mat-stroked-button (click)="openLocationForm(selectedLocation)">
          {{ selectedLocation ? 'Editar ubicacion' : 'Nueva ubicacion' }}
        </button>
        <button type="button" mat-stroked-button (click)="openAssignmentForm(selectedLocation)">
          Asignar SKU
        </button>
        <button type="button" mat-stroked-button (click)="recalculate()">
          Recalcular ocupacion
        </button>
      </div>

      <app-storage-layout-filters
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <app-storage-layout-kpis [kpis]="dashboard.kpis" />

      <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
        <app-storage-layout-map [map]="dashboard.map" />
        <app-storage-layout-alerts [alerts]="dashboard.alerts" />
      </section>

      <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
        <app-storage-layout-table
          [warehouses]="dashboard.warehouses"
          [locations]="dashboard.locations"
          [assignments]="dashboard.assignments"
          [occupancies]="dashboard.occupancies"
          [lots]="dashboard.lots"
          [selectedLocationId]="selectedLocation?.id ?? null"
          (selectLocation)="selectLocation($event)"
          (editLocation)="openLocationForm($event)"
          (assignSku)="openAssignmentForm($event)"
        />

        <app-storage-layout-abc [abc]="dashboard.abc" [suggestions]="dashboard.suggestions" />
      </section>

      @if (showForm) {
        <app-storage-layout-form
          [mode]="formMode"
          [catalogs]="dashboard.catalogs"
          [warehouses]="dashboard.warehouses"
          [locations]="dashboard.locations"
          [warehouse]="formWarehouse"
          [location]="formLocation"
          [assignment]="formAssignment"
          [saving]="saving"
          (submit)="submitForm($event)"
          (close)="closeForm()"
        />
      }
    </div>
  `,
})
export class StorageLayoutPageComponent {
  private readonly facade = inject(StorageLayoutFacadeService);

  dashboard: StorageLayoutDashboard = EMPTY_STORAGE_LAYOUT_DASHBOARD;
  filters: StorageLayoutFilters = { ...DEFAULT_STORAGE_LAYOUT_FILTERS };
  selectedLocation: StorageLocation | null = null;
  formMode: StorageLayoutFormMode = 'location';
  formWarehouse: Warehouse | null = null;
  formLocation: StorageLocation | null = null;
  formAssignment: StorageLocationAssignment | null = null;
  showForm = false;
  saving = false;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.showForm = false;
      this.selectedLocation = null;
      this.reload();
    });
  }

  handleFilters(filters: StorageLayoutFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_STORAGE_LAYOUT_FILTERS };
    this.reload();
  }

  selectLocation(location: StorageLocation): void {
    this.selectedLocation = location;
  }

  openWarehouseForm(warehouse?: Warehouse | null): void {
    this.formMode = 'warehouse';
    this.formWarehouse = warehouse ?? null;
    this.formLocation = null;
    this.formAssignment = null;
    this.showForm = true;
  }

  openLocationForm(location?: StorageLocation | null): void {
    this.formMode = 'location';
    this.formWarehouse = null;
    this.formLocation = location ?? null;
    this.formAssignment = null;
    if (location) {
      this.selectedLocation = location;
    }
    this.showForm = true;
  }

  openAssignmentForm(location?: StorageLocation | null): void {
    this.formMode = 'assignment';
    this.formWarehouse = null;
    this.formLocation = location ?? this.selectedLocation ?? null;
    this.formAssignment = this.formLocation
      ? this.dashboard.assignments.find((item) => item.ubicacionId === this.formLocation?.id) ?? null
      : null;
    if (location) {
      this.selectedLocation = location;
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.formWarehouse = null;
    this.formLocation = null;
    this.formAssignment = null;
  }

  recalculate(): void {
    this.saving = true;
    this.facade.recalculateOccupancy('demo.scm-layout').subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.reload(false, this.selectedLocation?.id ?? null);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible recalcular el layout.';
      },
    });
  }

  submitForm(value: StorageLayoutFormValue): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request =
      this.formMode === 'warehouse'
        ? this.facade.saveWarehouse(
            {
              codigo: value.codigo,
              nombre: value.nombre,
              tipo: value.tipo as Warehouse['tipo'],
              estado: value.estado as Warehouse['estado'],
              usuario: 'demo.scm-layout',
            },
            this.formWarehouse?.id,
          )
        : this.formMode === 'location'
          ? this.facade.saveLocation(
              {
                bodegaId: value.bodegaId,
                zona: value.zona,
                pasillo: value.pasillo,
                rack: value.rack,
                nivel: value.nivel,
                posicion: value.posicion,
                capacidad: Number(value.capacidad),
                tipoAlmacenamiento: value.tipoAlmacenamiento as StorageLocation['tipoAlmacenamiento'],
                restriccionSanitaria: value.restriccionSanitaria as StorageLocation['restriccionSanitaria'],
                estado: value.estado as StorageLocation['estado'],
                usuario: 'demo.scm-layout',
              },
              this.formLocation?.id,
            )
          : this.saveAssignment(value);

    request.subscribe({
      next: (result) => {
        const preferredLocationId = result.location?.id ?? this.formLocation?.id ?? this.selectedLocation?.id ?? null;
        this.saving = false;
        this.successMessage = result.message;
        this.showForm = false;
        this.formWarehouse = null;
        this.formLocation = null;
        this.formAssignment = null;
        this.reload(false, preferredLocationId);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible guardar el layout.';
      },
    });
  }

  private saveAssignment(value: StorageLayoutFormValue) {
    const selectedSku = this.dashboard.catalogs.skus.find((item) => item.sku === value.sku);

    return this.facade.saveAssignment(
      {
        ubicacionId: value.ubicacionId,
        skuId: selectedSku?.skuId ?? value.sku,
        sku: selectedSku?.sku ?? value.sku,
        productoNombre: selectedSku?.productName ?? value.sku,
        prioridad: value.prioridad as StorageLocationAssignment['prioridad'],
        categoriaABC: value.categoriaABC as StorageLocationAssignment['categoriaABC'],
        rotacion: value.rotacion as StorageLocationAssignment['rotacion'],
        usuario: 'demo.scm-layout',
      },
      this.formAssignment?.id,
    );
  }

  private reload(clearMessages = true, preferredLocationId?: string | null): void {
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }

    const currentLocationId = preferredLocationId ?? this.selectedLocation?.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedLocation =
          dashboard.locations.find((item) => item.id === currentLocationId) ??
          dashboard.selectedLocation;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_STORAGE_LAYOUT_DASHBOARD;
        this.selectedLocation = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar Layout y Almacenamiento.';
      },
    });
  }
}
