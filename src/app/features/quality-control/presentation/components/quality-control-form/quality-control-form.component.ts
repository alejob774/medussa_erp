import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { QualityControlCatalogs } from '../../../domain/models/quality-control-response.model';
import { QualityInspectionAggregate } from '../../../domain/models/quality-inspection.model';
import { QualityInspectionDetail } from '../../../domain/models/quality-inspection-detail.model';
import { QualityControlType } from '../../../domain/models/quality-status.model';
import { SaveQualityInspectionPayload } from '../../../domain/repositories/quality-control.repository';
import { evaluateInspectionParameters } from '../../../domain/utils/quality-control-evaluation.utils';
import { QualityControlParametersGridComponent } from '../quality-control-parameters-grid/quality-control-parameters-grid.component';
import { QualityControlSummaryComponent } from '../quality-control-summary/quality-control-summary.component';

export type QualityControlFormMode = 'create' | 'edit';

@Component({
  selector: 'app-quality-control-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    QualityControlParametersGridComponent,
    QualityControlSummaryComponent,
  ],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Captura sanitaria</p>
          <h3 class="erp-section-title">
            {{ mode === 'create' ? 'Nueva inspeccion de calidad' : 'Edicion de inspeccion' }}
          </h3>
          <p class="erp-section-description">
            Registra cabecera, parametros medidos y deja el lote listo para decision sanitaria.
          </p>
        </div>
        @if (inspection) {
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="font-semibold text-slate-900">{{ inspection.inspection.loteCodigo }}</p>
            <p>{{ inspection.inspection.tipoControl }} · {{ inspection.inspection.estadoLote }}</p>
          </div>
        }
      </div>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error mt-5">{{ errorMessage }}</div>
      }

      <div class="mt-5 grid gap-4 xl:grid-cols-3">
        <label class="erp-field">
          <span class="erp-field__label">Tipo de control</span>
          <select class="erp-field__control" [(ngModel)]="draft.tipoControl" (ngModelChange)="handleControlTypeChange()">
            @for (option of catalogs.controlTypes; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Lote</span>
          <select class="erp-field__control" [(ngModel)]="draft.loteId" (ngModelChange)="handleLotChange()">
            <option value="">Selecciona lote</option>
            @for (option of catalogs.lots; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Producto / materia prima</span>
          <select class="erp-field__control" [(ngModel)]="draft.productoId">
            <option value="">Selecciona producto</option>
            @for (option of catalogs.products; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Proveedor</span>
          <select class="erp-field__control" [(ngModel)]="draft.proveedorId" [disabled]="draft.tipoControl !== 'RECEPCION'">
            <option [ngValue]="null">No aplica</option>
            @for (option of catalogs.suppliers; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Orden de produccion</span>
          <select class="erp-field__control" [(ngModel)]="draft.ordenProduccion" [disabled]="draft.tipoControl === 'RECEPCION'">
            <option [ngValue]="null">No aplica</option>
            @for (option of filteredOrderOptions; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha de muestra</span>
          <input class="erp-field__control" type="datetime-local" [(ngModel)]="draft.fechaMuestraLocal" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Analista</span>
          <select class="erp-field__control" [(ngModel)]="draft.analista">
            <option value="">Selecciona analista</option>
            @for (option of catalogs.analysts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Equipo utilizado</span>
          <select class="erp-field__control" [(ngModel)]="draft.equipoUtilizado">
            <option value="">Selecciona equipo</option>
            @for (option of catalogs.equipments; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field xl:col-span-3">
          <span class="erp-field__label">Observaciones</span>
          <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.observaciones"></textarea>
        </label>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <app-quality-control-parameters-grid
          [items]="parameterRows"
          [templates]="catalogs.parameterTemplates"
          [controlType]="draft.tipoControl"
          (itemsChange)="parameterRows = $event"
        />

        <app-quality-control-summary
          eyebrow="Evaluacion draft"
          [evaluation]="draftEvaluation"
        />
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="submitForm()">
          {{ saving ? 'Guardando...' : mode === 'create' ? 'Registrar inspeccion' : 'Guardar cambios' }}
        </button>
        <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
      </div>
    </section>
  `,
})
export class QualityControlFormComponent implements OnChanges {
  @Input() mode: QualityControlFormMode = 'create';
  @Input() inspection: QualityInspectionAggregate | null = null;
  @Input() catalogs: QualityControlCatalogs = EMPTY_CATALOGS;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<SaveQualityInspectionPayload>();
  @Output() readonly close = new EventEmitter<void>();

  draft: DraftInspection = createEmptyDraft();
  parameterRows: QualityInspectionDetail[] = [];
  errorMessage = '';

  get draftEvaluation() {
    return evaluateInspectionParameters(this.draft.tipoControl, this.parameterRows);
  }

  get filteredOrderOptions() {
    return this.catalogs.orderProductionOptions.filter(
      (item) => !this.draft.loteId || item.lotId === this.draft.loteId || item.productId === this.draft.productoId,
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inspection'] || changes['mode']) {
      this.errorMessage = '';
      this.draft = this.inspection
        ? {
            tipoControl: this.inspection.inspection.tipoControl,
            loteId: this.inspection.inspection.loteId,
            productoId: this.inspection.inspection.productoId,
            proveedorId: this.inspection.inspection.proveedorId,
            ordenProduccion: this.inspection.inspection.ordenProduccion,
            fechaMuestraLocal: toDateTimeLocal(this.inspection.inspection.fechaMuestra),
            analista: this.inspection.inspection.analista,
            equipoUtilizado: this.inspection.inspection.equipoUtilizado,
            observaciones: this.inspection.inspection.observaciones,
            usuarioCrea: this.inspection.inspection.usuarioCrea,
          }
        : createEmptyDraft();
      this.parameterRows = this.inspection
        ? this.inspection.parameters.map((item) => ({ ...item }))
        : [];
    }
  }

  handleControlTypeChange(): void {
    if (this.draft.tipoControl === 'RECEPCION') {
      this.draft.ordenProduccion = null;
      this.handleLotChange();
      return;
    }

    this.draft.proveedorId = null;
    this.handleLotChange();
  }

  handleLotChange(): void {
    const lot = this.catalogs.lots.find((item) => item.value === this.draft.loteId) ?? null;

    if (!lot) {
      return;
    }

    this.draft.productoId = lot.productId;

    if (this.draft.tipoControl === 'RECEPCION') {
      this.draft.proveedorId = lot.supplierId;
      this.draft.ordenProduccion = null;
      return;
    }

    this.draft.proveedorId = null;
    this.draft.ordenProduccion =
      this.filteredOrderOptions.find((item) => item.lotId === lot.value)?.value ?? null;
  }

  submitForm(): void {
    if (!this.validate()) {
      return;
    }

    this.submit.emit({
      tipoControl: this.draft.tipoControl,
      loteId: this.draft.loteId,
      productoId: this.draft.productoId,
      proveedorId: this.draft.tipoControl === 'RECEPCION' ? this.draft.proveedorId : null,
      ordenProduccion: this.draft.tipoControl === 'RECEPCION' ? null : this.draft.ordenProduccion,
      fechaMuestra: fromDateTimeLocal(this.draft.fechaMuestraLocal),
      analista: this.draft.analista,
      equipoUtilizado: this.draft.equipoUtilizado,
      observaciones: this.draft.observaciones?.trim() || null,
      usuarioCrea: this.draft.usuarioCrea,
      parametros: this.parameterRows.map((item) => ({
        templateId: item.templateId ?? null,
        parametro: item.parametro,
        resultado: Number(item.resultado),
        unidadMedida: item.unidadMedida,
        rangoMin: Number(item.rangoMin),
        rangoMax: Number(item.rangoMax),
        esCritico: !!item.esCritico,
      })),
    });
  }

  private validate(): boolean {
    if (!this.draft.loteId) {
      this.errorMessage = 'Debes seleccionar el lote a inspeccionar.';
      return false;
    }

    if (!this.draft.productoId) {
      this.errorMessage = 'Debes seleccionar el producto o materia prima.';
      return false;
    }

    if (!this.draft.fechaMuestraLocal) {
      this.errorMessage = 'Debes registrar la fecha de muestra.';
      return false;
    }

    if (!this.draft.analista) {
      this.errorMessage = 'Debes seleccionar el analista.';
      return false;
    }

    if (!this.parameterRows.length) {
      this.errorMessage = 'Agrega al menos un parametro medido.';
      return false;
    }

    const invalid = this.parameterRows.find(
      (item) =>
        !item.parametro.trim() ||
        !item.unidadMedida.trim() ||
        !Number.isFinite(Number(item.resultado)) ||
        Number(item.rangoMin) > Number(item.rangoMax),
    );

    if (invalid) {
      this.errorMessage = 'Revisa parametro, unidad, resultado y rangos de todas las lineas.';
      return false;
    }

    this.errorMessage = '';
    return true;
  }
}

interface DraftInspection {
  tipoControl: QualityControlType;
  loteId: string;
  productoId: string;
  proveedorId: string | null;
  ordenProduccion: string | null;
  fechaMuestraLocal: string;
  analista: string;
  equipoUtilizado: string;
  observaciones: string | null;
  usuarioCrea: string;
}

const EMPTY_CATALOGS: QualityControlCatalogs = {
  controlTypes: [],
  lotStatuses: [],
  lots: [],
  products: [],
  suppliers: [],
  analysts: [],
  equipments: [],
  releasers: [],
  actionOptions: [],
  nonConformityStatuses: [],
  parameterTemplates: [],
  orderProductionOptions: [],
};

function createEmptyDraft(): DraftInspection {
  return {
    tipoControl: 'RECEPCION',
    loteId: '',
    productoId: '',
    proveedorId: null,
    ordenProduccion: null,
    fechaMuestraLocal: toDateTimeLocal(new Date().toISOString()),
    analista: '',
    equipoUtilizado: '',
    observaciones: null,
    usuarioCrea: 'demo.analista-calidad-1',
  };
}

function toDateTimeLocal(value: string): string {
  return value.slice(0, 16);
}

function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}
