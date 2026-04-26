import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { OeeFilters } from '../../../domain/models/oee-filters.model';
import { OeeCatalogs } from '../../../domain/models/oee-response.model';

@Component({
  selector: 'app-oee-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Consulta operativa</p>
          <h3 class="erp-section-title">Filtros de captura OEE</h3>
          <p class="erp-section-description">
            Filtra por fecha operacion, planta, linea, maquina, turno, operario y severidad de alerta.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar filtros</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(draft)">Aplicar filtros</button>
        </div>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Fecha operacion</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaOperacion" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Planta</span>
          <select class="erp-field__control" [(ngModel)]="draft.planta" (ngModelChange)="syncLineAndMachine()">
            <option [ngValue]="null">Todas</option>
            @for (option of catalogs.plants; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Linea</span>
          <select class="erp-field__control" [(ngModel)]="draft.lineaProduccion" (ngModelChange)="syncMachine()">
            <option [ngValue]="null">Todas</option>
            @for (option of availableLines; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Maquina</span>
          <select class="erp-field__control" [(ngModel)]="draft.maquinaId">
            <option [ngValue]="null">Todas</option>
            @for (option of availableMachines; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Turno</span>
          <select class="erp-field__control" [(ngModel)]="draft.turno">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.shifts; track option.code) {
              <option [ngValue]="option.code">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Operario</span>
          <select class="erp-field__control" [(ngModel)]="draft.operario">
            <option [ngValue]="null">Todos</option>
            @for (option of catalogs.operators; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Severidad alerta</span>
          <select class="erp-field__control" [(ngModel)]="draft.severidadAlerta">
            @for (option of catalogs.severities; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>
    </section>
  `,
})
export class OeeFiltersComponent {
  @Input() set filters(value: OeeFilters) {
    this.draft = { ...value };
  }

  @Input() catalogs: OeeCatalogs = EMPTY_CATALOGS;

  @Output() readonly apply = new EventEmitter<OeeFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: OeeFilters = {
    fechaOperacion: null,
    planta: null,
    lineaProduccion: null,
    maquinaId: null,
    turno: null,
    operario: null,
    severidadAlerta: 'TODAS',
  };

  get availableLines() {
    return this.catalogs.lines.filter((item) => !this.draft.planta || item.planta === this.draft.planta);
  }

  get availableMachines() {
    return this.catalogs.machines.filter(
      (item) =>
        (!this.draft.planta || item.planta === this.draft.planta) &&
        (!this.draft.lineaProduccion || item.lineaProduccion === this.draft.lineaProduccion),
    );
  }

  syncLineAndMachine(): void {
    if (this.draft.lineaProduccion && !this.availableLines.some((item) => item.value === this.draft.lineaProduccion)) {
      this.draft.lineaProduccion = null;
    }

    this.syncMachine();
  }

  syncMachine(): void {
    if (this.draft.maquinaId && !this.availableMachines.some((item) => item.value === this.draft.maquinaId)) {
      this.draft.maquinaId = null;
    }
  }
}

const EMPTY_CATALOGS: OeeCatalogs = {
  plants: [],
  lines: [],
  machines: [],
  shifts: [],
  downtimeCauses: [],
  operators: [],
  supervisors: [],
  productionOrders: [],
  severities: [],
  oeeTarget: 0.85,
};
