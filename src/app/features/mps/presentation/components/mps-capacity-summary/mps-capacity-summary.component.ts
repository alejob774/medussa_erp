import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MpsCapacitySummary } from '../../../domain/models/production-line.model';

@Component({
  selector: 'app-mps-capacity-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Capacidad por linea</p>
        <h3 class="erp-section-title">Carga de planta</h3>
        <p class="erp-section-description">
          Contrasta horas planificadas vs capacidad disponible para identificar saturaciones antes de aprobar.
        </p>
      </div>

      @if (summary.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[52rem]">
            <thead>
              <tr>
                <th>Linea</th>
                <th>Planta</th>
                <th>Horas planificadas</th>
                <th>Horas disponibles</th>
                <th>Saturacion</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (item of summary; track item.lineaId) {
                <tr [class.bg-amber-50]="item.saturada">
                  <td class="font-semibold text-slate-900">{{ item.lineaProduccion }}</td>
                  <td>{{ item.planta }}</td>
                  <td>{{ item.horasPlanificadas | number: '1.1-1' }} h</td>
                  <td>{{ item.capacidadHorasDisponibles | number: '1.1-1' }} h</td>
                  <td>{{ item.saturacionPct }}%</td>
                  <td>
                    <span class="erp-status-chip" [class]="item.saturada ? 'erp-status-chip--warning' : 'erp-status-chip--success'">
                      {{ item.saturada ? 'Saturada' : 'Disponible' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[14rem]">
          <div>
            <p class="text-slate-600">No hay lineas calculadas para el plan actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class MpsCapacitySummaryComponent {
  @Input() summary: MpsCapacitySummary[] = [];
}
