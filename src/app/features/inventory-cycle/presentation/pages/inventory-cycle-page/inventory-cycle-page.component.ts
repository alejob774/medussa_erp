import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { InventoryCycleFacadeService } from '../../../application/facade/inventory-cycle.facade';
import {
  DEFAULT_INVENTORY_CYCLE_FILTERS,
  InventoryCycleFilters,
} from '../../../domain/models/inventory-cycle-filters.model';
import {
  EMPTY_INVENTORY_CYCLE_DASHBOARD,
  InventoryCycleDashboard,
} from '../../../domain/models/inventory-cycle-response.model';
import { InventoryCycleCount } from '../../../domain/models/inventory-cycle-count.model';
import { InventoryCycleFiltersComponent } from '../../components/inventory-cycle-filters/inventory-cycle-filters.component';
import { InventoryCycleKpisComponent } from '../../components/inventory-cycle-kpis/inventory-cycle-kpis.component';
import { InventoryCycleTableComponent } from '../../components/inventory-cycle-table/inventory-cycle-table.component';
import { InventoryCycleDifferencesComponent } from '../../components/inventory-cycle-differences/inventory-cycle-differences.component';
import { InventoryCycleAdjustmentsComponent } from '../../components/inventory-cycle-adjustments/inventory-cycle-adjustments.component';
import { InventoryCycleHistoryComponent } from '../../components/inventory-cycle-history/inventory-cycle-history.component';
import {
  InventoryCycleFormComponent,
  InventoryCycleFormValue,
} from '../../components/inventory-cycle-form/inventory-cycle-form.component';

