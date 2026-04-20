import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { BudgetManagementFacadeService } from '../../../application/facade/budget-management.facade';
import {
  DEFAULT_BUDGET_MANAGEMENT_FILTERS,
  BudgetManagementFilters,
} from '../../../domain/models/budget-management-filters.model';
import {
  EMPTY_BUDGET_MANAGEMENT_DASHBOARD,
  BudgetManagementDashboard,
} from '../../../domain/models/budget-management-response.model';
import { BudgetManagementAggregate } from '../../../domain/models/budget-management.model';
import {
  BudgetManagementFormComponent,
  BudgetManagementFormMode,
  BudgetManagementFormValue,
} from '../../components/budget-management-form/budget-management-form.component';
import { BudgetManagementFiltersComponent } from '../../components/budget-management-filters/budget-management-filters.component';
import { BudgetManagementKpisComponent } from '../../components/budget-management-kpis/budget-management-kpis.component';
import { BudgetManagementAlertsComponent } from '../../components/budget-management-alerts/budget-management-alerts.component';
import { BudgetManagementComparisonChartComponent } from '../../components/budget-management-comparison-chart/budget-management-comparison-chart.component';
import { BudgetManagementTableComponent } from '../../components/budget-management-table/budget-management-table.component';
import { BudgetManagementHistoryComponent } from '../../components/budget-management-history/budget-management-history.component';

@Component({
  selector: 'app-budget-management-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    BudgetManagementFiltersComponent,
    BudgetManagementKpisComponent,
    BudgetManagementAlertsComponent,
    BudgetManagementComparisonChartComponent,
    BudgetManagementTableComponent,
    BudgetManagementFormComponent,
    BudgetManagementHistoryComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-029</p>
            <h1 class="erp-page-title">Gestión de Presupuesto</h1>
            <p class="erp-page-description">
              Control presupuestal de compras para {{ activeCompanyName }}, con presupuesto aprobado, consumo local,
              desviación, proyección de cierre, alertas de sobregasto y trazabilidad simple por ajuste.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal de control presupuestal sobre El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Periodo</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ monthLabel(filters.mes) }} {{ filters.anio }}
              </p>
              <p class="erp-meta-card__hint">Comparativo activo entre plan, real y cierre proyectado.</p>
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
        <button type="button" mat-flat-button color="primary" (click)="startCreateMode()">
          Nuevo presupuesto
        </button>

        @if (selectedBudget) {
          <button type="button" mat-stroked-button (click)="startEditMode(selectedBudget)">
            Editar seleccionado
          </button>
          <button type="button" mat-stroked-button (click)="startAdjustMode(selectedBudget)">
            Ajustar presupuesto
          </button>
        }
      </div>

      <app-budget-management-filters
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <app-budget-management-kpis [kpis]="dashboard.kpis" />

      <app-budget-management-comparison-chart [charts]="dashboard.charts" />

      <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.95fr]">
        <app-budget-management-table
          [budgets]="dashboard.budgets"
          [selectedBudgetId]="selectedBudget?.budget?.id ?? null"
          (selectBudget)="selectBudget($event)"
          (editBudget)="startEditMode($event)"
          (adjustBudget)="startAdjustMode($event)"
        />

        <app-budget-management-alerts [alerts]="dashboard.alerts" />
      </section>

      @if (showForm) {
        <app-budget-management-form
          [mode]="formMode"
          [budget]="formBudget"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="submitForm($event)"
          (close)="closeForm()"
        />
      }

      <app-budget-management-history [budget]="selectedBudget" />
    </div>
  `,
})
export class BudgetManagementPageComponent {
  private readonly facade = inject(BudgetManagementFacadeService);

  dashboard: BudgetManagementDashboard = EMPTY_BUDGET_MANAGEMENT_DASHBOARD;
  filters: BudgetManagementFilters = { ...DEFAULT_BUDGET_MANAGEMENT_FILTERS };
  selectedBudget: BudgetManagementAggregate | null = null;
  formBudget: BudgetManagementAggregate | null = null;
  formMode: BudgetManagementFormMode = 'create';
  showForm = false;
  activeCompanyName = this.facade.getActiveCompanyName();
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.showForm = false;
      this.selectedBudget = null;
      this.formBudget = null;
      this.reload();
    });
  }

  handleFilters(filters: BudgetManagementFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_BUDGET_MANAGEMENT_FILTERS };
    this.reload();
  }

  selectBudget(aggregate: BudgetManagementAggregate): void {
    this.selectedBudget = aggregate;
  }

  startCreateMode(): void {
    this.formMode = 'create';
    this.formBudget = null;
    this.showForm = true;
  }

  startEditMode(aggregate: BudgetManagementAggregate): void {
    this.selectedBudget = aggregate;
    this.formMode = 'edit';
    this.formBudget = aggregate;
    this.showForm = true;
  }

  startAdjustMode(aggregate: BudgetManagementAggregate): void {
    this.selectedBudget = aggregate;
    this.formMode = 'adjust';
    this.formBudget = aggregate;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.formBudget = null;
  }

  submitForm(value: BudgetManagementFormValue): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request =
      this.formMode === 'adjust' && this.formBudget
        ? this.facade.adjustBudget(this.formBudget.budget.id, {
            valorAprobado: Number(value.valorAprobado),
            valorAjustado: Number(value.valorAjustado),
            referencia: value.referencia,
            observaciones: value.observaciones?.trim() || null,
            usuario: 'demo.scm-budget',
          })
        : this.facade.saveBudget(
            {
              anio: Number(value.anio),
              mes: Number(value.mes),
              centroCosto: value.centroCosto,
              categoria: value.categoria as BudgetManagementAggregate['budget']['categoria'],
              tipoAbastecimiento: value.tipoAbastecimiento,
              moneda: value.moneda,
              valorAprobado: Number(value.valorAprobado),
              valorAjustado: Number(value.valorAjustado),
              referencia: value.referencia?.trim() || null,
              observaciones: value.observaciones?.trim() || null,
              usuario: 'demo.scm-budget',
            },
            this.formMode === 'edit' ? this.formBudget?.budget.id : undefined,
          );

    request.subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.showForm = false;
        this.formBudget = null;
        this.reload(false, result.budget.budget.id);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible guardar el presupuesto.';
      },
    });
  }

  private reload(clearMessages = true, preferredBudgetId?: string): void {
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }

    const currentSelectionId = preferredBudgetId ?? this.selectedBudget?.budget.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedBudget =
          dashboard.budgets.find((aggregate) => aggregate.budget.id === currentSelectionId) ??
          dashboard.selectedBudget;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_BUDGET_MANAGEMENT_DASHBOARD;
        this.selectedBudget = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar Gestión de Presupuesto.';
      },
    });
  }

  monthLabel(month: number): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(
      new Date(2026, Math.max(month - 1, 0), 1),
    );
  }
}
