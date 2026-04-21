import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { OeeCatalogs, OeeRecordAggregate } from '../../../domain/models/oee-response.model';
import { RegisterOeeDowntimePayload, SaveOeeRecordPayload } from '../../../domain/repositories/oee.repository';

export type OeeFormMode = 'create' | 'edit' | 'downtime';

export type OeeFormSubmitEvent =
  | {
      mode: 'create' | 'edit';
      payload: SaveOeeRecordPayload;
    }
  | {
      mode: 'downtime';
      payload: RegisterOeeDowntimePayload;
    };

type OeeDraft = SaveOeeRecordPayload & { tiempoParadoAdicional: number; observacionParo: string | null };

@Component({
  selector: 'app-oee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">{{ mode === 'downtime' ? 'Paro no programado' : 'Captura operativa' }}</p>
          <h3 class="erp-section-title">
            {{ mode === 'create' ? 'Nuevo registro OEE' : mode === 'edit' ? 'Editar registro OEE' : 'Registrar parada' }}
          </h3>
          <p class="erp-section-description">
            @if (mode === 'downtime') {
              Suma minutos de paro y causa sobre el registro seleccionado sin salir del modulo operativo.
            } @else {
              Registra datos reales de planta para calcular disponibilidad, rendimiento, calidad y OEE automaticamente.
            }
          </p>
        </div>
        <button type="button" mat-stroked-button (click)="close.emit()">Cerrar</button>
      </div>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error mt-5">{{ errorMessage }}</div>
      }

      @if (mode === 'downtime' && record) {
        <div class="mt-5 grid gap-4 lg:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-semibold text-slate-900">{{ record.record.maquinaNombre }}</p>
            <p>{{ record.record.planta }} - {{ record.record.lineaProduccion }}</p>
            <p class="mt-2">Turno {{ record.record.turno }} - {{ record.record.fechaOperacion }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-semibold text-slate-900">Paro actual</p>
            <p>{{ record.record.tiempoParado }} min</p>
            <p class="mt-2">{{ record.record.causaParo || 'Sin causa reportada' }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p class="font-semibold text-slate-900">OEE actual</p>
            <p>{{ record.record.oee | percent: '1.0-1' }}</p>
            <p class="mt-2">Disponibilidad {{ record.record.disponibilidad | percent: '1.0-1' }}</p>
          </article>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-3">
          <label class="erp-field">
            <span class="erp-field__label">Minutos adicionales de paro</span>
            <input class="erp-field__control" type="number" min="1" [(ngModel)]="draft.tiempoParadoAdicional" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Causa de paro</span>
            <select class="erp-field__control" [(ngModel)]="draft.causaParo">
              <option [ngValue]="null">Selecciona una causa</option>
              @for (option of catalogs.downtimeCauses; track option.code) {
                <option [ngValue]="option.label">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field lg:col-span-3">
            <span class="erp-field__label">Observacion</span>
            <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.observacionParo"></textarea>
          </label>
        </div>
      } @else {
        <div class="mt-5 grid gap-4 xl:grid-cols-4">
          <label class="erp-field">
            <span class="erp-field__label">Planta</span>
            <select class="erp-field__control" [(ngModel)]="draft.planta" (ngModelChange)="syncLineAndMachine()">
              <option value="">Selecciona planta</option>
              @for (option of catalogs.plants; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Linea de produccion</span>
            <select class="erp-field__control" [(ngModel)]="draft.lineaProduccion" (ngModelChange)="syncMachineAndOrder()">
              <option value="">Selecciona linea</option>
              @for (option of availableLines; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Maquina / equipo</span>
            <select class="erp-field__control" [(ngModel)]="draft.maquinaId" (ngModelChange)="syncMachineContext()">
              <option value="">Selecciona maquina</option>
              @for (option of availableMachines; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Turno</span>
            <select class="erp-field__control" [(ngModel)]="draft.turno">
              @for (option of catalogs.shifts; track option.code) {
                <option [value]="option.code">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Fecha operacion</span>
            <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaOperacion" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Hora inicio</span>
            <input class="erp-field__control" type="time" [(ngModel)]="draft.horaInicio" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Hora fin</span>
            <input class="erp-field__control" type="time" [(ngModel)]="draft.horaFin" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Tiempo programado (min)</span>
            <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.tiempoProgramado" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Tiempo parado total (min)</span>
            <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.tiempoParado" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Causa de paro</span>
            <select class="erp-field__control" [(ngModel)]="draft.causaParo">
              <option [ngValue]="null">Sin causa</option>
              @for (option of catalogs.downtimeCauses; track option.code) {
                <option [ngValue]="option.label">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Unidades producidas</span>
            <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.unidadesProducidas" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Unidades objetivo</span>
            <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.unidadesObjetivo" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Unidades rechazadas</span>
            <input class="erp-field__control" type="number" min="0" [(ngModel)]="draft.unidadesRechazadas" />
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Operario</span>
            <select class="erp-field__control" [(ngModel)]="draft.operario">
              @for (option of catalogs.operators; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Supervisor</span>
            <select class="erp-field__control" [(ngModel)]="draft.supervisor">
              @for (option of catalogs.supervisors; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="erp-field xl:col-span-2">
            <span class="erp-field__label">Orden de produccion mock</span>
            <select class="erp-field__control" [(ngModel)]="draft.ordenProduccion">
              <option [ngValue]="null">Sin orden asociada</option>
              @for (option of availableOrders; track option.value) {
                <option [ngValue]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
        </div>
      }

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="handleSubmit()">
          {{ saving ? 'Guardando...' : mode === 'downtime' ? 'Guardar parada' : 'Guardar registro' }}
        </button>
      </div>
    </section>
  `,
})
export class OeeFormComponent {
  @Input() set mode(value: OeeFormMode) {
    this.currentMode = value;
    this.syncDraft();
  }

  @Input() set record(value: OeeRecordAggregate | null) {
    this.currentRecord = value;
    this.syncDraft();
  }

  @Input() set catalogs(value: OeeCatalogs) {
    this.currentCatalogs = value;

    if (!this.currentRecord || this.currentMode === 'create') {
      this.syncDraft();
    }
  }
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<OeeFormSubmitEvent>();
  @Output() readonly close = new EventEmitter<void>();

  protected currentMode: OeeFormMode = 'create';
  protected currentRecord: OeeRecordAggregate | null = null;
  protected currentCatalogs: OeeCatalogs = EMPTY_CATALOGS;
  protected draft: OeeDraft = buildEmptyDraft();
  protected errorMessage = '';

  get mode(): OeeFormMode {
    return this.currentMode;
  }

  get record(): OeeRecordAggregate | null {
    return this.currentRecord;
  }

  get catalogs(): OeeCatalogs {
    return this.currentCatalogs;
  }

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

  get availableOrders() {
    return this.catalogs.productionOrders.filter(
      (item) =>
        (!this.draft.planta || item.planta === this.draft.planta) &&
        (!this.draft.lineaProduccion || item.lineaProduccion === this.draft.lineaProduccion),
    );
  }

  syncLineAndMachine(): void {
    if (this.draft.lineaProduccion && !this.availableLines.some((item) => item.value === this.draft.lineaProduccion)) {
      this.draft.lineaProduccion = '';
    }

    this.syncMachineAndOrder();
  }

  syncMachineAndOrder(): void {
    if (this.draft.maquinaId && !this.availableMachines.some((item) => item.value === this.draft.maquinaId)) {
      this.draft.maquinaId = '';
    }

    if (
      this.draft.ordenProduccion &&
      !this.availableOrders.some((item) => item.value === this.draft.ordenProduccion)
    ) {
      this.draft.ordenProduccion = null;
    }
  }

  syncMachineContext(): void {
    const machine = this.catalogs.machines.find((item) => item.value === this.draft.maquinaId) ?? null;
    if (!machine) {
      return;
    }

    this.draft.planta = machine.planta;
    this.draft.lineaProduccion = machine.lineaProduccion;

    const suggestedOrder = this.availableOrders.find(
      (item) => item.machineId === machine.value || item.lineaProduccion === machine.lineaProduccion,
    );

    if (!this.draft.ordenProduccion && suggestedOrder) {
      this.draft.ordenProduccion = suggestedOrder.value;
    }
  }

  handleSubmit(): void {
    this.errorMessage = '';

    if (this.mode === 'downtime') {
      if (!this.draft.causaParo) {
        this.errorMessage = 'Selecciona la causa de paro.';
        return;
      }

      if (!Number.isFinite(this.draft.tiempoParadoAdicional) || this.draft.tiempoParadoAdicional <= 0) {
        this.errorMessage = 'Los minutos adicionales de paro deben ser mayores a cero.';
        return;
      }

      this.submit.emit({
        mode: 'downtime',
        payload: {
          tiempoParadoAdicional: Number(this.draft.tiempoParadoAdicional),
          causaParo: this.draft.causaParo,
          usuario: '',
          observacion: this.draft.observacionParo?.trim() || null,
        },
      });
      return;
    }

    if (!this.draft.planta || !this.draft.lineaProduccion || !this.draft.maquinaId) {
      this.errorMessage = 'Planta, linea y maquina son obligatorias.';
      return;
    }

    if (!this.draft.fechaOperacion || !this.draft.horaInicio || !this.draft.horaFin) {
      this.errorMessage = 'Debes registrar fecha de operacion y horas del turno.';
      return;
    }

    this.submit.emit({
      mode: this.mode,
      payload: {
        planta: this.draft.planta,
        lineaProduccion: this.draft.lineaProduccion,
        maquinaId: this.draft.maquinaId,
        turno: this.draft.turno,
        fechaOperacion: this.draft.fechaOperacion,
        horaInicio: this.draft.horaInicio,
        horaFin: this.draft.horaFin,
        tiempoProgramado: Number(this.draft.tiempoProgramado),
        tiempoParado: Number(this.draft.tiempoParado),
        causaParo: this.draft.causaParo?.trim() || null,
        unidadesProducidas: Number(this.draft.unidadesProducidas),
        unidadesObjetivo: Number(this.draft.unidadesObjetivo),
        unidadesRechazadas: Number(this.draft.unidadesRechazadas),
        operario: this.draft.operario,
        supervisor: this.draft.supervisor,
        ordenProduccion: this.draft.ordenProduccion?.trim() || null,
        usuarioCrea: '',
      },
    });
  }

  private syncDraft(): void {
    if (this.currentMode === 'downtime' && this.currentRecord) {
      this.draft = {
        ...buildEmptyDraft(),
        planta: this.currentRecord.record.planta,
        lineaProduccion: this.currentRecord.record.lineaProduccion,
        maquinaId: this.currentRecord.record.maquinaId,
        turno: this.currentRecord.record.turno as SaveOeeRecordPayload['turno'],
        fechaOperacion: this.currentRecord.record.fechaOperacion,
        horaInicio: this.currentRecord.record.horaInicio,
        horaFin: this.currentRecord.record.horaFin,
        tiempoProgramado: this.currentRecord.record.tiempoProgramado,
        tiempoParado: this.currentRecord.record.tiempoParado,
        causaParo: null,
        unidadesProducidas: this.currentRecord.record.unidadesProducidas,
        unidadesObjetivo: this.currentRecord.record.unidadesObjetivo,
        unidadesRechazadas: this.currentRecord.record.unidadesRechazadas,
        operario: this.currentRecord.record.operario,
        supervisor: this.currentRecord.record.supervisor,
        ordenProduccion: this.currentRecord.record.ordenProduccion,
        tiempoParadoAdicional: 0,
        observacionParo: null,
      };
      return;
    }

    if (this.currentRecord) {
      this.draft = {
        ...buildEmptyDraft(),
        planta: this.currentRecord.record.planta,
        lineaProduccion: this.currentRecord.record.lineaProduccion,
        maquinaId: this.currentRecord.record.maquinaId,
        turno: this.currentRecord.record.turno as SaveOeeRecordPayload['turno'],
        fechaOperacion: this.currentRecord.record.fechaOperacion,
        horaInicio: this.currentRecord.record.horaInicio,
        horaFin: this.currentRecord.record.horaFin,
        tiempoProgramado: this.currentRecord.record.tiempoProgramado,
        tiempoParado: this.currentRecord.record.tiempoParado,
        causaParo: this.currentRecord.record.causaParo,
        unidadesProducidas: this.currentRecord.record.unidadesProducidas,
        unidadesObjetivo: this.currentRecord.record.unidadesObjetivo,
        unidadesRechazadas: this.currentRecord.record.unidadesRechazadas,
        operario: this.currentRecord.record.operario,
        supervisor: this.currentRecord.record.supervisor,
        ordenProduccion: this.currentRecord.record.ordenProduccion,
      };
      return;
    }

    this.draft = buildEmptyDraft(this.catalogs);
  }
}

function buildEmptyDraft(catalogs?: OeeCatalogs): OeeDraft {
  return {
    planta: catalogs?.plants[0]?.value ?? '',
    lineaProduccion: catalogs?.lines[0]?.value ?? '',
    maquinaId: catalogs?.machines[0]?.value ?? '',
    turno: catalogs?.shifts[0]?.code ?? 'MANANA',
    fechaOperacion: new Date().toISOString().slice(0, 10),
    horaInicio: '06:00',
    horaFin: '14:00',
    tiempoProgramado: 480,
    tiempoParado: 0,
    causaParo: null,
    unidadesProducidas: 0,
    unidadesObjetivo: 0,
    unidadesRechazadas: 0,
    operario: catalogs?.operators[0]?.value ?? '',
    supervisor: catalogs?.supervisors[0]?.value ?? '',
    ordenProduccion: null,
    usuarioCrea: '',
    tiempoParadoAdicional: 0,
    observacionParo: null,
  };
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
