import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AuthSessionService } from '../../../../auth/services/auth-session.service';
import { TpmFacadeService } from '../../../application/facade/tpm.facade';
import { DEFAULT_TPM_FILTERS, TpmFilters } from '../../../domain/models/tpm-filters.model';
import { EMPTY_TPM_DASHBOARD, TpmAssetAggregate, TpmDashboard } from '../../../domain/models/tpm-response.model';
import { TpmPlan } from '../../../domain/models/tpm-plan.model';
import { TpmWorkOrder } from '../../../domain/models/tpm-work-order.model';
import {
  CloseTpmWorkOrderPayload,
  SaveTpmAssetPayload,
  SaveTpmPlanPayload,
} from '../../../domain/repositories/tpm.repository';
import { TpmAlertsComponent } from '../../components/tpm-alerts/tpm-alerts.component';
import { TpmAssetFormComponent } from '../../components/tpm-asset-form/tpm-asset-form.component';
import { TpmAssetsListComponent } from '../../components/tpm-assets-list/tpm-assets-list.component';
import { TpmFiltersComponent } from '../../components/tpm-filters/tpm-filters.component';
import { TpmHistoryComponent } from '../../components/tpm-history/tpm-history.component';
import { TpmPlanFormComponent } from '../../components/tpm-plan-form/tpm-plan-form.component';
import { TpmSummaryCardsComponent } from '../../components/tpm-summary-cards/tpm-summary-cards.component';
import {
  TpmWorkOrderFormComponent,
  TpmWorkOrderFormMode,
  TpmWorkOrderFormSubmit,
} from '../../components/tpm-work-order-form/tpm-work-order-form.component';
import { TpmWorkOrdersComponent } from '../../components/tpm-work-orders/tpm-work-orders.component';

type TpmPanelMode = 'asset' | 'plan' | 'work-order' | null;

