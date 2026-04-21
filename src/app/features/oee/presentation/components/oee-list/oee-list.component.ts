import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { OeeRecordAggregate } from '../../../domain/models/oee-response.model';

@Component({
  selector: 'app-oee-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Bandeja de planta</p>
          <h3 class="erp-section-title">Registros OEE por linea y turno</h3>
          <p class="erp-section-description">
            Consulta la captura operativa diaria, el impacto de paradas y el resultado automatico del OEE.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ records.length }} registros
        </span>
      </div>

      @if (records.length) {
        <div class="mt-5 erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[104rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Planta / linea</th>
                <th>Maquina</th>
                <th>Turno</th>
                <th>Operario</th>
                <th>OP mock</th>
                <th>Paro</th>
                <th>Producido / objetivo</th>
                <th>Rechazo</th>
                <th>Disp.</th>
                <th>Rend.</th>
                <th>Calidad</th>
                <th>OEE</th>
                <th>Alertas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of records; track item.record.id) {
                <tr>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.record.fechaOperacion }}</p>
                    <p class="text-xs text-slate-500">{{ item.record.horaInicio }} - {{ item.record.horaFin }}</p>
                  </td>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.record.planta }}</p>
                    <p class="text-xs text-slate-500">{{ item.record.lineaProduccion }}</p>
                  </td>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.record.maquinaNombre }}</p>
                    <p class="text-xs text-slate-500">{{ item.record.maquinaCodigo }}</p>
                  </td>
                  <td>{{ labelShift(item.record.turno) }}</td>
                  <td>
                    <p>{{ item.record.operario }}</p>
                    <p class="text-xs text-slate-500">{{ item.record.supervisor }}</p>
                  </td>
                  <td>{{ item.record.ordenProduccion || 'Sin OP' }}</td>
                  <td>
                    <p>{{ item.record.tiempoParado }} min</p>
                    <p class="text-xs text-slate-500">{{ item.record.causaParo || 'Sin paro reportado' }}</p>
                  </td>
                  <td>{{ item.record.unidadesProducidas }} / {{ item.record.unidadesObjetivo }}</td>
                  <td>{{ item.record.unidadesRechazadas }}</td>
                  <td>{{ item.record.disponibilidad | percent: '1.0-1' }}</td>
                  <td>{{ item.record.rendimiento | percent: '1.0-1' }}</td>
                  <td>{{ item.record.calidad | percent: '1.0-1' }}</td>
                  <td>
                    <span class="erp-status-chip" [class]="oeeClass(item.record.oee)">
                      {{ item.record.oee | percent: '1.0-1' }}
                    </span>
                  </td>
                  <td>{{ item.alerts.length }}</td>
                  <td>
                    <button
                      type="button"
                      mat-stroked-button
                      [color]="item.record.id === selectedRecordId ? 'primary' : undefined"
                      (click)="select.emit(item)"
                    >
                      {{ item.record.id === selectedRecordId ? 'Seleccionado' : 'Ver detalle' }}
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
            <p class="text-lg font-semibold text-slate-900">Todavia no hay registros OEE visibles</p>
            <p class="mt-2 text-slate-600">
              Captura el primer turno operativo para empezar el historico de desempeno de planta.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class OeeListComponent {
  @Input() records: OeeRecordAggregate[] = [];
  @Input() selectedRecordId: string | null = null;

  @Output() readonly select = new EventEmitter<OeeRecordAggregate>();

  labelShift(value: string): string {
    return value === 'MANANA' ? 'Manana' : value === 'TARDE' ? 'Tarde' : 'Noche';
  }

  oeeClass(oee: number): string {
    if (oee < 0.65) {
      return 'erp-status-chip--danger';
    }

    if (oee < 0.85) {
      return 'erp-status-chip--warning';
    }

    return 'erp-status-chip--success';
  }
}
