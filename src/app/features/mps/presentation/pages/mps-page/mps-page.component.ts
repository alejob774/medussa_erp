import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MpsFacadeService } from '../../../application/facade/mps.facade';
import { MpsPlanFilters, DEFAULT_MPS_PLAN_FILTERS } from '../../../domain/models/mps-plan-filters.model';
import { MpsPlanAggregate } from '../../../domain/models/mps-response.model';
import { EMPTY_MPS_DASHBOARD, MpsDashboard } from '../../../domain/models/mps-response.model';
import { ApproveMpsPlanPayload } from '../../../domain/repositories/mps.repository';
import { MpsAlertsComponent } from '../../components/mps-alerts/mps-alerts.component';
import { MpsCapacitySummaryComponent } from '../../components/mps-capacity-summary/mps-capacity-summary.component';
import {
  MpsDetailUpdateRequest,
  MpsGridComponent,
} from '../../components/mps-grid/mps-grid.component';
import { MpsFiltersComponent } from '../../components/mps-filters/mps-filters.component';
import {
  MpsHistoryComponent,
  MpsSimulationRequest,
} from '../../components/mps-history/mps-history.component';
import { MpsSummaryCardsComponent } from '../../components/mps-summary-cards/mps-summary-cards.component';

@Component({
  selector: 'app-mps-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MpsFiltersComponent,
    MpsSummaryCardsComponent,
    MpsGridComponent,
    MpsAlertsComponent,
    MpsCapacitySummaryComponent,
    MpsHistoryComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">PRODUCCION · HU-023</p>
            <h1 class="erp-page-title">MPS · Master Production Schedule</h1>
            <p class="erp-page-description">
              Planeador maestro semanal para {{ activeCompanyName }}, con propuesta operativa por SKU, capacidad de
              linea, inventario, FEFO, urgencias comerciales y trazabilidad antes de pasar a futuras ordenes.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal operativo para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Plan activo</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ selectedPlan?.plan?.estado || 'Sin plan' }}
              </p>
              <p class="erp-meta-card__hint">
                {{ selectedPlan?.plan?.planta || 'Genera un plan para iniciar la planeacion semanal.' }}
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

      <app-mps-filters
        [filters]="filters"
        [catalogs]="dashboard.catalogs"
        [companyName]="activeCompanyName"
        (apply)="handleFilters($event)"
        (generate)="generatePlan($event)"
        (reset)="resetFilters()"
      />

      @if (selectedPlan) {
        <app-mps-summary-cards [summary]="selectedPlan.plan.resumenKpis" [plan]="selectedPlan.plan" />

        <div class="flex flex-wrap gap-3">
          @if (canApprove(selectedPlan)) {
            <button type="button" mat-flat-button color="primary" [disabled]="working" (click)="approvePlan()">
              Aprobar plan
            </button>
          }
          <button type="button" mat-stroked-button [disabled]="working" (click)="generatePlan(filters)">
            Regenerar con filtros actuales
          </button>
          <span class="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            {{ dashboard.plans.length }} planes guardados en localStorage para esta empresa.
          </span>
        </div>

        <section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <app-mps-grid
            [details]="selectedPlan.details"
            [planStatus]="selectedPlan.plan.estado"
            [catalogs]="dashboard.catalogs"
            (save)="saveDetail($event)"
          />

          <app-mps-alerts [alerts]="selectedPlan.alerts" />
        </section>

        <section class="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
          <app-mps-capacity-summary [summary]="selectedPlan.capacitySummary" />

          <article class="erp-panel">
            <div>
              <p class="erp-section-eyebrow">Ficha del plan</p>
              <h3 class="erp-section-title">Datos de cabecera</h3>
              <p class="erp-section-description">
                Parametros base del escenario actualmente visible y listo para futura conversion a ordenes.
              </p>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Periodo</p>
                <p class="mt-2 text-base font-semibold text-slate-900">
                  {{ selectedPlan.plan.fechaInicio | date: 'yyyy-MM-dd' }} a
                  {{ selectedPlan.plan.fechaFin | date: 'yyyy-MM-dd' }}
                </p>
                <p class="mt-2 text-sm text-slate-600">{{ selectedPlan.plan.planta }}</p>
              </article>

              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cobertura</p>
                <p class="mt-2 text-base font-semibold text-slate-900">
                  Familia {{ selectedPlan.plan.familia || 'Consolidada' }}
                </p>
                <p class="mt-2 text-sm text-slate-600">
                  FEFO: {{ selectedPlan.plan.considerarFEFO ? 'si' : 'no' }} · Urgencias:
                  {{ selectedPlan.plan.considerarPedidosUrgentes ? 'si' : 'no' }}
                </p>
              </article>

              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Creado por</p>
                <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedPlan.plan.usuarioCrea }}</p>
                <p class="mt-2 text-sm text-slate-600">
                  {{ selectedPlan.plan.fechaCreacion | date: 'yyyy-MM-dd HH:mm' }}
                </p>
              </article>

              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Aprobacion</p>
                <p class="mt-2 text-base font-semibold text-slate-900">
                  {{ selectedPlan.plan.usuarioAprueba || 'Pendiente' }}
                </p>
                <p class="mt-2 text-sm text-slate-600">
                  {{ selectedPlan.plan.fechaAprobacion ? (selectedPlan.plan.fechaAprobacion | date: 'yyyy-MM-dd HH:mm') : 'Sin fecha' }}
                </p>
              </article>
            </div>

            <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Observaciones</p>
              <p class="mt-3 text-sm leading-6 text-slate-600">
                {{ selectedPlan.plan.observaciones || 'Sin observaciones registradas para este escenario.' }}
              </p>
            </div>
          </article>
        </section>

        <app-mps-history
          [logs]="selectedPlan.simulationLogs"
          [plan]="selectedPlan.plan"
          [canSimulate]="canSimulate(selectedPlan)"
          (simulate)="simulatePlan($event)"
        />
      } @else {
        <section class="erp-empty-state min-h-[26rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Aun no hay un plan MPS visible</p>
            <p class="mt-2 text-slate-600">
              Usa el panel superior para generar el primer plan maestro semanal de Produccion.
            </p>
          </div>
        </section>
      }
    </div>
  `,
})
export class MpsPageComponent {
  private readonly facade = inject(MpsFacadeService);

  dashboard: MpsDashboard = EMPTY_MPS_DASHBOARD;
  filters: MpsPlanFilters = { ...DEFAULT_MPS_PLAN_FILTERS };
  activeCompanyName = this.facade.getActiveCompanyName();
  selectedPlanId: string | null = null;
  working = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.selectedPlanId = null;
      this.reload();
    });
  }

  get selectedPlan(): MpsPlanAggregate | null {
    if (!this.selectedPlanId) {
      return this.dashboard.selectedPlan;
    }

    if (this.dashboard.selectedPlan?.plan.id === this.selectedPlanId) {
      return this.dashboard.selectedPlan;
    }

    return this.dashboard.plans.find((item) => item.plan.id === this.selectedPlanId) ?? this.dashboard.selectedPlan;
  }

  handleFilters(filters: MpsPlanFilters): void {
    this.filters = { ...filters };
    this.selectedPlanId = null;
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_MPS_PLAN_FILTERS };
    this.selectedPlanId = null;
    this.reload();
  }

  generatePlan(filters: MpsPlanFilters): void {
    this.filters = { ...filters };
    this.working = true;
    this.clearMessages();

    this.facade
      .generatePlan({
        ...filters,
        usuario: 'demo.planificador-produccion',
        observaciones: 'Plan generado desde la planeacion semanal operativa.',
      })
      .subscribe({
        next: (result) => {
          this.working = false;
          this.successMessage = result.message;
          this.selectedPlanId = result.plan.plan.id;
          this.reload(result.plan.plan.id);
        },
        error: (error: unknown) => {
          this.working = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible generar el plan MPS.';
        },
      });
  }

  saveDetail(event: MpsDetailUpdateRequest): void {
    if (!this.selectedPlan) {
      return;
    }

    this.working = true;
    this.clearMessages();

    this.facade
      .updateDetail(this.selectedPlan.plan.id, event.detailId, {
        cantidadPlanificada: event.cantidadPlanificada,
        fechaProduccion: event.fechaProduccion,
        lineaProduccion: event.lineaProduccion,
        usuario: 'demo.planificador-produccion',
        observacion: event.observacion,
      })
      .subscribe({
        next: (result) => {
          this.working = false;
          this.successMessage = result.message;
          this.selectedPlanId = result.plan.plan.id;
          this.reload(result.plan.plan.id);
        },
        error: (error: unknown) => {
          this.working = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible ajustar el detalle.';
        },
      });
  }

  simulatePlan(event: MpsSimulationRequest): void {
    if (!this.selectedPlan) {
      return;
    }

    this.working = true;
    this.clearMessages();

    this.facade
      .simulatePlan(this.selectedPlan.plan.id, {
        ...event,
        usuario: 'demo.planificador-produccion',
      })
      .subscribe({
        next: (result) => {
          this.working = false;
          this.successMessage = result.message;
          this.selectedPlanId = result.plan.plan.id;
          this.reload(result.plan.plan.id);
        },
        error: (error: unknown) => {
          this.working = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible simular el escenario.';
        },
      });
  }

  approvePlan(): void {
    if (!this.selectedPlan) {
      return;
    }

    this.working = true;
    this.clearMessages();

    const payload: ApproveMpsPlanPayload = {
      usuario: 'demo.jefe-produccion',
      observacion: 'Plan aprobado como version oficial del periodo.',
    };

    this.facade.approvePlan(this.selectedPlan.plan.id, payload).subscribe({
      next: (result) => {
        this.working = false;
        this.successMessage = result.message;
        this.selectedPlanId = result.plan.plan.id;
        this.reload(result.plan.plan.id);
      },
      error: (error: unknown) => {
        this.working = false;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible aprobar el plan.';
      },
    });
  }

  canApprove(plan: MpsPlanAggregate): boolean {
    return plan.plan.estado !== 'APROBADO' && plan.plan.estado !== 'OBSOLETO';
  }

  canSimulate(plan: MpsPlanAggregate): boolean {
    return plan.plan.estado !== 'APROBADO' && plan.plan.estado !== 'OBSOLETO';
  }

  private reload(preferredPlanId: string | null = this.selectedPlanId): void {
    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        const matchedPlan =
          (preferredPlanId && dashboard.plans.find((item) => item.plan.id === preferredPlanId)) ||
          dashboard.selectedPlan ||
          dashboard.plans[0] ||
          null;
        this.selectedPlanId = matchedPlan?.plan.id ?? null;
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar la planeacion maestra.';
      },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
