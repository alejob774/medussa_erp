import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MpsPlan } from '../../../domain/models/mps-plan.model';
import { MpsSimulationLog } from '../../../domain/models/mps-simulation-log.model';

export interface MpsSimulationRequest {
  demandaAjustePct: number;
  capacidadAjustePct: number;
  considerarFEFO: boolean;
  observacion: string | null;
}

@Component({
  selector: 'app-mps-history',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article class="erp-panel space-y-5">
        <div>
          <p class="erp-section-eyebrow">Simulacion simple</p>
          <h3 class="erp-section-title">Escenario rapido del MPS</h3>
          <p class="erp-section-description">
            Ajusta demanda o capacidad de forma controlada para probar sensibilidad antes de aprobar.
          </p>
        </div>

        @if (canSimulate && plan) {
          <div class="grid gap-4 md:grid-cols-2">
            <label class="erp-field">
              <span class="erp-field__label">Ajuste demanda %</span>
              <input class="erp-field__control" type="number" step="1" [(ngModel)]="draft.demandaAjustePct" />
            </label>

            <label class="erp-field">
              <span class="erp-field__label">Ajuste capacidad %</span>
              <input class="erp-field__control" type="number" step="1" [(ngModel)]="draft.capacidadAjustePct" />
            </label>
          </div>

          <label class="erp-detail-card text-sm text-slate-700">
            <div class="flex items-start gap-3">
              <input class="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" [(ngModel)]="draft.considerarFEFO" />
              <div>
                <p class="font-semibold text-slate-900">Mantener criterio FEFO</p>
                <p class="mt-1 text-xs text-slate-500">
                  Conserva la disciplina de vencimientos en la simulacion del periodo.
                </p>
              </div>
            </div>
          </label>

          <label class="erp-field">
            <span class="erp-field__label">Observacion</span>
            <textarea
              class="erp-field__control min-h-24"
              [(ngModel)]="draft.observacion"
              placeholder="Ej. recalculo por pico comercial de fin de semana"
            ></textarea>
          </label>

          <div class="erp-action-strip">
            <button type="button" mat-flat-button color="primary" (click)="simulate.emit(buildPayload())">
              Simular escenario
            </button>
            <span class="erp-chip erp-chip--neutral">
              Preparado para futura conversion a ordenes, sin mover inventario en esta HU.
            </span>
          </div>
        } @else {
          <div class="erp-detail-card text-sm leading-6 text-slate-600">
            El plan oficial esta bloqueado para simulaciones. Genera un nuevo escenario o trabaja sobre un borrador.
          </div>
        }
      </article>

      <article class="erp-panel">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="erp-section-eyebrow">Trazabilidad</p>
            <h3 class="erp-section-title">Historial de simulacion y cambios</h3>
            <p class="erp-section-description">
              Registro simple de generacion, ajustes, simulacion y aprobacion del plan maestro.
            </p>
          </div>

          @if (plan) {
            <span class="erp-chip erp-chip--info">
              Estado: {{ plan.estado }}
            </span>
          }
        </div>

        @if (logs.length) {
          <div class="mt-5 space-y-4">
            @for (item of logs; track item.id) {
              <article class="erp-detail-card">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ item.tipoEvento }}</p>
                    <p class="text-xs text-slate-500">{{ item.usuario }} · {{ item.fecha | date: 'yyyy-MM-dd HH:mm' }}</p>
                  </div>
                </div>

                <p class="mt-3 text-sm leading-6 text-slate-600">{{ item.observacion }}</p>

                @if (item.valorNuevo || item.valorAnterior) {
                  <div class="mt-3 grid gap-3 md:grid-cols-2">
                    <div class="erp-subpanel">
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Antes</p>
                      <pre class="mt-2 whitespace-pre-wrap text-xs text-slate-600">{{ prettyPrint(item.valorAnterior) }}</pre>
                    </div>
                    <div class="erp-subpanel">
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Despues</p>
                      <pre class="mt-2 whitespace-pre-wrap text-xs text-slate-600">{{ prettyPrint(item.valorNuevo) }}</pre>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        } @else {
          <div class="erp-empty-state mt-5 min-h-[16rem]">
            <div>
              <p class="text-slate-600">Todavia no hay trazas registradas para este plan.</p>
            </div>
          </div>
        }
      </article>
    </section>
  `,
})
export class MpsHistoryComponent implements OnChanges {
  @Input() logs: MpsSimulationLog[] = [];
  @Input() plan: MpsPlan | null = null;
  @Input() canSimulate = false;

  @Output() readonly simulate = new EventEmitter<MpsSimulationRequest>();

  draft: MpsSimulationRequest = {
    demandaAjustePct: 0,
    capacidadAjustePct: 0,
    considerarFEFO: true,
    observacion: null,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plan'] && this.plan) {
      this.draft = {
        demandaAjustePct: 0,
        capacidadAjustePct: 0,
        considerarFEFO: this.plan.considerarFEFO,
        observacion: null,
      };
    }
  }

  buildPayload(): MpsSimulationRequest {
    return {
      demandaAjustePct: Number(this.draft.demandaAjustePct) || 0,
      capacidadAjustePct: Number(this.draft.capacidadAjustePct) || 0,
      considerarFEFO: this.draft.considerarFEFO,
      observacion: this.draft.observacion?.trim() || null,
    };
  }

  prettyPrint(value: string | null): string {
    if (!value) {
      return 'Sin dato';
    }

    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
}
