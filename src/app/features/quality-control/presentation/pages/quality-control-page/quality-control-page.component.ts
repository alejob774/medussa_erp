import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { QualityControlFacadeService } from '../../../application/facade/quality-control.facade';
import {
  EMPTY_QUALITY_CONTROL_DASHBOARD,
  QualityControlDashboard,
} from '../../../domain/models/quality-control-response.model';
import {
  DEFAULT_QUALITY_INSPECTION_FILTERS,
  QualityInspectionFilters,
} from '../../../domain/models/quality-inspection-filters.model';
import { QualityInspectionAggregate } from '../../../domain/models/quality-inspection.model';
import {
  CloseQualityNonConformityPayload,
  QualityLotDecisionPayload,
  SaveQualityInspectionPayload,
} from '../../../domain/repositories/quality-control.repository';
import { QualityControlFiltersComponent } from '../../components/quality-control-filters/quality-control-filters.component';
import {
  QualityControlFormComponent,
  QualityControlFormMode,
} from '../../components/quality-control-form/quality-control-form.component';
import { QualityControlHistoryComponent } from '../../components/quality-control-history/quality-control-history.component';
import { QualityControlListComponent } from '../../components/quality-control-list/quality-control-list.component';
import { QualityControlSummaryComponent } from '../../components/quality-control-summary/quality-control-summary.component';
import { QualityNonConformityPanelComponent } from '../../components/quality-nonconformity-panel/quality-nonconformity-panel.component';

