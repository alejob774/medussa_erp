import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TpmWorkOrder } from '../../../domain/models/tpm-work-order.model';

@Component({
  selector: 'app-tpm-work-orders',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Ordenes de trabajo</p>
          <h3 class="erp-section-title">Bandeja TPM</h3>
          <p class="erp-section-description">
            Programa, ejecuta y cierra OTs preventivas, correctivas, predictivas, sanitarias y de calibracion.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ workOrders.length }} OTs
        </span>
      </div>

      @if (workOrders.length) {
        <div class="mt-5 erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[96rem]">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha programada</th>
                <th>Tecnico</th>
                <th>Estado</th>
                <th>Horas</th>
                <th>Costo</th>
                <th>Bloqueo</th>
                <th>Impacto OEE</th>
                <th>Repuestos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of workOrders; track item.id) {
                <tr>
                  <td>{{ item.tipo }}</td>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.fechaProgramada }}</p>
                    <p class="text-xs text-slate-500">{{ item.fechaInicio || 'Sin inicio' }}</p>
                  </td>
                  <td>{{ item.tecnico }}</td>
                  <td>
                    <span class="erp-status-chip" [class]="stateClass(item.estado)">
                      {{ item.estado }}
                    </span>
                  </td>
                  <td>{{ item.tiempoReparacion }}</td>
                  <td>{{ item.costo | currency: 'COP':'symbol':'1.0-0' }}</td>
                  <td>{{ item.generaBloqueo ? 'Si' : 'No' }}</td>
                  <td>{{ item.impactoOee || 'Sin impacto' }}</td>
                  <td>{{ item.repuestosUsados.length }}</td>
                  <td>
                    <button
                      type="button"
                      mat-stroked-button
                      [color]="selectedWorkOrderId === item.id ? 'primary' : undefined"
                      (click)="select.emit(item)"
                    >
                      {{ selectedWorkOrderId === item.id ? 'Seleccionada' : 'Ver OT' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[18rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Sin OTs para los filtros actuales</p>
            <p class="mt-2 text-slate-600">
              Configura un plan o registra un correctivo para empezar la trazabilidad tecnica.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class TpmWorkOrdersComponent {
  @Input() workOrders: TpmWorkOrder[] = [];
  @Input() selectedWorkOrderId: string | null = null;

  @Output() readonly select = new EventEmitter<TpmWorkOrder>();

  stateClass(state: TpmWorkOrder['estado']): string {
    if (state === 'CERRADA') {
      return 'erp-status-chip--success';
    }

    if (state === 'PROGRAMADA') {
      return 'erp-status-chip--muted';
    }

    if (state === 'EN_PROCESO') {
      return 'erp-status-chip--warning';
    }

    if (state === 'VENCIDA') {
      return 'erp-status-chip--danger';
    }

    return 'erp-status-chip--muted';
  }
}
