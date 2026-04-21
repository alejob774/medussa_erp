import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { BomFormulaFilters } from '../../../domain/models/bom-formula-filters.model';
import { BomFormulaDashboard } from '../../../domain/models/bom-formula-response.model';

@Component({
  selector: 'app-bom-formula-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Consulta tecnica</p>
        <h3 class="erp-section-title">Filtros de formulas</h3>
        <p class="erp-section-description">
          Busca por producto terminado, estado, version, vigencia y responsable de aprobacion.
        </p>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label class="erp-field">
          <span class="erp-field__label">Producto terminado</span>
          <select class="erp-field__control" [(ngModel)]="draft.productoId">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.finishedProducts; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado</span>
          <select class="erp-field__control" [(ngModel)]="draft.estado">
            @for (option of catalogs.statuses; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Version</span>
          <input class="erp-field__control" type="text" [(ngModel)]="draft.version" placeholder="1.0 / 2.0" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Vigencia</span>
          <select class="erp-field__control" [(ngModel)]="draft.vigencia">
            @for (option of catalogs.vigenciaOptions; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Responsable</span>
          <select class="erp-field__control" [(ngModel)]="draft.responsableAprobacion">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.approvers; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" mat-flat-button color="primary" (click)="applyFilters()">
          Aplicar filtros
        </button>
        <button type="button" mat-stroked-button (click)="reset.emit()">
          Limpiar
        </button>
      </div>
    </section>
  `,
})
export class BomFormulaFiltersComponent implements OnChanges {
  @Input() filters: BomFormulaFilters = EMPTY_FILTERS;
  @Input() catalogs: BomFormulaDashboard['catalogs'] = EMPTY_CATALOGS;

  @Output() readonly apply = new EventEmitter<BomFormulaFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: BomFormulaFilters = { ...EMPTY_FILTERS };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.draft = { ...this.filters };
    }
  }

  applyFilters(): void {
    this.apply.emit({ ...this.draft, version: this.draft.version?.trim() || null });
  }
}

const EMPTY_FILTERS: BomFormulaFilters = {
  productoId: null,
  estado: 'TODOS',
  version: null,
  vigencia: 'TODAS',
  responsableAprobacion: null,
};

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
