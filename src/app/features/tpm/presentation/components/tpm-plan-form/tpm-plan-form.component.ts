import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TpmCatalogs } from '../../../domain/models/tpm-response.model';
import { TpmPlan } from '../../../domain/models/tpm-plan.model';
import { SaveTpmPlanPayload } from '../../../domain/repositories/tpm.repository';

@Component({
  selector: 'app-tpm-plan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Plan preventivo y tecnico</p>
          <h3 class="erp-section-title">{{ plan ? 'Editar plan' : 'Nuevo plan TPM' }}</h3>
          <p class="erp-section-description">
            Configura frecuencia por dias u horas de uso, tareas programadas y tecnico responsable.
          </p>
        </div>
        <button type="button" mat-stroked-button (click)="close.emit()">Cerrar</button>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Activo</span>
          <select class="erp-field__control" [(ngModel)]="draft.equipoId">
            @for (item of catalogs.assets; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tipo</span>
          <select class="erp-field__control" [(ngModel)]="draft.tipo">
            @for (item of catalogs.maintenanceTypes; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Frecuencia dias</span>
          <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.frecuenciaDias" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Frecuencia horas uso</span>
          <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.frecuenciaHorasUso" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tecnico asignado</span>
          <select class="erp-field__control" [(ngModel)]="draft.tecnicoAsignado">
            @for (item of catalogs.technicians; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Proximo vencimiento</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.proximoVencimiento" />
        </label>

        <label class="erp-field flex items-center gap-3 pt-7">
          <input type="checkbox" [(ngModel)]="draft.activo" />
          <span class="erp-field__label !mb-0">Plan activo</span>
        </label>
      </div>

      <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Tareas programadas</p>
            <p class="text-xs text-slate-500">Carga base de chequeos, sanitarios, calibracion o predictivo.</p>
          </div>
          <button type="button" mat-stroked-button (click)="addTask()">Agregar tarea</button>
        </div>

        <div class="mt-4 space-y-3">
          @for (task of draft.tareasProgramadas; track $index; let index = $index) {
            <div class="flex gap-3">
              <input class="erp-field__control flex-1" [(ngModel)]="draft.tareasProgramadas[index]" />
              <button type="button" mat-stroked-button (click)="removeTask(index)">Quitar</button>
            </div>
          }
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="submit.emit(normalizedDraft)">
          {{ saving ? 'Guardando...' : 'Guardar plan' }}
        </button>
      </div>
    </section>
  `,
})
export class TpmPlanFormComponent {
  @Input() set plan(value: TpmPlan | null) {
    if (!value) {
      return;
    }

    this.draft = {
      equipoId: value.equipoId,
      tipo: value.tipo,
      frecuenciaDias: value.frecuenciaDias,
      frecuenciaHorasUso: value.frecuenciaHorasUso,
      activo: value.activo,
      tareasProgramadas: [...value.tareasProgramadas],
      tecnicoAsignado: value.tecnicoAsignado,
      proximoVencimiento: value.proximoVencimiento,
    };
  }

  @Input() set defaultEquipoId(value: string | null) {
    if (value && !this.plan) {
      this.draft.equipoId = value;
    }
  }

  @Input() catalogs: TpmCatalogs = EMPTY_CATALOGS;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<SaveTpmPlanPayload>();
  @Output() readonly close = new EventEmitter<void>();

  draft: SaveTpmPlanPayload = {
    equipoId: '',
    tipo: 'PREVENTIVO',
    frecuenciaDias: 30,
    frecuenciaHorasUso: null,
    activo: true,
    tareasProgramadas: ['Chequeo general'],
    tecnicoAsignado: '',
    proximoVencimiento: null,
  };

  get normalizedDraft(): SaveTpmPlanPayload {
    return {
      ...this.draft,
      frecuenciaDias: this.draft.frecuenciaDias ? Number(this.draft.frecuenciaDias) : null,
      frecuenciaHorasUso: this.draft.frecuenciaHorasUso ? Number(this.draft.frecuenciaHorasUso) : null,
      tareasProgramadas: this.draft.tareasProgramadas.map((item) => item.trim()).filter(Boolean),
      tecnicoAsignado: this.draft.tecnicoAsignado,
      proximoVencimiento: this.draft.proximoVencimiento || null,
    };
  }

  addTask(): void {
    this.draft.tareasProgramadas = [...this.draft.tareasProgramadas, ''];
  }

  removeTask(index: number): void {
    this.draft.tareasProgramadas = this.draft.tareasProgramadas.filter((_, currentIndex) => currentIndex !== index);
  }
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
