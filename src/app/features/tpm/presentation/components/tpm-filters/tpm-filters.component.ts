import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TpmFilters } from '../../../domain/models/tpm-filters.model';
import { TpmCatalogs } from '../../../domain/models/tpm-response.model';

@Component({
  selector: 'app-tpm-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Consulta operativa</p>
          <h3 class="erp-section-title">Filtros TPM</h3>
          <p class="erp-section-description">
            Filtra por equipo, tipo de mantenimiento, estado tecnico, estado OT, tecnico, ubicacion y severidad.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar filtros</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(draft)">Aplicar filtros</button>
        </div>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Equipo</span>
          <select class="erp-field__control" [(ngModel)]="draft.equipoId">
            <option [ngValue]="null">Todos</option>
            @for (item of catalogs.assets; track item.value) {
              <option [ngValue]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tipo mantenimiento</span>
          <select class="erp-field__control" [(ngModel)]="draft.tipoMantenimiento">
            <option value="TODOS">Todos</option>
            @for (item of catalogs.maintenanceTypes; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado equipo</span>
          <select class="erp-field__control" [(ngModel)]="draft.estadoEquipo">
            @for (item of catalogs.equipmentStates; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado OT</span>
          <select class="erp-field__control" [(ngModel)]="draft.estadoOt">
            @for (item of catalogs.workOrderStates; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tecnico</span>
          <select class="erp-field__control" [(ngModel)]="draft.tecnico">
            <option [ngValue]="null">Todos</option>
            @for (item of catalogs.technicians; track item.value) {
              <option [ngValue]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Ubicacion</span>
          <select class="erp-field__control" [(ngModel)]="draft.ubicacion">
            <option [ngValue]="null">Todas</option>
            @for (item of catalogs.locations; track item.value) {
              <option [ngValue]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Severidad alerta</span>
          <select class="erp-field__control" [(ngModel)]="draft.severidadAlerta">
            @for (item of catalogs.severities; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>
      </div>
    </section>
  `,
})
export class TpmFiltersComponent {
  @Input() set filters(value: TpmFilters) {
    this.draft = { ...value };
  }

  @Input() catalogs: TpmCatalogs = EMPTY_CATALOGS;

  @Output() readonly apply = new EventEmitter<TpmFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: TpmFilters = {
    equipoId: null,
    tipoMantenimiento: 'TODOS',
    estadoEquipo: 'TODOS',
    estadoOt: 'TODOS',
    tecnico: null,
    ubicacion: null,
    severidadAlerta: 'TODAS',
  };
}

const EMPTY_CATALOGS: TpmCatalogs = {
  maintenanceTypes: [],
  equipmentStates: [],
  workOrderStates: [],
  assets: [],
  technicians: [],
  locations: [],
  severities: [],
  spareParts: [],
};
