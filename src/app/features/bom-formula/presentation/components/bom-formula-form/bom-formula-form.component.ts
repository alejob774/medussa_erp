import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { BomFormulaAggregate } from '../../../domain/models/bom-formula.model';
import { BomFormulaDetail } from '../../../domain/models/bom-formula-detail.model';
import { BomFormulaDashboard } from '../../../domain/models/bom-formula-response.model';
import { MeasurementUnit } from '../../../domain/models/measurement-unit.model';
import { SaveBomFormulaPayload } from '../../../domain/repositories/bom-formula.repository';
import { BomFormulaCostSummaryComponent } from '../bom-formula-cost-summary/bom-formula-cost-summary.component';
import { BomFormulaIngredientsGridComponent } from '../bom-formula-ingredients-grid/bom-formula-ingredients-grid.component';

export type BomFormulaFormMode = 'create' | 'edit';

@Component({
  selector: 'app-bom-formula-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    BomFormulaIngredientsGridComponent,
    BomFormulaCostSummaryComponent,
  ],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Edicion tecnica</p>
          <h3 class="erp-section-title">
            {{ mode === 'create' ? 'Nueva formula' : 'Edicion de formula' }}
          </h3>
          <p class="erp-section-description">
            Completa datos base, ingredientes, costeo y deja la version lista para borrador o aprobacion.
          </p>
        </div>
        @if (formula) {
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="font-semibold text-slate-900">{{ formula.formula.codigoFormula }}</p>
            <p>Version {{ formula.formula.version }} · {{ formula.formula.estado }}</p>
          </div>
        }
      </div>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error mt-5">{{ errorMessage }}</div>
      }

      <div class="mt-5 grid gap-4 xl:grid-cols-2">
        <label class="erp-field">
          <span class="erp-field__label">Producto terminado</span>
          <select class="erp-field__control" [(ngModel)]="draft.productoId">
            <option value="">Selecciona producto</option>
            @for (option of catalogs.finishedProducts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado inicial</span>
          <select class="erp-field__control" [(ngModel)]="draft.estado">
            @for (option of catalogs.draftStatuses; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Vigencia desde</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.vigenciaDesde" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Vigencia hasta</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.vigenciaHasta" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Merma esperada %</span>
          <input class="erp-field__control" type="number" min="0" max="100" step="0.01" [(ngModel)]="draft.mermaEsperada" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tiempo de proceso (min)</span>
          <input class="erp-field__control" type="number" min="1" step="1" [(ngModel)]="draft.tiempoProceso" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Rendimiento esperado</span>
          <input class="erp-field__control" type="number" min="1" step="0.01" [(ngModel)]="draft.rendimientoEsperado" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Unidad rendimiento</span>
          <select class="erp-field__control" [(ngModel)]="draft.unidadRendimiento">
            @for (option of catalogs.units; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Empaque requerido</span>
          <select class="erp-field__control" [(ngModel)]="draft.empaqueRequerido">
            <option value="">Selecciona empaque</option>
            @for (option of catalogs.packagingOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Responsable aprobacion</span>
          <select class="erp-field__control" [(ngModel)]="draft.responsableAprobacion">
            <option value="">Selecciona responsable</option>
            @for (option of catalogs.approvers; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field xl:col-span-2">
          <span class="erp-field__label">Observaciones sanitarias</span>
          <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.observacionesSanitarias"></textarea>
        </label>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <app-bom-formula-ingredients-grid
          [items]="ingredientRows"
          [ingredientOptions]="catalogs.ingredientOptions"
          [units]="unitValues"
          (itemsChange)="ingredientRows = $event"
        />

        <app-bom-formula-cost-summary
          eyebrow="Costeo draft"
          [ingredients]="ingredientRows"
          [mermaEsperada]="numberValue(draft.mermaEsperada)"
          [rendimientoEsperado]="numberValue(draft.rendimientoEsperado)"
          [unidadRendimiento]="draft.unidadRendimiento"
        />
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="submitForm()">
          {{ saving ? 'Guardando...' : mode === 'create' ? 'Crear formula' : 'Guardar cambios' }}
        </button>
        <button type="button" mat-stroked-button (click)="close.emit()">
          Cancelar
        </button>
      </div>
    </section>
  `,
})
export class BomFormulaFormComponent implements OnChanges {
  @Input() mode: BomFormulaFormMode = 'create';
  @Input() formula: BomFormulaAggregate | null = null;
  @Input() catalogs: BomFormulaDashboard['catalogs'] = EMPTY_CATALOGS;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<SaveBomFormulaPayload>();
  @Output() readonly close = new EventEmitter<void>();

  draft: SaveBomFormulaPayload = createEmptyDraft();
  ingredientRows: BomFormulaDetail[] = [];
  errorMessage = '';

  get unitValues(): MeasurementUnit[] {
    return this.catalogs.units.map((item) => item.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formula'] || changes['mode']) {
      this.errorMessage = '';
      this.draft = this.formula
        ? {
            productoId: this.formula.formula.productoId,
            estado: this.formula.formula.estado === 'PENDIENTE' ? 'PENDIENTE' : 'BORRADOR',
            vigenciaDesde: this.formula.formula.vigenciaDesde,
            vigenciaHasta: this.formula.formula.vigenciaHasta,
            mermaEsperada: this.formula.formula.mermaEsperada,
            tiempoProceso: this.formula.formula.tiempoProceso,
            rendimientoEsperado: this.formula.formula.rendimientoEsperado,
            unidadRendimiento: this.formula.formula.unidadRendimiento,
            empaqueRequerido: this.formula.formula.empaqueRequerido,
            responsableAprobacion: this.formula.formula.responsableAprobacion,
            observacionesSanitarias: this.formula.formula.observacionesSanitarias,
            usuarioCreador: this.formula.formula.usuarioCreador,
            ingredientes: [],
          }
        : createEmptyDraft();
      this.ingredientRows = this.formula
        ? this.formula.ingredients.map((item) => ({ ...item }))
        : [];
    }
  }

  submitForm(): void {
    if (!this.validate()) {
      return;
    }

    this.submit.emit({
      ...this.draft,
      vigenciaHasta: this.draft.vigenciaHasta?.trim() || null,
      observacionesSanitarias: this.draft.observacionesSanitarias?.trim() || null,
      mermaEsperada: this.numberValue(this.draft.mermaEsperada),
      tiempoProceso: this.numberValue(this.draft.tiempoProceso),
      rendimientoEsperado: this.numberValue(this.draft.rendimientoEsperado),
      ingredientes: this.ingredientRows.map((item) => ({
        ingredienteId: item.ingredienteId,
        ingredienteCodigo: item.ingredienteCodigo,
        ingredienteNombre: item.ingredienteNombre,
        cantidad: this.numberValue(item.cantidad),
        unidadMedida: item.unidadMedida,
        costoUnitario: this.numberValue(item.costoUnitario),
      })),
    });
  }

  numberValue(value: number): number {
    return Number(value ?? 0);
  }

  private validate(): boolean {
    if (!this.draft.productoId) {
      this.errorMessage = 'Debes seleccionar un producto terminado.';
      return false;
    }

    if (!this.draft.vigenciaDesde) {
      this.errorMessage = 'Debes registrar la vigencia inicial.';
      return false;
    }

    if (!this.draft.empaqueRequerido) {
      this.errorMessage = 'Debes seleccionar el empaque requerido.';
      return false;
    }

    if (!this.draft.responsableAprobacion) {
      this.errorMessage = 'Debes seleccionar el responsable de aprobacion.';
      return false;
    }

    if (this.numberValue(this.draft.rendimientoEsperado) <= 0) {
      this.errorMessage = 'El rendimiento esperado debe ser mayor a cero.';
      return false;
    }

    if (!this.ingredientRows.length) {
      this.errorMessage = 'Agrega al menos un ingrediente.';
      return false;
    }

    const invalidIngredient = this.ingredientRows.find(
      (item) =>
        !item.ingredienteId ||
        this.numberValue(item.cantidad) <= 0 ||
        this.numberValue(item.costoUnitario) <= 0,
    );

    if (invalidIngredient) {
      this.errorMessage = 'Todas las lineas deben tener ingrediente, cantidad y costo validos.';
      return false;
    }

    this.errorMessage = '';
    return true;
  }
}

const EMPTY_CATALOGS: BomFormulaDashboard['catalogs'] = {
  finishedProducts: [],
  ingredientOptions: [],
  statuses: [],
  draftStatuses: [],
  vigenciaOptions: [],
  units: [],
  packagingOptions: [],
  approvers: [],
  versions: [],
};

function createEmptyDraft(): SaveBomFormulaPayload {
  return {
    productoId: '',
    estado: 'BORRADOR',
    vigenciaDesde: new Date().toISOString().slice(0, 10),
    vigenciaHasta: null,
    mermaEsperada: 0,
    tiempoProceso: 60,
    rendimientoEsperado: 1,
    unidadRendimiento: 'UND',
    empaqueRequerido: '',
    responsableAprobacion: '',
    observacionesSanitarias: null,
    usuarioCreador: 'demo.formulador-produccion',
    ingredientes: [],
  };
}
