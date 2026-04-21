import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TpmCatalogs } from '../../../domain/models/tpm-response.model';
import { TpmWorkOrder } from '../../../domain/models/tpm-work-order.model';
import {
  CloseTpmWorkOrderPayload,
  SaveTpmSparePartPayload,
  SaveTpmWorkOrderPayload,
} from '../../../domain/repositories/tpm.repository';

export type TpmWorkOrderFormMode = 'create' | 'edit' | 'close';

export type TpmWorkOrderFormSubmit =
  | { mode: 'create' | 'edit'; payload: SaveTpmWorkOrderPayload }
  | { mode: 'close'; payload: CloseTpmWorkOrderPayload };

interface SpareDraft {
  codigoRepuesto: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

@Component({
  selector: 'app-tpm-work-order-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Orden de trabajo</p>
          <h3 class="erp-section-title">
            {{ mode === 'create' ? 'Nueva OT' : mode === 'edit' ? 'Editar OT' : 'Cerrar OT' }}
          </h3>
          <p class="erp-section-description">
            Registra correctivos, preventivos, predictivos, sanitarios y calibraciones con costo, causa raiz y repuestos.
          </p>
        </div>
        <button type="button" mat-stroked-button (click)="close.emit()">Cerrar</button>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Activo</span>
          <select class="erp-field__control" [(ngModel)]="draft.equipoId" [disabled]="mode === 'close'">
            @for (item of catalogs.assets; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tipo</span>
          <select class="erp-field__control" [(ngModel)]="draft.tipo" [disabled]="mode === 'close'">
            @for (item of catalogs.maintenanceTypes; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha programada</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaProgramada" [disabled]="mode === 'close'" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha inicio</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaInicio" [disabled]="mode === 'close'" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Tecnico</span>
          <select class="erp-field__control" [(ngModel)]="draft.tecnico" [disabled]="mode === 'close'">
            @for (item of catalogs.technicians; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        @if (mode !== 'close') {
          <label class="erp-field">
            <span class="erp-field__label">Estado OT</span>
            <select class="erp-field__control" [(ngModel)]="draft.estado">
              @for (item of catalogs.workOrderStates; track item.value) {
                @if (item.value !== 'TODOS' && item.value !== 'CERRADA') {
                  <option [value]="item.value">{{ item.label }}</option>
                }
              }
            </select>
          </label>
        }

        @if (mode === 'close') {
          <label class="erp-field">
            <span class="erp-field__label">Fecha cierre</span>
            <input class="erp-field__control" type="date" [(ngModel)]="closeDraft.fechaCierre" />
          </label>
        }

        <label class="erp-field">
          <span class="erp-field__label">Tiempo reparacion (h)</span>
          <input class="erp-field__control" type="number" min="0" [(ngModel)]="timeField" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Costo</span>
          <input class="erp-field__control" type="number" min="0" [(ngModel)]="costField" />
        </label>

        <label class="erp-field xl:col-span-2">
          <span class="erp-field__label">Causa raiz</span>
          <input class="erp-field__control" [(ngModel)]="causeField" />
        </label>

        @if (mode !== 'close') {
          <label class="erp-field flex items-center gap-3 pt-7">
            <input type="checkbox" [(ngModel)]="draft.generaBloqueo" />
            <span class="erp-field__label !mb-0">Genera bloqueo tecnico</span>
          </label>
        }

        @if (mode === 'close') {
          <label class="erp-field">
            <span class="erp-field__label">Estado equipo posterior</span>
            <select class="erp-field__control" [(ngModel)]="closeDraft.estadoEquipoPosterior">
              @for (item of catalogs.equipmentStates; track item.value) {
                @if (item.value !== 'TODOS') {
                  <option [value]="item.value">{{ item.label }}</option>
                }
              }
            </select>
          </label>
        }

        <label class="erp-field xl:col-span-4">
          <span class="erp-field__label">Observaciones</span>
          <textarea class="erp-field__control min-h-24" [(ngModel)]="notesField"></textarea>
        </label>

        @if (mode !== 'close') {
          <label class="erp-field xl:col-span-4">
            <span class="erp-field__label">Impacto OEE</span>
            <textarea class="erp-field__control min-h-20" [(ngModel)]="draft.impactoOee"></textarea>
          </label>
        }
      </div>

      <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Repuestos usados</p>
            <p class="text-xs text-slate-500">Carga repuestos y costo unitario para el cierre tecnico.</p>
          </div>
          <button type="button" mat-stroked-button (click)="addSpare()">Agregar repuesto</button>
        </div>

        <div class="mt-4 space-y-3">
          @for (item of spareDrafts; track $index; let index = $index) {
            <div class="grid gap-3 xl:grid-cols-[1.2fr_1.4fr_0.6fr_0.8fr_auto]">
              <select class="erp-field__control" [(ngModel)]="spareDrafts[index].codigoRepuesto" (ngModelChange)="syncSpare(index)">
                <option value="">Selecciona repuesto</option>
                @for (part of catalogs.spareParts; track part.codigo) {
                  <option [value]="part.codigo">{{ part.codigo }}</option>
                }
              </select>
              <input class="erp-field__control" [(ngModel)]="spareDrafts[index].descripcion" />
              <input class="erp-field__control" type="number" min="0" [(ngModel)]="spareDrafts[index].cantidad" />
              <input class="erp-field__control" type="number" min="0" [(ngModel)]="spareDrafts[index].costoUnitario" />
              <button type="button" mat-stroked-button (click)="removeSpare(index)">Quitar</button>
            </div>
          }
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
        <button type="button" mat-flat-button color="primary" [disabled]="saving" (click)="handleSubmit()">
          {{ saving ? 'Guardando...' : mode === 'close' ? 'Cerrar OT' : 'Guardar OT' }}
        </button>
      </div>
    </section>
  `,
})
export class TpmWorkOrderFormComponent {
  @Input() set workOrder(value: TpmWorkOrder | null) {
    this.currentWorkOrder = value;
    this.syncDraft();
  }

  @Input() set mode(value: TpmWorkOrderFormMode) {
    this.currentMode = value;
    this.syncDraft();
  }

  @Input() set defaultEquipoId(value: string | null) {
    this.defaultAssetId = value;
    this.syncDraft();
  }

  @Input() catalogs: TpmCatalogs = EMPTY_CATALOGS;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<TpmWorkOrderFormSubmit>();
  @Output() readonly close = new EventEmitter<void>();

  protected currentMode: TpmWorkOrderFormMode = 'create';
  protected currentWorkOrder: TpmWorkOrder | null = null;
  protected defaultAssetId: string | null = null;

  protected draft: SaveTpmWorkOrderPayload = buildDefaultWorkOrderDraft();
  protected closeDraft: CloseTpmWorkOrderPayload = buildDefaultCloseDraft();
  protected spareDrafts: SpareDraft[] = [];

  get mode(): TpmWorkOrderFormMode {
    return this.currentMode;
  }

  get timeField(): number {
    return this.mode === 'close' ? this.closeDraft.tiempoReparacion : this.draft.tiempoReparacion;
  }

  set timeField(value: number) {
    if (this.mode === 'close') {
      this.closeDraft.tiempoReparacion = Number(value);
    } else {
      this.draft.tiempoReparacion = Number(value);
    }
  }

  get costField(): number {
    return this.mode === 'close' ? this.closeDraft.costo : this.draft.costo;
  }

  set costField(value: number) {
    if (this.mode === 'close') {
      this.closeDraft.costo = Number(value);
    } else {
      this.draft.costo = Number(value);
    }
  }

  get causeField(): string | null {
    return this.mode === 'close' ? this.closeDraft.causaRaiz : this.draft.causaRaiz;
  }

  set causeField(value: string | null) {
    if (this.mode === 'close') {
      this.closeDraft.causaRaiz = value;
    } else {
      this.draft.causaRaiz = value;
    }
  }

  get notesField(): string | null {
    return this.mode === 'close' ? this.closeDraft.observaciones : this.draft.observaciones;
  }

  set notesField(value: string | null) {
    if (this.mode === 'close') {
      this.closeDraft.observaciones = value;
    } else {
      this.draft.observaciones = value;
    }
  }

  addSpare(): void {
    this.spareDrafts = [...this.spareDrafts, { codigoRepuesto: '', descripcion: '', cantidad: 1, costoUnitario: 0 }];
  }

  removeSpare(index: number): void {
    this.spareDrafts = this.spareDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  syncSpare(index: number): void {
    const selected = this.catalogs.spareParts.find((item) => item.codigo === this.spareDrafts[index].codigoRepuesto);
    if (!selected) {
      return;
    }

    this.spareDrafts[index] = {
      ...this.spareDrafts[index],
      descripcion: selected.descripcion,
      costoUnitario: selected.costoUnitario,
    };
  }

  handleSubmit(): void {
    const repuestos = this.spareDrafts
      .filter((item) => item.codigoRepuesto)
      .map<SaveTpmSparePartPayload>((item) => ({
        codigoRepuesto: item.codigoRepuesto,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad),
        costoUnitario: Number(item.costoUnitario),
      }));

    if (this.mode === 'close') {
      this.submit.emit({
        mode: 'close',
        payload: {
          ...this.closeDraft,
          repuestosUsados: repuestos,
          usuario: '',
        },
      });
      return;
    }

    this.submit.emit({
      mode: this.mode,
      payload: {
        ...this.draft,
        repuestosUsados: repuestos,
        usuario: '',
      },
    });
  }

  private syncDraft(): void {
    if (this.currentWorkOrder) {
      this.draft = {
        equipoId: this.currentWorkOrder.equipoId,
        planId: this.currentWorkOrder.planId,
        tipo: this.currentWorkOrder.tipo,
        fechaProgramada: this.currentWorkOrder.fechaProgramada,
        fechaInicio: this.currentWorkOrder.fechaInicio,
        tecnico: this.currentWorkOrder.tecnico,
        estado: this.currentWorkOrder.estado === 'CERRADA' ? 'EN_PROCESO' : this.currentWorkOrder.estado,
        tiempoReparacion: this.currentWorkOrder.tiempoReparacion,
        costo: this.currentWorkOrder.costo,
        causaRaiz: this.currentWorkOrder.causaRaiz,
        observaciones: this.currentWorkOrder.observaciones,
        repuestosUsados: [],
        generaBloqueo: this.currentWorkOrder.generaBloqueo,
        impactoOee: this.currentWorkOrder.impactoOee,
        usuario: '',
      };
      this.closeDraft = {
        fechaCierre: this.currentWorkOrder.fechaCierre || new Date().toISOString().slice(0, 10),
        tiempoReparacion: this.currentWorkOrder.tiempoReparacion,
        costo: this.currentWorkOrder.costo,
        causaRaiz: this.currentWorkOrder.causaRaiz,
        observaciones: this.currentWorkOrder.observaciones,
        repuestosUsados: [],
        estadoEquipoPosterior: 'OPERATIVO',
        usuario: '',
      };
      this.spareDrafts = this.currentWorkOrder.repuestosUsados.map((item) => ({
        codigoRepuesto: item.codigoRepuesto,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        costoUnitario: item.costoUnitario,
      }));
      return;
    }

    this.draft = buildDefaultWorkOrderDraft(this.defaultAssetId ?? undefined);
    this.closeDraft = buildDefaultCloseDraft();
    this.spareDrafts = [];
  }
}

function buildDefaultWorkOrderDraft(equipoId?: string): SaveTpmWorkOrderPayload {
  return {
    equipoId: equipoId ?? '',
    planId: null,
    tipo: 'CORRECTIVO',
    fechaProgramada: new Date().toISOString().slice(0, 10),
    fechaInicio: null,
    tecnico: '',
    estado: 'PROGRAMADA',
    tiempoReparacion: 0,
    costo: 0,
    causaRaiz: null,
    observaciones: null,
    repuestosUsados: [],
    generaBloqueo: false,
    impactoOee: null,
    usuario: '',
  };
}

function buildDefaultCloseDraft(): CloseTpmWorkOrderPayload {
  return {
    fechaCierre: new Date().toISOString().slice(0, 10),
    tiempoReparacion: 0,
    costo: 0,
    causaRaiz: null,
    observaciones: null,
    repuestosUsados: [],
    estadoEquipoPosterior: 'OPERATIVO',
    usuario: '',
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
