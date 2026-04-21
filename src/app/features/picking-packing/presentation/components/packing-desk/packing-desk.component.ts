import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Packing } from '../../../domain/models/packing.model';
import { PickingDetail } from '../../../domain/models/picking-detail.model';
import { PickingTask } from '../../../domain/models/picking-task.model';

export interface ClosePackingEvent {
  taskId: string;
  tipoEmpaque: Packing['tipoEmpaque'];
  pesoTotal: number;
  volumenTotal: number;
}

@Component({
  selector: 'app-packing-desk',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Packing desk</p>
        <h3 class="erp-section-title">Cierre de empaque y packing list</h3>
        <p class="erp-section-description">
          Recibe pedidos alistados, consolida empaque, cierra la preparacion y deja el despacho listo para salida.
        </p>
      </div>

      <div class="mt-5 space-y-4">
        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-slate-900">Cola lista para packing</p>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (task of readyTasks; track task.id) {
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-medium transition"
                [class.border-sky-300]="task.id === selectedTask?.id"
                [class.bg-sky-50]="task.id === selectedTask?.id"
                [class.border-slate-200]="task.id !== selectedTask?.id"
                (click)="selectTask.emit(task)"
              >
                {{ task.pedidoId }} · {{ task.clienteNombre }}
              </button>
            }
          </div>
        </div>

        @if (selectedTask) {
          <div class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pedido seleccionado</p>
              <h4 class="mt-2 text-xl font-semibold text-slate-900">{{ selectedTask.pedidoId }}</h4>
              <p class="mt-2 text-sm text-slate-600">{{ selectedTask.clienteNombre }} · {{ selectedTask.rutaNombre }}</p>
              <p class="text-sm text-slate-500">
                {{ selectedTask.lineasConfirmadas }}/{{ selectedTask.lineasTotales }} lineas confirmadas
              </p>

              <div class="mt-4 space-y-2">
                @for (detail of details; track detail.id) {
                  <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    {{ detail.sku }} · {{ detail.cantidadConfirmada }} und · {{ detail.lote }}
                  </div>
                }
              </div>

              @if (packing?.packingListResumen?.length) {
                <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p class="text-sm font-semibold text-slate-900">Packing list mock</p>
                  <div class="mt-2 space-y-2">
                    @for (line of packing?.packingListResumen ?? []; track line) {
                      <p class="text-sm text-slate-600">{{ line }}</p>
                    }
                  </div>
                </div>
              }
            </article>

            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Cierre de packing</p>

              @if (isPackingClosedOrReady()) {
                <h4 class="mt-2 text-xl font-semibold text-slate-900">
                  Packing {{ isPackingReady() ? 'listo para despacho' : 'cerrado' }}
                </h4>
                <p class="mt-2 text-sm text-slate-600">
                  {{ packing?.tipoEmpaque }} · {{ packing?.pesoTotal }} kg · {{ packing?.volumenTotal }} m3
                </p>
                <p class="text-sm text-slate-500">
                  {{ packing?.fechaCierre | date: 'dd/MM/yyyy HH:mm' }} · {{ packing?.usuarioCierre }}
                </p>

                @if (packing?.estado === 'CERRADO') {
                  <button type="button" mat-flat-button color="primary" class="mt-4" (click)="emitMarkReady()">
                    Marcar listo para despacho
                  </button>
                }
              } @else {
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <label class="erp-field">
                    <span class="erp-field__label">Tipo empaque</span>
                    <select class="erp-field__control" [(ngModel)]="draft.tipoEmpaque">
                      @for (option of packageTypes; track option.value) {
                        <option [ngValue]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </label>

                  <label class="erp-field">
                    <span class="erp-field__label">Peso total kg</span>
                    <input class="erp-field__control" type="number" min="0" step="0.1" [(ngModel)]="draft.pesoTotal" />
                  </label>

                  <label class="erp-field">
                    <span class="erp-field__label">Volumen m3</span>
                    <input class="erp-field__control" type="number" min="0" step="0.1" [(ngModel)]="draft.volumenTotal" />
                  </label>
                </div>

                <button type="button" mat-flat-button color="primary" class="mt-5" (click)="submitClose()">
                  Cerrar packing
                </button>
              }
            </article>
          </div>
        } @else {
          <div class="erp-empty-state min-h-[18rem]">
            <div>
              <p class="text-slate-600">Selecciona un pedido alistado para trabajar el packing.</p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class PackingDeskComponent implements OnChanges {
  @Input() readyTasks: PickingTask[] = [];
  @Input() selectedTask: PickingTask | null = null;
  @Input() details: PickingDetail[] = [];
  @Input() packing: Packing | null = null;
  @Input() packageTypes: Array<{ value: Packing['tipoEmpaque']; label: string }> = [];

  @Output() readonly selectTask = new EventEmitter<PickingTask>();
  @Output() readonly closePacking = new EventEmitter<ClosePackingEvent>();
  @Output() readonly markReady = new EventEmitter<string>();

  draft: ClosePackingEvent = {
    taskId: '',
    tipoEmpaque: 'Caja',
    pesoTotal: 0,
    volumenTotal: 0,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTask'] || changes['packing']) {
      this.draft = {
        taskId: this.selectedTask?.id ?? '',
        tipoEmpaque: this.packing?.tipoEmpaque ?? this.packageTypes[0]?.value ?? 'Caja',
        pesoTotal: this.packing?.pesoTotal ?? 0,
        volumenTotal: this.packing?.volumenTotal ?? 0,
      };
    }
  }

  submitClose(): void {
    if (!this.selectedTask) {
      return;
    }

    this.closePacking.emit({
      taskId: this.selectedTask.id,
      tipoEmpaque: this.draft.tipoEmpaque,
      pesoTotal: Number(this.draft.pesoTotal),
      volumenTotal: Number(this.draft.volumenTotal),
    });
  }

  isPackingClosedOrReady(): boolean {
    return this.packing?.estado === 'CERRADO' || this.packing?.estado === 'LISTO_PARA_DESPACHO';
  }

  isPackingReady(): boolean {
    return this.packing?.estado === 'LISTO_PARA_DESPACHO';
  }

  emitMarkReady(): void {
    if (!this.packing) {
      return;
    }

    this.markReady.emit(this.packing.id);
  }
}
