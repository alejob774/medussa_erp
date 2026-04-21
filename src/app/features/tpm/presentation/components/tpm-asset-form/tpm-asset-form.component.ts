import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TpmCatalogs, TpmAssetAggregate } from '../../../domain/models/tpm-response.model';
import { SaveTpmAssetPayload } from '../../../domain/repositories/tpm.repository';

@Component({
  selector: 'app-tpm-asset-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Hoja de vida tecnica</p>
          <h3 class="erp-section-title">Complementar activo TPM</h3>
          <p class="erp-section-description">
            Extiende el maestro de Equipos con marca, modelo, serie, horas de uso, estado tecnico y notas.
          </p>
        </div>
        <button type="button" mat-stroked-button (click)="close.emit()">Cerrar</button>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Equipo</span>
          <input class="erp-field__control" [value]="draft.codigoEquipo + ' - ' + draft.nombreEquipo" disabled />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Marca</span>
          <input class="erp-field__control" [(ngModel)]="draft.marca" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Modelo</span>
          <input class="erp-field__control" [(ngModel)]="draft.modelo" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Serie</span>
          <input class="erp-field__control" [(ngModel)]="draft.serie" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Ubicacion</span>
          <select class="erp-field__control" [(ngModel)]="draft.ubicacion">
            @for (item of catalogs.locations; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha instalacion</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaInstalacion" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Horas de uso</span>
          <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.horasUso" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Estado tecnico</span>
          <select class="erp-field__control" [(ngModel)]="draft.estadoEquipo">
            @for (item of catalogs.equipmentStates; track item.value) {
              @if (item.value !== 'TODOS') {
                <option [value]="item.value">{{ item.label }}</option>
              }
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Ultimo mantenimiento</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaUltimoMantenimiento" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Proximo mantenimiento</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaProximoMantenimiento" />
        </label>

        <label class="erp-field xl:col-span-2">
          <span class="erp-field__label">Notas tecnicas</span>
          <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.notasTecnicas"></textarea>
        </label>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="submit.emit(draft)">
          {{ saving ? 'Guardando...' : 'Guardar hoja de vida' }}
        </button>
      </div>
    </section>
  `,
})
export class TpmAssetFormComponent {
  @Input() set asset(value: TpmAssetAggregate | null) {
    if (!value) {
      return;
    }

    this.draft = {
      equipoId: value.asset.equipoId,
      codigoEquipo: value.asset.codigoEquipo,
      nombreEquipo: value.asset.nombreEquipo,
      marca: value.asset.marca,
      modelo: value.asset.modelo,
      serie: value.asset.serie,
      ubicacion: value.asset.ubicacion,
      fechaInstalacion: value.asset.fechaInstalacion,
      horasUso: value.asset.horasUso,
      estadoEquipo: value.asset.estadoEquipo,
      fechaUltimoMantenimiento: value.asset.fechaUltimoMantenimiento,
      fechaProximoMantenimiento: value.asset.fechaProximoMantenimiento,
      notasTecnicas: value.asset.notasTecnicas,
    };
  }

  @Input() catalogs: TpmCatalogs = EMPTY_CATALOGS;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<SaveTpmAssetPayload>();
  @Output() readonly close = new EventEmitter<void>();

  draft: SaveTpmAssetPayload = {
    equipoId: '',
    codigoEquipo: '',
    nombreEquipo: '',
    marca: '',
    modelo: '',
    serie: '',
    ubicacion: '',
    fechaInstalacion: '',
    horasUso: 0,
    estadoEquipo: 'OPERATIVO',
    fechaUltimoMantenimiento: null,
    fechaProximoMantenimiento: null,
    notasTecnicas: null,
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