@Component({
  selector: 'app-tpm-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    TpmSummaryCardsComponent,
    TpmFiltersComponent,
    TpmAssetsListComponent,
    TpmWorkOrdersComponent,
    TpmAlertsComponent,
    TpmHistoryComponent,
    TpmAssetFormComponent,
    TpmPlanFormComponent,
    TpmWorkOrderFormComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">PRODUCCION - HU-024</p>
            <h1 class="erp-page-title">TPM - Total Productive Maintenance</h1>
            <p class="erp-page-description">
              Frente tecnico de mantenimiento para {{ activeCompanyName }}, con hojas de vida, planes preventivos,
              correctivos, calibraciones, sanitarios, OTs mock y trazabilidad operativa vinculada a OEE.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal industrial para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Activo seleccionado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ selectedAsset?.asset?.codigoEquipo || 'Sin seleccion' }}
              </p>
              <p class="erp-meta-card__hint">
                {{ selectedAsset?.asset?.nombreEquipo || 'Selecciona un activo para revisar detalle tecnico.' }}
              </p>
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

      <app-tpm-summary-cards [kpis]="dashboard.kpis" />

      <div class="erp-action-strip">
        @if (selectedAsset) {
          <button type="button" mat-flat-button color="primary" (click)="openAssetForm()">Editar hoja de vida</button>
          <button type="button" mat-stroked-button (click)="openPlanForm()">Nuevo plan</button>
          <button type="button" mat-stroked-button (click)="openWorkOrderForm()">Nueva OT</button>
        }

        @if (selectedWorkOrder && canEditWorkOrder(selectedWorkOrder)) {
          <button type="button" mat-stroked-button (click)="editWorkOrder(selectedWorkOrder)">Editar OT</button>
          <button type="button" mat-stroked-button (click)="closeWorkOrderPanel(selectedWorkOrder)">Cerrar OT</button>
        }
      </div>

      <app-tpm-filters [filters]="filters" [catalogs]="dashboard.catalogs" (apply)="handleFilters($event)" (reset)="resetFilters()" />

      <section class="grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <app-tpm-assets-list
          [assets]="dashboard.assets"
          [selectedAssetId]="selectedAsset?.asset?.id ?? null"
          (select)="selectAsset($event)"
        />

        <app-tpm-alerts [alerts]="dashboard.alerts" (focusAsset)="focusAsset($event)" />
      </section>

      <section class="erp-panel">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="erp-section-eyebrow">Planes preventivos</p>
            <h3 class="erp-section-title">Programacion por fecha y horas de uso</h3>
            <p class="erp-section-description">
              Consulta la base de planes activos y genera coherencia con OTs automaticas por vencimiento mock.
            </p>
          </div>
        </div>

        @if (selectedAsset?.plans?.length) {
          <div class="mt-5 erp-table-shell overflow-x-auto">
            <table class="erp-data-table min-w-[72rem]">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Frecuencia dias</th>
                  <th>Frecuencia horas</th>
                  <th>Tecnico</th>
                  <th>Activo</th>
                  <th>Ultimo generado</th>
                  <th>Proximo vencimiento</th>
                  <th>Tareas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (plan of selectedAsset!.plans; track plan.id) {
                  <tr>
                    <td>{{ plan.tipo }}</td>
                    <td>{{ plan.frecuenciaDias ?? 'NA' }}</td>
                    <td>{{ plan.frecuenciaHorasUso ?? 'NA' }}</td>
                    <td>{{ plan.tecnicoAsignado }}</td>
                    <td>{{ plan.activo ? 'Si' : 'No' }}</td>
                    <td>{{ plan.ultimoGeneradoEn ? (plan.ultimoGeneradoEn | date: 'yyyy-MM-dd HH:mm') : 'Sin generar' }}</td>
                    <td>{{ plan.proximoVencimiento || 'Por horas de uso' }}</td>
                    <td>{{ plan.tareasProgramadas.length }}</td>
                    <td>
                      <button type="button" mat-stroked-button (click)="editPlan(plan)">Editar plan</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="erp-empty-state mt-5 min-h-[14rem]">
            <div>
              <p class="text-lg font-semibold text-slate-900">El activo seleccionado todavia no tiene planes</p>
              <p class="mt-2 text-slate-600">Crea un plan preventivo, sanitario, predictivo o de calibracion.</p>
            </div>
          </div>
        }
      </section>

      <app-tpm-work-orders
        [workOrders]="dashboard.workOrders"
        [selectedWorkOrderId]="selectedWorkOrder?.id ?? null"
        (select)="selectWorkOrder($event)"
      />

      @if (panelMode === 'asset' && selectedAsset) {
        <app-tpm-asset-form
          [asset]="selectedAsset"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="saveAsset($event)"
          (close)="closePanel()"
        />
      }

      @if (panelMode === 'plan') {
        <app-tpm-plan-form
          [plan]="editingPlan"
          [defaultEquipoId]="selectedAsset?.asset?.equipoId ?? null"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="savePlan($event)"
          (close)="closePanel()"
        />
      }

      @if (panelMode === 'work-order') {
        <app-tpm-work-order-form
          [mode]="workOrderMode"
          [workOrder]="editingWorkOrder"
          [defaultEquipoId]="selectedAsset?.asset?.equipoId ?? null"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="handleWorkOrderSubmit($event)"
          (close)="closePanel()"
        />
      }

      <app-tpm-history [asset]="selectedAsset" [workOrder]="selectedWorkOrder" />
    </div>
  `,
})
export class TpmPageComponent {
  private readonly facade = inject(TpmFacadeService);
  private readonly authSession = inject(AuthSessionService);

  dashboard: TpmDashboard = EMPTY_TPM_DASHBOARD;
  filters: TpmFilters = { ...DEFAULT_TPM_FILTERS };
  selectedAsset: TpmAssetAggregate | null = null;
  selectedWorkOrder: TpmWorkOrder | null = null;
  panelMode: TpmPanelMode = null;
  editingPlan: TpmPlan | null = null;
  editingWorkOrder: TpmWorkOrder | null = null;
  workOrderMode: TpmWorkOrderFormMode = 'create';
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
      this.selectedAsset = null;
      this.selectedWorkOrder = null;
      this.panelMode = null;
      this.reload();
    });
  }

  handleFilters(filters: TpmFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_TPM_FILTERS };
    this.reload();
  }

  selectAsset(asset: TpmAssetAggregate): void {
    this.selectedAsset = asset;
    this.selectedWorkOrder = asset.workOrders[0] ?? null;
  }

  focusAsset(equipmentId: string): void {
    const selected = this.dashboard.assets.find((item) => item.asset.equipoId === equipmentId) ?? null;
    if (selected) {
      this.selectAsset(selected);
    }
  }

  selectWorkOrder(workOrder: TpmWorkOrder): void {
    this.selectedWorkOrder = workOrder;
    const relatedAsset = this.dashboard.assets.find((item) => item.asset.equipoId === workOrder.equipoId) ?? null;
    if (relatedAsset) {
      this.selectedAsset = relatedAsset;
    }
  }

  openAssetForm(): void {
    this.panelMode = 'asset';
    this.clearMessages();
  }

  openPlanForm(): void {
    this.editingPlan = null;
    this.panelMode = 'plan';
    this.clearMessages();
  }

  editPlan(plan: TpmPlan): void {
    this.editingPlan = plan;
    this.panelMode = 'plan';
    this.clearMessages();
  }

  openWorkOrderForm(): void {
    this.editingWorkOrder = null;
    this.workOrderMode = 'create';
    this.panelMode = 'work-order';
    this.clearMessages();
  }

  editWorkOrder(workOrder: TpmWorkOrder): void {
    this.editingWorkOrder = workOrder;
    this.workOrderMode = 'edit';
    this.panelMode = 'work-order';
    this.clearMessages();
  }

  closeWorkOrderPanel(workOrder: TpmWorkOrder): void {
    this.editingWorkOrder = workOrder;
    this.workOrderMode = 'close';
    this.panelMode = 'work-order';
    this.clearMessages();
  }

  saveAsset(payload: SaveTpmAssetPayload): void {
    if (!this.selectedAsset) {
      return;
    }

    this.saving = true;
    this.clearMessages();
    this.facade.saveAsset(payload, this.selectedAsset.asset.id).subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.closePanel();
        this.reload(false, result.asset?.asset.id ?? null, this.selectedWorkOrder?.id ?? null);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar la hoja de vida TPM.';
      },
    });
  }

  savePlan(payload: SaveTpmPlanPayload): void {
    this.saving = true;
    this.clearMessages();
    this.facade.savePlan(payload, this.editingPlan?.id).subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.closePanel();
        this.reload(false, result.asset?.asset.id ?? this.selectedAsset?.asset.id ?? null, this.selectedWorkOrder?.id ?? null);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar el plan TPM.';
      },
    });
  }

  handleWorkOrderSubmit(event: TpmWorkOrderFormSubmit): void {
    this.saving = true;
    this.clearMessages();

    if (event.mode === 'close') {
      const workOrderId = this.editingWorkOrder?.id;
      if (!workOrderId) {
        this.saving = false;
        this.errorMessage = 'No hay OT seleccionada para cierre.';
        return;
      }

      const payload: CloseTpmWorkOrderPayload = {
        ...event.payload,
        usuario: this.getCurrentUsername(),
      };

      this.facade.closeWorkOrder(workOrderId, payload).subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.closePanel();
          this.reload(false, result.asset?.asset.id ?? null, result.workOrder?.id ?? null);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cerrar la OT.';
        },
      });
      return;
    }

    this.facade
      .saveWorkOrder(
        {
          ...event.payload,
          usuario: this.getCurrentUsername(),
        },
        this.workOrderMode === 'edit' ? this.editingWorkOrder?.id : undefined,
      )
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.closePanel();
          this.reload(false, result.asset?.asset.id ?? null, result.workOrder?.id ?? null);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar la OT.';
        },
      });
  }

  canEditWorkOrder(workOrder: TpmWorkOrder): boolean {
    return workOrder.estado !== 'CERRADA' && workOrder.estado !== 'CANCELADA';
  }

  closePanel(): void {
    this.panelMode = null;
    this.editingPlan = null;
    this.editingWorkOrder = null;
    this.workOrderMode = 'create';
  }

  private reload(clearMessages = true, preferredAssetId?: string | null, preferredWorkOrderId?: string | null): void {
    if (clearMessages) {
      this.clearMessages();
    }

    const currentAssetId = preferredAssetId ?? this.selectedAsset?.asset.id ?? null;
    const currentWorkOrderId = preferredWorkOrderId ?? this.selectedWorkOrder?.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedAsset = dashboard.assets.find((item) => item.asset.id === currentAssetId) ?? dashboard.selectedAsset;
        this.selectedWorkOrder =
          dashboard.workOrders.find((item) => item.id === currentWorkOrderId) ??
          (this.selectedAsset
            ? dashboard.workOrders.find((item) => item.equipoId === this.selectedAsset?.asset.equipoId) ?? dashboard.selectedWorkOrder
            : dashboard.selectedWorkOrder);
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_TPM_DASHBOARD;
        this.selectedAsset = null;
        this.selectedWorkOrder = null;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el modulo TPM.';
      },
    });
  }

  private getCurrentUsername(): string {
    return this.authSession.getSessionUser()?.username ?? 'demo.supervisor-tpm';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
