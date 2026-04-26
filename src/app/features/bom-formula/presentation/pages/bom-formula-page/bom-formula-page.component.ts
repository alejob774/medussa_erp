import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { BomFormulaFacadeService } from '../../../application/facade/bom-formula.facade';
import {
  DEFAULT_BOM_FORMULA_FILTERS,
  BomFormulaFilters,
} from '../../../domain/models/bom-formula-filters.model';
import { BomFormulaAggregate } from '../../../domain/models/bom-formula.model';
import {
  EMPTY_BOM_FORMULA_DASHBOARD,
  BomFormulaDashboard,
} from '../../../domain/models/bom-formula-response.model';
import {
  BomFormulaDecisionPayload,
  SaveBomFormulaPayload,
} from '../../../domain/repositories/bom-formula.repository';
import { BomFormulaCostSummaryComponent } from '../../components/bom-formula-cost-summary/bom-formula-cost-summary.component';
import { BomFormulaFiltersComponent } from '../../components/bom-formula-filters/bom-formula-filters.component';
import {
  BomFormulaFormComponent,
  BomFormulaFormMode,
} from '../../components/bom-formula-form/bom-formula-form.component';
import { BomFormulaHistoryComponent } from '../../components/bom-formula-history/bom-formula-history.component';
import { BomFormulaListComponent } from '../../components/bom-formula-list/bom-formula-list.component';

