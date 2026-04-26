import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { QualityControlCatalogs } from '../../../domain/models/quality-control-response.model';
import { QualityInspectionFilters } from '../../../domain/models/quality-inspection-filters.model';

@Component({
  selector: 'app-quality-control-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Consulta operativa</p>
          <h3 class="erp-section-title">Filtros de inspeccion</h3>
          <p class="erp-section-description">
            Acota por tipo de control, lote, producto, proveedor, estado sanitario, analista y fecha de muestra.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar filtros</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(draft)">Aplicar filtros</button>
        </div>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Tipo de control</span>
          <select class="erp-field__control" [(ngModel)]="draft.tipoControl">
            <option value="TODOS">Todos</option>
            @for (option of catalogs.controlTypes; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Lote</span>
          <select class="erp-field__control" [(ngModel)]="draft.loteId">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.lots; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Producto</span>
          <select class="erp-field__control" [(ngModel)]="draft.productoId">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.products; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Proveedor</span>
          <select class="erp-field__control" [(ngModel)]="draft.proveedorId">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.suppliers; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado del lote</span>
          <select class="erp-field__control" [(ngModel)]="draft.estadoLote">
            @for (option of catalogs.lotStatuses; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Analista</span>
          <select class="erp-field__control" [(ngModel)]="draft.analista">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.analysts; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha desde</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaDesde" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha hasta</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaHasta" />
        </label>
      </div>
    </section>
  `,
})
export class QualityControlFiltersComponent {
  @Input() set filters(value: QualityInspectionFilters) {
    this.draft = { ...value };
  }

  @Input() catalogs: QualityControlCatalogs = EMPTY_CATALOGS;

  @Output() readonly apply = new EventEmitter<QualityInspectionFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: QualityInspectionFilters = {
    tipoControl: 'TODOS',
    loteId: null,
    productoId: null,
    proveedorId: null,
    estadoLote: 'TODOS',
    analista: null,
    fechaDesde: '',
    fechaHasta: '',
  };
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