@Component({
  selector: 'app-inventory-cycle-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    InventoryCycleFiltersComponent,
    InventoryCycleKpisComponent,
    InventoryCycleTableComponent,
    InventoryCycleDifferencesComponent,
    InventoryCycleAdjustmentsComponent,
    InventoryCycleHistoryComponent,
    InventoryCycleFormComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-030</p>
            <h1 class="erp-page-title">Ciclo de Inventarios</h1>
            <p class="erp-page-description">
              Ejecuta conteos ciclicos sobre la estructura del layout de {{ activeCompanyName }}, compara sistema vs
              fisico, detecta recurrencias y aprueba ajustes con trazabilidad.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Conteo ciclico conectado al layout de El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Periodo</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ filters.fechaDesde }} → {{ filters.fechaHasta }}
              </p>
              <p class="erp-meta-card__hint">Seguimiento de exactitud y ajustes del corte activo.</p>
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
        <button type="button" mat-flat-button color="primary" (click)="openForm()">
          Registrar conteo
        </button>

        @if (selectedCount?.estado === 'PENDIENTE_APROBACION' || selectedCount?.estado === 'CON_DIFERENCIA') {
          <button type="button" mat-stroked-button (click)="approveAdjustment(selectedCount!)">
            Aprobar ajuste seleccionado
          </button>
        }

        @if (selectedCount && canClose(selectedCount)) {
          <button type="button" mat-stroked-button (click)="closeCount(selectedCount)">
            Cerrar conteo
          </button>
        }
      </div>

      <app-inventory-cycle-filters
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <app-inventory-cycle-kpis [kpis]="dashboard.kpis" />

      <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
        <app-inventory-cycle-table
          [counts]="dashboard.counts"
          [catalogs]="dashboard.catalogs"
          [selectedCountId]="selectedCount?.id ?? null"
          (selectCount)="selectCount($event)"
          (closeCount)="closeCount($event)"
        />

        <app-inventory-cycle-differences
          [differingCounts]="dashboard.counts.filter(isDifferent)"
          [alerts]="dashboard.alerts"
          [recurrentLocations]="dashboard.recurrentLocations"
          [recurrentSkus]="dashboard.recurrentSkus"
        />
      </section>

      @if (showForm) {
        <app-inventory-cycle-form
          [catalogs]="dashboard.catalogs"
          [preferredWarehouseId]="selectedCount?.bodegaId ?? dashboard.catalogs.warehouses[0]?.value ?? null"
          [preferredLocationId]="selectedCount?.ubicacionId ?? dashboard.catalogs.locations[0]?.value ?? null"
          [saving]="saving"
          (submit)="submitForm($event)"
          (close)="closeForm()"
        />
      }

      <app-inventory-cycle-adjustments
        [pendingAdjustments]="dashboard.pendingAdjustments"
        [accuracies]="dashboard.accuracies"
        [counts]="dashboard.counts"
        [catalogs]="dashboard.catalogs"
        (approve)="approveAdjustmentById($event)"
      />

      <app-inventory-cycle-history
        [count]="selectedCount"
        [histories]="dashboard.histories"
        [recurrentLocations]="dashboard.recurrentLocations"
        [recurrentSkus]="dashboard.recurrentSkus"
      />
    </div>
  `,
})
export class InventoryCyclePageComponent {
  private readonly facade = inject(InventoryCycleFacadeService);

  dashboard: InventoryCycleDashboard = EMPTY_INVENTORY_CYCLE_DASHBOARD;
  filters: InventoryCycleFilters = { ...DEFAULT_INVENTORY_CYCLE_FILTERS };
  selectedCount: InventoryCycleCount | null = null;
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
      this.selectedCount = null;
      this.reload();
    });
  }

  readonly isDifferent = (count: InventoryCycleCount) => count.diferencia !== 0;

  handleFilters(filters: InventoryCycleFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_INVENTORY_CYCLE_FILTERS };
    this.reload();
  }

  openForm(): void {
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  selectCount(count: InventoryCycleCount): void {
    this.selectedCount = count;
  }

  canClose(count: InventoryCycleCount): boolean {
    return count.estado === 'REGISTRADO' || count.estado === 'AJUSTADO';
  }

  submitForm(value: InventoryCycleFormValue): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const selectedSku = this.dashboard.catalogs.skus.find((item) => item.sku === value.sku);
    const selectedLot = this.dashboard.catalogs.lots.find((item) => item.lotId === value.loteId);

    this.facade
      .saveCount({
        bodegaId: value.bodegaId,
        ubicacionId: value.ubicacionId,
        skuId: selectedSku?.skuId ?? value.sku,
        sku: selectedSku?.sku ?? value.sku,
        productoNombre: selectedSku?.productName ?? value.sku,
        loteId: value.loteId,
        lote: selectedLot?.label.split(' · ')[0] ?? value.loteId,
        conteoFisico: Number(value.conteoFisico),
        usuarioConteo: value.usuarioConteo,
        observacion: value.observacion.trim() || null,
      })
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.showForm = false;
          this.reload(false, result.count.id);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage =
            error instanceof Error ? error.message : 'No fue posible registrar el conteo.';
        },
      });
  }

  approveAdjustment(count: InventoryCycleCount): void {
    this.approveAdjustmentById(count.id);
  }

  approveAdjustmentById(countId: string): void {
    this.saving = true;
    this.facade
      .approveAdjustment(countId, {
        motivo: 'Aprobacion supervisor de inventarios',
        aprobadoPor: 'demo.supervisor-bodega',
        observacion: 'Ajuste validado contra conteo fisico y layout.',
      })
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.reload(false, result.count.id);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage =
            error instanceof Error ? error.message : 'No fue posible aprobar el ajuste.';
        },
      });
  }

  closeCount(count: InventoryCycleCount): void {
    this.saving = true;
    this.facade.closeCount(count.id, 'demo.supervisor-bodega', 'Cierre operativo del conteo.').subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.reload(false, result.count.id);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cerrar el conteo.';
      },
    });
  }

  private reload(clearMessages = true, preferredCountId?: string | null): void {
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }

    const currentCountId = preferredCountId ?? this.selectedCount?.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedCount =
          dashboard.counts.find((item) => item.id === currentCountId) ?? dashboard.selectedCount;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_INVENTORY_CYCLE_DASHBOARD;
        this.selectedCount = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar Ciclo de Inventarios.';
      },
    });
  }
}
