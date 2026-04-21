import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MpsPlanDetail } from '../../../domain/models/mps-plan-detail.model';
import { MpsPlanStatus } from '../../../domain/models/mps-plan.model';
import { MpsCatalogs } from '../../../domain/models/mps-response.model';

export interface MpsDetailUpdateRequest {
  detailId: string;
  cantidadPlanificada: number;
  fechaProduccion: string;
  lineaProduccion: string;
  observacion: string | null;
}

interface MpsDetailDraft {
  cantidadPlanificada: number;
  fechaProduccion: string;
  lineaProduccion: string;
  observacion: string;
}

@Component({
  selector: 'app-mps-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Grilla editable</p>
          <h3 class="erp-section-title">Plan semanal por SKU y linea</h3>
          <p class="erp-section-description">
            Ajusta cantidades, fecha de corrida y linea antes de aprobar el plan oficial.
          </p>
        </div>

        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ details.length }} SKU visibles
        </span>
      </div>

      @if (details.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[110rem]">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Cobertura</th>
                <th>Fecha produccion</th>
                <th>Linea</th>
                <th>Cantidad planificada</th>
                <th>Horas</th>
                <th>Prioridad</th>
                <th>Riesgos</th>
                <th>Ajuste</th>
              </tr>
            </thead>
            <tbody>
              @for (detail of details; track detail.id) {
                <tr [class.bg-slate-50]="!detail.capacidadDisponible || detail.requiereCompra">
                  <td>
                    <p class="font-semibold text-slate-900">{{ detail.sku }}</p>
                    <p class="text-xs text-slate-500">{{ detail.productoNombre }}</p>
                    <p class="mt-1 text-xs text-slate-400">BOM {{ detail.bomVersion || 'sin vigente' }}</p>
                  </td>
                  <td>
                    <p class="text-sm font-semibold text-slate-900">
                      Inv. {{ detail.inventarioDisponible | number: '1.0-0' }}
                    </p>
                    <p class="text-xs text-slate-500">Demanda {{ detail.demandaBase | number: '1.0-0' }}</p>
                    <p class="text-xs text-slate-500">Urgentes {{ detail.pedidosUrgentes | number: '1.0-0' }}</p>
                    <p class="text-xs text-slate-500">Stock seg. {{ detail.stockSeguridad | number: '1.0-0' }}</p>
                  </td>
                  <td>
                    @if (canEdit(detail)) {
                      <input
                        class="erp-field__control min-w-36"
                        type="date"
                        [(ngModel)]="drafts[detail.id].fechaProduccion"
                      />
                    } @else {
                      <span>{{ detail.fechaProduccion | date: 'dd/MM/yyyy' }}</span>
                    }
                  </td>
                  <td>
                    @if (canEdit(detail)) {
                      <select class="erp-field__control min-w-44" [(ngModel)]="drafts[detail.id].lineaProduccion">
                        @for (option of catalogs.lines; track option.value) {
                          <option [ngValue]="option.value">{{ option.label }}</option>
                        }
                      </select>
                    } @else {
                      <div>
                        <p>{{ detail.lineaProduccion }}</p>
                        <p class="text-xs text-slate-500">
                          {{ detail.capacidadHorasDisponibles | number: '1.0-1' }} h disponibles
                        </p>
                      </div>
                    }
                  </td>
                  <td>
                    @if (canEdit(detail)) {
                      <input
                        class="erp-field__control min-w-32"
                        type="number"
                        min="0"
                        step="1"
                        [(ngModel)]="drafts[detail.id].cantidadPlanificada"
                      />
                    } @else {
                      <div>
                        <p class="font-semibold text-slate-900">{{ detail.cantidadPlanificada | number: '1.0-0' }}</p>
                        <p class="text-xs text-slate-500">editable: {{ detail.editable ? 'si' : 'no' }}</p>
                      </div>
                    }
                  </td>
                  <td>
                    <p class="font-semibold text-slate-900">{{ detail.horasRequeridas | number: '1.1-1' }} h</p>
                    <p class="text-xs text-slate-500">
                      cap. {{ detail.capacidadHorasDisponibles | number: '1.1-1' }} h
                    </p>
                  </td>
                  <td>
                    <span class="erp-chip" [ngClass]="priorityClass(detail.prioridad)">{{ detail.prioridad }}</span>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-2">
                      @if (detail.riesgoFaltante) {
                        <span class="erp-chip erp-chip--warning">Faltante</span>
                      }
                      @if (detail.riesgoVencimiento) {
                        <span class="erp-chip erp-chip--danger">FEFO / vencimiento</span>
                      }
                      @if (detail.requiereCompra) {
                        <span class="erp-chip erp-chip--info">Compra requerida</span>
                      }
                      @if (!detail.capacidadDisponible) {
                        <span class="erp-chip erp-chip--danger">Linea saturada</span>
                      }
                      @if (detail.materialDisponible && detail.capacidadDisponible && !detail.riesgoVencimiento) {
                        <span class="erp-chip erp-chip--success">Cobertura estable</span>
                      }
                    </div>
                  </td>
                  <td>
                    @if (canEdit(detail)) {
                      <div class="space-y-3">
                        <input
                          class="erp-field__control min-w-48"
                          type="text"
                          [(ngModel)]="drafts[detail.id].observacion"
                          placeholder="Motivo del ajuste"
                        />
                        <button type="button" mat-stroked-button (click)="submit(detail.id)">
                          Guardar ajuste
                        </button>
                      </div>
                    } @else {
                      <span class="text-sm text-slate-500">Plan bloqueado para cambios.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[18rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">No hay detalle para el plan actual</p>
            <p class="mt-2 text-slate-600">
              Genera un nuevo plan o amplía filtros para ver SKU planificados por linea.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class MpsGridComponent implements OnChanges {
  @Input() details: MpsPlanDetail[] = [];
  @Input() planStatus: MpsPlanStatus | null = null;
  @Input() catalogs: MpsCatalogs = EMPTY_CATALOGS;

  @Output() readonly save = new EventEmitter<MpsDetailUpdateRequest>();

  drafts: Record<string, MpsDetailDraft> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['details']) {
      this.drafts = this.details.reduce<Record<string, MpsDetailDraft>>((accumulator, detail) => {
        accumulator[detail.id] = {
          cantidadPlanificada: detail.cantidadPlanificada,
          fechaProduccion: detail.fechaProduccion,
          lineaProduccion: detail.lineaProduccion,
          observacion: '',
        };
        return accumulator;
      }, {});
    }
  }

  canEdit(detail: MpsPlanDetail): boolean {
    return detail.editable && this.planStatus !== 'APROBADO' && this.planStatus !== 'OBSOLETO';
  }

  submit(detailId: string): void {
    const draft = this.drafts[detailId];

    if (!draft) {
      return;
    }

    this.save.emit({
      detailId,
      cantidadPlanificada: Math.max(0, Number(draft.cantidadPlanificada) || 0),
      fechaProduccion: draft.fechaProduccion,
      lineaProduccion: draft.lineaProduccion,
      observacion: draft.observacion.trim() || null,
    });
  }

  priorityClass(priority: MpsPlanDetail['prioridad']): string {
    if (priority === 'ALTA') {
      return 'erp-chip--danger';
    }

    if (priority === 'MEDIA') {
      return 'erp-chip--warning';
    }

    return 'erp-chip--neutral';
  }
}

const EMPTY_CATALOGS: MpsCatalogs = {
  plants: [],
  families: [],
  skus: [],
  lines: [],
  severities: [],
};
