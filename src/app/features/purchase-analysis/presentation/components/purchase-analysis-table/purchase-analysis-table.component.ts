import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PurchaseAnalysisAggregate } from '../../../domain/models/purchase-analysis.model';

@Component({
  selector: 'app-purchase-analysis-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Detalle</p>
        <h3 class="erp-section-title">Compras analiticas</h3>
      </div>
      @if (analysis) {
        <div class="erp-table-shell mt-4 overflow-x-auto">
          <table class="erp-data-table min-w-[82rem]">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor total</th>
                <th>Lead time</th>
                <th>Calidad</th>
                <th>Cumplimiento</th>
                <th>Participacion %</th>
                <th>Variacion precio %</th>
                <th>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              @for (detail of analysis.details.slice(0, 30); track detail.id) {
                <tr>
                  <td class="font-semibold text-slate-900">{{ detail.proveedorNombre }}</td>
                  <td>{{ detail.categoria }}</td>
                  <td>{{ detail.tipoAbastecimiento }}</td>
                  <td>{{ detail.valorTotal | number: '1.0-0' }}</td>
                  <td>{{ detail.leadTimeDias }} d</td>
                  <td>{{ detail.calidadScore }}</td>
                  <td>{{ detail.cumplimientoScore }}</td>
                  <td>{{ detail.participacionCategoriaPct }}%</td>
                  <td>{{ detail.variacionPrecioPct }}%</td>
                  <td>{{ detail.riesgoPrincipal || 'Controlado' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[16rem]"><div><p class="text-slate-600">Sin analisis seleccionado.</p></div></div>
      }
    </section>
  `,
})
export class PurchaseAnalysisTableComponent {
  @Input() analysis: PurchaseAnalysisAggregate | null = null;
}
