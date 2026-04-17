import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DemandForecastAggregate } from '../../../domain/models/demand-forecast.model';

@Component({
  selector: 'app-forecast-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Detalle</p>
          <h3 class="erp-section-title">Resumen por SKU y periodo</h3>
          <p class="erp-section-description">
            Forecast del sistema, ajuste comercial, inventario, stock de seguridad y cobertura.
          </p>
        </div>
        @if (forecast) {
          <button type="button" class="erp-chip erp-chip--neutral" (click)="refresh.emit()">
            Refrescar vista
          </button>
        }
      </div>

      @if (forecast) {
        <div class="erp-table-shell mt-4 overflow-x-auto">
          <table class="erp-data-table min-w-[78rem]">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Periodo</th>
                <th>Zona</th>
                <th>Canal</th>
                <th>Historico</th>
                <th>Sistema</th>
                <th>Ajuste</th>
                <th>Final</th>
                <th>Inv.</th>
                <th>Seguridad</th>
                <th>Cobertura</th>
                <th>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              @for (detail of forecast.details.slice(0, 30); track detail.id) {
                <tr>
                  <td class="font-semibold text-slate-900">{{ detail.sku }}</td>
                  <td>{{ detail.productoNombre }}</td>
                  <td>{{ detail.periodo }}</td>
                  <td>{{ detail.zona }}</td>
                  <td>{{ detail.canal }}</td>
                  <td>{{ detail.demandaHistorica }}</td>
                  <td>{{ detail.forecastSistema }}</td>
                  <td [class.text-emerald-700]="detail.ajusteManual > 0" [class.text-rose-700]="detail.ajusteManual < 0">
                    {{ detail.ajusteManual }}
                  </td>
                  <td class="font-semibold text-slate-900">{{ detail.forecastFinal }}</td>
                  <td>{{ detail.inventarioActual }}</td>
                  <td>{{ detail.stockSeguridad }}</td>
                  <td>{{ detail.coberturaDias }} d</td>
                  <td>
                    @if (detail.riesgoFaltante) {
                      <span class="erp-chip erp-chip--warning">Faltante</span>
                    } @else if (detail.riesgoSobrestock) {
                      <span class="erp-chip erp-chip--info">Sobrestock</span>
                    } @else {
                      <span class="erp-chip erp-chip--success">Controlado</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[18rem]">
          <div>
            <span class="material-symbols-outlined text-4xl text-slate-300">query_stats</span>
            <p class="mt-3 text-base font-semibold text-slate-700">Sin forecast seleccionado</p>
            <p class="mt-1 text-sm text-slate-500">
              Genera o selecciona una version para revisar su detalle operativo.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class ForecastTableComponent {
  @Input() forecast: DemandForecastAggregate | null = null;
  @Output() readonly refresh = new EventEmitter<void>();
}