@Component({
  selector: 'app-bom-formula-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    BomFormulaFiltersComponent,
    BomFormulaListComponent,
    BomFormulaFormComponent,
    BomFormulaCostSummaryComponent,
    BomFormulaHistoryComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">PRODUCCION · HU-021</p>
            <h1 class="erp-page-title">BOM / Formulas / Recetas</h1>
            <p class="erp-page-description">
              Nucleo tecnico de formulacion para {{ activeCompanyName }}, con versionado controlado, costeo estandar,
              aprobacion formal y trazabilidad de cambios para planta.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal de formulas oficiales para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Formula seleccionada</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ selectedFormula?.formula?.codigoFormula || 'Sin seleccion' }}
              </p>
              <p class="erp-meta-card__hint">
                {{ selectedFormula?.formula?.productoNombre || 'Selecciona una formula para revisar detalle.' }}
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

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Formulas totales</p>
          <p class="erp-metric-card__value">{{ dashboard.kpis.totalFormulas }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Vigentes</p>
          <p class="erp-metric-card__value text-emerald-700">{{ dashboard.kpis.vigenteCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Pendientes</p>
          <p class="erp-metric-card__value text-sky-700">{{ dashboard.kpis.pendingCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Obsoletas</p>
          <p class="erp-metric-card__value text-slate-700">{{ dashboard.kpis.obsoleteCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Costo promedio</p>
          <p class="erp-metric-card__value text-lg">{{ formatCurrency(dashboard.kpis.averageStandardCost) }}</p>
        </article>
      </section>

      <div class="erp-action-strip">
        <button type="button" mat-flat-button color="primary" (click)="createFormula()">
          Nueva formula
        </button>

        @if (selectedFormula && canEdit(selectedFormula)) {
          <button type="button" mat-stroked-button (click)="editFormula(selectedFormula)">
            Editar formula
          </button>
        }

        @if (selectedFormula && canApprove(selectedFormula)) {
          <button type="button" mat-stroked-button (click)="approveFormula(selectedFormula)">
            Aprobar formula
          </button>
          <button type="button" mat-stroked-button (click)="rejectFormula(selectedFormula)">
            Rechazar formula
          </button>
        }

        @if (selectedFormula) {
          <button type="button" mat-stroked-button (click)="createNewVersion(selectedFormula)">
            Nueva version
          </button>
        }
      </div>

      <app-bom-formula-filters
        [filters]="filters"
        [catalogs]="dashboard.catalogs"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <section class="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <app-bom-formula-list
          [formulas]="dashboard.formulas"
          [selectedFormulaId]="selectedFormula?.formula?.id ?? null"
          (select)="selectFormula($event)"
        />

        <app-bom-formula-cost-summary
          eyebrow="Costo formula seleccionada"
          [ingredients]="selectedFormula?.ingredients ?? []"
          [mermaEsperada]="selectedFormula?.formula?.mermaEsperada ?? 0"
          [rendimientoEsperado]="selectedFormula?.formula?.rendimientoEsperado ?? 0"
          [unidadRendimiento]="selectedFormula?.formula?.unidadRendimiento ?? 'UND'"
        />
      </section>

      @if (showForm) {
        <app-bom-formula-form
          [mode]="formMode"
          [formula]="formFormula"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="saveFormula($event)"
          (close)="closeForm()"
        />
      }

      <app-bom-formula-history
        [selectedFormula]="selectedFormula"
        [relatedFormulas]="relatedFormulas"
        [relatedHistories]="relatedHistories"
      />
    </div>
  `,
})
export class BomFormulaPageComponent {
  private readonly facade = inject(BomFormulaFacadeService);

  dashboard: BomFormulaDashboard = EMPTY_BOM_FORMULA_DASHBOARD;
  filters: BomFormulaFilters = { ...DEFAULT_BOM_FORMULA_FILTERS };
  selectedFormula: BomFormulaAggregate | null = null;
  formFormula: BomFormulaAggregate | null = null;
  formMode: BomFormulaFormMode = 'create';
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
      this.selectedFormula = null;
      this.showForm = false;
      this.reload();
    });
  }

  get relatedFormulas(): BomFormulaAggregate[] {
    if (!this.selectedFormula) {
      return [];
    }

    return this.dashboard.formulas.filter(
      (item) => item.formula.productoId === this.selectedFormula?.formula.productoId,
    );
  }

  get relatedHistories() {
    const relatedIds = new Set(this.relatedFormulas.map((item) => item.formula.id));
    return this.dashboard.histories.filter((item) => relatedIds.has(item.formulaId));
  }

  handleFilters(filters: BomFormulaFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_BOM_FORMULA_FILTERS };
    this.reload();
  }

  selectFormula(aggregate: BomFormulaAggregate): void {
    this.selectedFormula = aggregate;
  }

  createFormula(): void {
    this.formMode = 'create';
    this.formFormula = null;
    this.showForm = true;
    this.clearMessages();
  }

  editFormula(aggregate: BomFormulaAggregate): void {
    this.formMode = 'edit';
    this.formFormula = aggregate;
    this.showForm = true;
    this.clearMessages();
  }

  closeForm(): void {
    this.showForm = false;
    this.formFormula = null;
  }

  canEdit(aggregate: BomFormulaAggregate): boolean {
    return aggregate.formula.estado === 'BORRADOR' || aggregate.formula.estado === 'PENDIENTE' || aggregate.formula.estado === 'RECHAZADA';
  }

  canApprove(aggregate: BomFormulaAggregate): boolean {
    return aggregate.formula.estado === 'BORRADOR' || aggregate.formula.estado === 'PENDIENTE';
  }

  saveFormula(payload: SaveBomFormulaPayload): void {
    this.saving = true;
    this.clearMessages();

    this.facade.saveFormula(payload, this.formMode === 'edit' ? this.formFormula?.formula.id : undefined).subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = result.message;
        this.showForm = false;
        this.reload(false, result.formula.formula.id);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar la formula.';
      },
    });
  }

  approveFormula(aggregate: BomFormulaAggregate): void {
    const payload: BomFormulaDecisionPayload = {
      usuario: 'demo.jefe-produccion',
      responsableAprobacion: aggregate.formula.responsableAprobacion || 'Jefe de Produccion',
      observacion: 'Formula aprobada para operacion estandar de planta.',
      vigenciaDesde: aggregate.formula.vigenciaDesde,
    };

    this.clearMessages();
    this.facade.approveFormula(aggregate.formula.id, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.formula.formula.id);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible aprobar la formula.';
      },
    });
  }

  rejectFormula(aggregate: BomFormulaAggregate): void {
    const payload: BomFormulaDecisionPayload = {
      usuario: 'demo.director-tecnico',
      responsableAprobacion: aggregate.formula.responsableAprobacion || 'Director Tecnico',
      observacion: 'Se requiere ajustar costo, sanidad o rendimiento antes de liberar esta version.',
    };

    this.clearMessages();
    this.facade.rejectFormula(aggregate.formula.id, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.formula.formula.id);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible rechazar la formula.';
      },
    });
  }

  createNewVersion(aggregate: BomFormulaAggregate): void {
    this.clearMessages();
    this.facade
      .createNewVersion(aggregate.formula.id, {
        usuario: 'demo.formulador-produccion',
        motivoCambio: 'Nueva iteracion tecnica por ajuste de rendimiento, costo o empaque.',
      })
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.formMode = 'edit';
          this.formFormula = result.formula;
          this.showForm = true;
          this.reload(false, result.formula.formula.id, true);
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible crear la nueva version.';
        },
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private reload(clearMessages = true, preferredFormulaId?: string | null, keepForm = false): void {
    if (clearMessages) {
      this.clearMessages();
    }

    const currentFormulaId = preferredFormulaId ?? this.selectedFormula?.formula.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedFormula =
          dashboard.formulas.find((item) => item.formula.id === currentFormulaId) ?? dashboard.selectedFormula;
        if (keepForm) {
          this.formFormula = this.selectedFormula;
        }
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_BOM_FORMULA_DASHBOARD;
        this.selectedFormula = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar BOM / Formulas.';
      },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
