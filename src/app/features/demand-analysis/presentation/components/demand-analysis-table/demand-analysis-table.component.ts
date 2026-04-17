import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAnalysisAggregate } from '../../../domain/models/demand-analysis.model';

@Component({
  selector: 'app-demand-analysis-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Detalle analitico</p>
        <h3 class="erp-section-title">Forecast vs venta real mock</h3>
      </div>

      @if (analysis) {
        <div class="erp-table-shell mt-4 overflow-x-auto">
          <table class="erp-data-table min-w-[82rem]">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Zona</th>
                <th>Canal</th>
                <th>Forecast</th>
                <th>Real</th>
                <th>Desv. %</th>
                <th>MAPE</th>
                <th>Tendencia</th>
                <th>Valor venta</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              @for (detail of analysis.details.slice(0, 32); track detail.id) {
                <tr>
                  <td class="font-semibold text-slate-900">{{ detail.sku }}</td>
                  <td>{{ detail.productoNombre }}</td>
                  <td>{{ detail.zona }}</td>
                  <td>{{ detail.canal }}</td>
                  <td>{{ detail.forecast }}</td>
                  <td>{{ detail.ventaReal }}</td>
                  <td>{{ detail.desviacionPct }}%</td>
                  <td>{{ detail.mape }}%</td>
                  <td>
                    <span class="erp-chip" [ngClass]="trendClass(detail.tendencia)">{{ detail.tendencia }}</span>
                  </td>
                  <td>{{ detail.valorVenta | number: '1.0-0' }}</td>
                  <td>{{ detail.alertaPrincipal || 'Sin alerta' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[18rem]">
          <div>
            <span class="material-symbols-outlined text-4xl text-slate-300">analytics</span>
            <p class="mt-3 text-base font-semibold text-slate-700">Sin analisis seleccionado</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class DemandAnalysisTableComponent {
  @Input() analysis: DemandAnalysisAggregate | null = null;

  trendClass(trend: string): string {
    if (trend === 'CRECE') return 'erp-chip--success';
    if (trend === 'CAE') return 'erp-chip--warning';
    return 'erp-chip--neutral';
  }
}
