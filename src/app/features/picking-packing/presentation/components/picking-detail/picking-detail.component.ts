import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { PickingDetail } from '../../../domain/models/picking-detail.model';
import { PickingTask } from '../../../domain/models/picking-task.model';

export interface PickingLineSubmitEvent {
  detail: PickingDetail;
  cantidadConfirmada: number;
  observacion: string | null;
}

@Component({
  selector: 'app-picking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel h-full">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Picking guiado</p>
          <h3 class="erp-section-title">Detalle operativo del pedido</h3>
          <p class="erp-section-description">
            Guias la toma por ubicacion, validas stock por lote y cierras el alistamiento sin salir del tablero.
          </p>
        </div>
      </div>

      @if (task) {
        <div class="mt-5 space-y-4">
          <div class="erp-subpanel">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pedido</p>
                <p class="mt-1 text-xl font-semibold text-slate-900">{{ task.pedidoId }}</p>
                <p class="mt-2 text-sm text-slate-600">{{ task.clienteNombre }} · {{ task.rutaNombre }}</p>
                <p class="text-sm text-slate-500">
                  {{ task.zona }} · {{ task.conductorNombre || 'Ruta sin conductor asignado' }}
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <article class="erp-meta-card">
                  <p class="erp-meta-card__label">Compromiso</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900">
                    {{ task.fechaCompromiso | date: 'dd/MM HH:mm' }}
                  </p>
                  <p class="erp-meta-card__hint">Prioridad {{ task.prioridad.toLowerCase() }}.</p>
                </article>
                <article class="erp-meta-card">
                  <p class="erp-meta-card__label">Avance</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900">
                    {{ task.lineasConfirmadas }}/{{ task.lineasTotales }}
                  </p>
                  <p class="erp-meta-card__hint">
                    {{ task.lineasConFaltante }} linea(s) con novedad.
                  </p>
                </article>
              </div>
            </div>
          </div>

          <div class="erp-action-strip">
            @if (task.estado === 'PENDIENTE') {
              <div class="erp-subpanel flex flex-wrap items-end gap-3">
                <label class="erp-field min-w-56">
                  <span class="erp-field__label">Operario</span>
                  <select class="erp-field__control" [(ngModel)]="operatorDraft">
                    @for (operator of operators; track operator.value) {
                      <option [ngValue]="operator.value">{{ operator.label }}</option>
                    }
                  </select>
                </label>
                <button type="button" mat-flat-button color="primary" (click)="startPicking.emit(operatorDraft)">
                  Iniciar picking
                </button>
              </div>
            }

            @if (task.estado !== 'PENDIENTE' && task.estado !== 'ALISTADO' && task.estado !== 'CERRADO') {
              <button type="button" mat-stroked-button (click)="closePicking.emit()">
                Cerrar alistamiento
              </button>
            }
          </div>

          <div class="space-y-4">
            @for (detail of details; track detail.id) {
              <article class="erp-detail-card">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-base font-semibold text-slate-900">{{ detail.sku }} · {{ detail.productoNombre }}</p>
                    <p class="mt-1 text-sm text-slate-600">
                      Ubicacion {{ detail.ubicacionCodigo }} · Lote {{ detail.lote }}
                    </p>
                    <p class="text-sm text-slate-500">
                      Solicitado {{ detail.cantidadSolicitada }} · Disponible {{ detail.stockDisponible }}
                    </p>
                  </div>
                  <span class="erp-chip" [ngClass]="detailClass(detail.estado)">
                    {{ detail.estado }}
                  </span>
                </div>

                @if (detail.estado === 'BLOQUEADO') {
                  <div class="erp-alert erp-alert--warning mt-4">
                    La ubicacion esta bloqueada o en cuarentena. Solo se permite registrar faltante.
                  </div>
                }

                <div class="mt-4 grid gap-4 lg:grid-cols-[8rem_1fr_auto_auto]">
                  <label class="erp-field">
                    <span class="erp-field__label">Confirmado</span>
                    <input
                      class="erp-field__control"
                      type="number"
                      min="0"
                      [max]="detail.stockDisponible"
                      [(ngModel)]="lineDrafts[detail.id].cantidadConfirmada"
                      [disabled]="task.estado === 'ALISTADO' || task.estado === 'CERRADO'"
                    />
                  </label>

                  <label class="erp-field">
                    <span class="erp-field__label">Observacion</span>
                    <input
                      class="erp-field__control"
                      type="text"
                      [(ngModel)]="lineDrafts[detail.id].observacion"
                      [disabled]="task.estado === 'ALISTADO' || task.estado === 'CERRADO'"
                    />
                  </label>

                  @if (task.estado !== 'PENDIENTE' && task.estado !== 'ALISTADO' && task.estado !== 'CERRADO') {
                    <button type="button" mat-stroked-button (click)="useMax(detail)">
                      Max disponible
                    </button>
                    <button type="button" mat-flat-button color="primary" (click)="submitLine(detail)">
                      Confirmar
                    </button>
                  }
                </div>

                @if (detail.observacion) {
                  <p class="mt-3 text-sm text-slate-500">{{ detail.observacion }}</p>
                }
              </article>
            }
          </div>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[22rem]">
          <div>
            <p class="text-slate-600">Selecciona una tarea de la bandeja para ejecutar el picking guiado.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class PickingDetailComponent implements OnChanges {
  @Input() task: PickingTask | null = null;
  @Input() details: PickingDetail[] = [];
  @Input() operators: Array<{ value: string; label: string }> = [];

  @Output() readonly startPicking = new EventEmitter<string>();
  @Output() readonly confirmLine = new EventEmitter<PickingLineSubmitEvent>();
  @Output() readonly closePicking = new EventEmitter<void>();

  operatorDraft = '';
  lineDrafts: Record<string, { cantidadConfirmada: number; observacion: string }> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.operatorDraft = this.task?.operarioNombre ?? this.operators[0]?.value ?? '';
    }

    if (changes['details']) {
      this.lineDrafts = this.details.reduce<Record<string, { cantidadConfirmada: number; observacion: string }>>(
        (acc, detail) => {
          acc[detail.id] = {
            cantidadConfirmada: detail.cantidadConfirmada,
            observacion: detail.observacion ?? '',
          };
          return acc;
        },
        {},
      );
    }
  }

  useMax(detail: PickingDetail): void {
    const max = Math.min(detail.cantidadSolicitada, detail.stockDisponible);
    this.lineDrafts[detail.id] = {
      cantidadConfirmada: max,
      observacion:
        max < detail.cantidadSolicitada
          ? `Faltante automatico: solo hay ${detail.stockDisponible} unidades disponibles.`
          : this.lineDrafts[detail.id]?.observacion ?? '',
    };
    this.submitLine(detail);
  }

  submitLine(detail: PickingDetail): void {
    const draft = this.lineDrafts[detail.id];

    this.confirmLine.emit({
      detail,
      cantidadConfirmada: Number(draft?.cantidadConfirmada ?? 0),
      observacion: draft?.observacion?.trim() || null,
    });
  }

  detailClass(state: PickingDetail['estado']): string {
    if (state === 'CONFIRMADO') {
      return 'erp-chip--success';
    }

    if (state === 'FALTANTE') {
      return 'erp-chip--warning';
    }

    if (state === 'BLOQUEADO') {
      return 'erp-chip--info';
    }

    return 'erp-chip--neutral';
  }
}
