import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAnalysisKpis } from '../../../domain/models/demand-analysis-kpi.model';

@Component({
  selector: 'app-demand-analysis-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
      @for (card of cards; track card.label) {
        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">{{ card.label }}</p>
          <p class="erp-kpi-card__value">{{ card.value }}</p>
          <p class="erp-kpi-card__hint">{{ card.hint }}</p>
        </article>
      }
    </section>
  `,
})
export class DemandAnalysisKpisComponent {
  @Input({ required: true }) kpis: DemandAnalysisKpis = {
    averageMape: 0,
    averageBias: 0,
    growingSkus: 0,
    decliningSkus: 0,
    activeAlerts: 0,
    totalForecast: 0,
    totalActual: 0,
  };

  get cards(): Array<{ label: string; value: string; hint: string }> {
    return [
      { label: 'MAPE promedio', value: `${this.kpis.averageMape}%`, hint: 'Error absoluto medio del forecast.' },
      { label: 'Sesgo promedio', value: `${this.kpis.averageBias}`, hint: 'Direccion neta del desvio forecast vs real.' },
      { label: 'SKU en crecimiento', value: `${this.kpis.growingSkus}`, hint: 'SKU sobre el forecast esperado.' },
      { label: 'SKU en caida', value: `${this.kpis.decliningSkus}`, hint: 'SKU por debajo del forecast.' },
      { label: 'Alertas activas', value: `${this.kpis.activeAlerts}`, hint: 'Desviaciones y variabilidad activa.' },
      { label: 'Forecast total', value: new Intl.NumberFormat('es-CO').format(this.kpis.totalForecast), hint: 'Base aprobada de planeacion.' },
      { label: 'Venta real total', value: new Intl.NumberFormat('es-CO').format(this.kpis.totalActual), hint: 'Venta real mock derivada del forecast.' },
    ];
  }
}