@Component({
  selector: 'app-quality-control-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    QualityControlFiltersComponent,
    QualityControlListComponent,
    QualityControlSummaryComponent,
    QualityControlFormComponent,
    QualityControlHistoryComponent,
    QualityNonConformityPanelComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">PRODUCCION · HU-022</p>
            <h1 class="erp-page-title">Control de Calidad</h1>
            <p class="erp-page-description">
              Frente operativo y sanitario para {{ activeCompanyName }}, con inspecciones por recepcion, proceso y
              producto terminado, validacion automatica, bloqueo, liberacion y trazabilidad por lote.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal sanitario para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Lote seleccionado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ selectedInspection?.inspection?.loteCodigo || 'Sin seleccion' }}
              </p>
              <p class="erp-meta-card__hint">
                {{ selectedInspection?.inspection?.productoNombre || 'Selecciona una inspeccion para revisar detalle.' }}
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

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Inspecciones</p>
          <p class="erp-metric-card__value">{{ dashboard.kpis.totalInspections }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Pendientes</p>
          <p class="erp-metric-card__value text-slate-700">{{ dashboard.kpis.pendingCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Aprobadas</p>
          <p class="erp-metric-card__value text-emerald-700">{{ dashboard.kpis.approvedCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Rechazadas</p>
          <p class="erp-metric-card__value text-rose-700">{{ dashboard.kpis.rejectedCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Cuarentena</p>
          <p class="erp-metric-card__value text-amber-700">{{ dashboard.kpis.quarantineCount }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">NC abiertas</p>
          <p class="erp-metric-card__value text-fuchsia-700">{{ dashboard.kpis.openNonConformities }}</p>
        </article>
      </section>

      <div class="erp-action-strip">
        <button type="button" mat-flat-button color="primary" (click)="createInspection()">
          Nueva inspeccion
        </button>

        @if (selectedInspection && canEdit(selectedInspection)) {
          <button type="button" mat-stroked-button (click)="editInspection(selectedInspection)">
            Editar inspeccion
          </button>
        }

        @if (selectedInspection && canApprove(selectedInspection)) {
          <button type="button" mat-stroked-button (click)="approveLot(selectedInspection)">
            Aprobar lote
          </button>
        }

        @if (selectedInspection && canMoveToQuarantine(selectedInspection)) {
          <button type="button" mat-stroked-button (click)="sendToQuarantine(selectedInspection)">
            Enviar a cuarentena
          </button>
        }

        @if (selectedInspection && canReject(selectedInspection)) {
          <button type="button" mat-stroked-button (click)="rejectLot(selectedInspection)">
            Rechazar lote
          </button>
        }
      </div>

      <app-quality-control-filters
        [filters]="filters"
        [catalogs]="dashboard.catalogs"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <section class="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <app-quality-control-list
          [inspections]="dashboard.inspections"
          [selectedInspectionId]="selectedInspection?.inspection?.id ?? null"
          (select)="selectInspection($event)"
        />

        <app-quality-control-summary
          eyebrow="Estado sanitario actual"
          [inspection]="selectedInspection?.inspection ?? null"
          [evaluation]="selectedInspection?.evaluation ?? emptyEvaluation"
        />
      </section>

      @if (showForm) {
        <app-quality-control-form
          [mode]="formMode"
          [inspection]="formInspection"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="saveInspection($event)"
          (close)="closeForm()"
        />
      }

      <app-quality-control-history
        [relatedInspections]="relatedInspections"
        [histories]="relatedHistories"
      />

      <app-quality-nonconformity-panel
        [selectedInspection]="selectedInspection"
        [items]="relatedNonConformities"
        [responsibleOptions]="responsibleOptions"
        (createNc)="registerNonConformity($event)"
        (closeNc)="closeNonConformity($event)"
      />
    </div>
  `,
})
export class QualityControlPageComponent {
  private readonly facade = inject(QualityControlFacadeService);

  dashboard: QualityControlDashboard = EMPTY_QUALITY_CONTROL_DASHBOARD;
  filters: QualityInspectionFilters = { ...DEFAULT_QUALITY_INSPECTION_FILTERS };
  selectedInspection: QualityInspectionAggregate | null = null;
  formInspection: QualityInspectionAggregate | null = null;
  formMode: QualityControlFormMode = 'create';
  showForm = false;
  saving = false;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';
  readonly emptyEvaluation = EMPTY_QUALITY_CONTROL_DASHBOARD.selectedInspection?.evaluation ?? {
    totalParametros: 0,
    conformes: 0,
    noConformes: 0,
    criticosFueraDeRango: 0,
    sugerenciaEstado: 'PENDIENTE',
    accionSugerida: 'REINSPECCION',
    inspeccionConforme: false,
  };

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.selectedInspection = null;
      this.showForm = false;
      this.reload();
    });
  }

  get relatedInspections(): QualityInspectionAggregate[] {
    if (!this.selectedInspection) {
      return [];
    }

    return this.dashboard.inspections.filter(
      (item) => item.inspection.loteId === this.selectedInspection?.inspection.loteId,
    );
  }

  get relatedHistories() {
    if (!this.selectedInspection) {
      return [];
    }

    return this.dashboard.histories.filter(
      (item) => item.loteId === this.selectedInspection?.inspection.loteId,
    );
  }

  get relatedNonConformities() {
    if (!this.selectedInspection) {
      return [];
    }

    return this.dashboard.nonConformities.filter(
      (item) =>
        item.loteId === this.selectedInspection?.inspection.loteId ||
        item.inspeccionId === this.selectedInspection?.inspection.id,
    );
  }

  get responsibleOptions(): string[] {
    return [
      ...this.dashboard.catalogs.analysts.map((item) => item.value),
      ...this.dashboard.catalogs.releasers.map((item) => item.value),
    ].filter((value, index, array) => array.indexOf(value) === index);
  }

  handleFilters(filters: QualityInspectionFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_QUALITY_INSPECTION_FILTERS };
    this.reload();
  }

  selectInspection(inspection: QualityInspectionAggregate): void {
    this.selectedInspection = inspection;
  }

  createInspection(): void {
    this.formMode = 'create';
    this.formInspection = null;
    this.showForm = true;
    this.clearMessages();
  }

  editInspection(inspection: QualityInspectionAggregate): void {
    this.formMode = 'edit';
    this.formInspection = inspection;
    this.showForm = true;
    this.clearMessages();
  }

  closeForm(): void {
    this.showForm = false;
    this.formInspection = null;
  }

  canEdit(inspection: QualityInspectionAggregate): boolean {
    return !inspection.inspection.liberado;
  }

  canApprove(inspection: QualityInspectionAggregate): boolean {
    return !inspection.inspection.liberado && inspection.inspection.estadoLote !== 'RECHAZADO';
  }

  canMoveToQuarantine(inspection: QualityInspectionAggregate): boolean {
    return !inspection.inspection.liberado && inspection.inspection.estadoLote !== 'RECHAZADO';
  }

  canReject(inspection: QualityInspectionAggregate): boolean {
    return !inspection.inspection.liberado && inspection.inspection.estadoLote !== 'RECHAZADO';
  }

  saveInspection(payload: SaveQualityInspectionPayload): void {
    this.saving = true;
    this.clearMessages();

    this.facade
      .saveInspection(payload, this.formMode === 'edit' ? this.formInspection?.inspection.id : undefined)
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.showForm = false;
          this.reload(false, result.inspection?.inspection.id ?? null);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar la inspeccion.';
        },
      });
  }

  approveLot(inspection: QualityInspectionAggregate): void {
    const payload: QualityLotDecisionPayload = {
      accion: 'APROBAR',
      usuario: 'demo.jefe-calidad',
      responsableLiberacion: 'Jefe de Calidad',
      observacion: 'Lote liberado para uso o despacho luego de conformidad sanitaria.',
    };

    this.clearMessages();
    this.facade.takeLotDecision(inspection.inspection.id, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.inspection?.inspection.id ?? null);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible aprobar el lote.';
      },
    });
  }

  sendToQuarantine(inspection: QualityInspectionAggregate): void {
    const payload: QualityLotDecisionPayload = {
      accion: 'CUARENTENA',
      usuario: 'demo.jefe-calidad',
      observacion: 'Lote retenido para ampliacion de analisis y contramuestra.',
    };

    this.clearMessages();
    this.facade.takeLotDecision(inspection.inspection.id, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.inspection?.inspection.id ?? null);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible enviar el lote a cuarentena.';
      },
    });
  }

  rejectLot(inspection: QualityInspectionAggregate): void {
    const payload: QualityLotDecisionPayload = {
      accion: 'RECHAZAR',
      usuario: 'demo.director-tecnico',
      observacion: 'Lote rechazado por desviacion critica y bloqueo sanitario.',
    };

    this.clearMessages();
    this.facade.takeLotDecision(inspection.inspection.id, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.inspection?.inspection.id ?? null);
      },
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible rechazar el lote.';
      },
    });
  }

  registerNonConformity(payload: {
    motivo: string;
    accionCorrectiva: string;
    responsable: string;
    estado?: 'ABIERTA' | 'EN_ANALISIS';
  }): void {
    if (!this.selectedInspection) {
      return;
    }

    this.clearMessages();
    this.facade
      .saveNonConformity(this.selectedInspection.inspection.id, {
        ...payload,
        usuario: 'demo.analista-calidad-1',
      })
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.reload(false, result.inspection?.inspection.id ?? this.selectedInspection?.inspection.id ?? null);
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error ? error.message : 'No fue posible registrar la no conformidad.';
        },
      });
  }

  closeNonConformity(nonConformityId: string): void {
    const payload: CloseQualityNonConformityPayload = {
      usuario: 'demo.jefe-calidad',
      responsable: 'Jefe de Calidad',
      observacion: 'No conformidad cerrada tras ejecutar accion correctiva y verificar lote.',
    };

    this.clearMessages();
    this.facade.closeNonConformity(nonConformityId, payload).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.reload(false, result.inspection?.inspection.id ?? this.selectedInspection?.inspection.id ?? null);
      },
      error: (error: unknown) => {
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cerrar la no conformidad.';
      },
    });
  }

  private reload(clearMessages = true, preferredInspectionId?: string | null): void {
    if (clearMessages) {
      this.clearMessages();
    }

    const currentId = preferredInspectionId ?? this.selectedInspection?.inspection.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedInspection =
          dashboard.inspections.find((item) => item.inspection.id === currentId) ?? dashboard.selectedInspection;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_QUALITY_CONTROL_DASHBOARD;
        this.selectedInspection = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar el modulo de Control de Calidad.';
      },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
