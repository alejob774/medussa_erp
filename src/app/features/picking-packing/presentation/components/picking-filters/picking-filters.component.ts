import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { PickingFilters } from '../../../domain/models/picking-filters.model';
import { PickingPackingDashboard } from '../../../domain/models/picking-packing-response.model';

@Component({
  selector: 'app-picking-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Planeacion operativa</p>
          <h3 class="erp-section-title">Filtros de la bandeja</h3>
          <p class="erp-section-description">
            Cruza ruta, cliente, prioridad, operario, fecha y severidad para priorizar el turno de despacho.
          </p>
        </div>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Ruta</span>
          <select class="erp-field__control" [(ngModel)]="draft.rutaId">
            <option [ngValue]="null">Todas</option>
            @for (option of catalogs.routes; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Cliente</span>
          <select class="erp-field__control" [(ngModel)]="draft.clienteId">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.clients; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Prioridad</span>
          <select class="erp-field__control" [(ngModel)]="draft.prioridad">
            @for (option of catalogs.priorities; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado</span>
          <select class="erp-field__control" [(ngModel)]="draft.estado">
            @for (option of catalogs.states; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha compromiso</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fecha" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Operario</span>
          <select class="erp-field__control" [(ngModel)]="draft.operarioNombre">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.operators; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Zona</span>
          <select class="erp-field__control" [(ngModel)]="draft.zona">
            <option [ngValue]="null">Todas</option>
            @for (option of catalogs.zones; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Severidad</span>
          <select class="erp-field__control" [(ngModel)]="draft.severidad">
            @for (option of catalogs.severities; track option.value) {
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
export class PickingFiltersComponent implements OnChanges {
  @Input() catalogs: PickingPackingDashboard['catalogs'] = EMPTY_CATALOGS;
  @Input() filters: PickingFilters = EMPTY_FILTERS;

  @Output() readonly apply = new EventEmitter<PickingFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: PickingFilters = { ...EMPTY_FILTERS };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.draft = { ...this.filters };
    }
  }

  applyFilters(): void {
    this.apply.emit({ ...this.draft });
  }
}

const EMPTY_FILTERS: PickingFilters = {
  rutaId: null,
  clienteId: null,
  prioridad: 'TODAS',
  estado: 'TODOS',
  fecha: null,
  operarioNombre: null,
  zona: null,
  severidad: 'TODAS',
};

const EMPTY_CATALOGS: PickingPackingDashboard['catalogs'] = {
  routes: [],
  clients: [],
  priorities: [],
  states: [],
  operators: [],
  zones: [],
  packageTypes: [],
  severities: [],
};
