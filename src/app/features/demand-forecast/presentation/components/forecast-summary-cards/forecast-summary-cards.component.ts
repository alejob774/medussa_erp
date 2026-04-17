import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandForecastKpis } from '../../../domain/models/demand-forecast.model';

@Component({
  selector: 'app-forecast-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
export class ForecastSummaryCardsComponent {
  @Input({ required: true }) kpis: DemandForecastKpis = {
    totalSkus: 0,
    totalForecast: 0,
    shortageAlerts: 0,
    overstockAlerts: 0,
    adjustedVsSystemPct: 0,
    averageCoverageDays: 0,
  };

  get cards(): Array<{ label: string; value: string; hint: string }> {
    return [
      {
        label: 'SKU pronosticados',
        value: this.kpis.totalSkus.toString(),
        hint: 'Base activa del forecast en la empresa actual.',
      },
      {
        label: 'Forecast total',
        value: new Intl.NumberFormat('es-CO').format(this.kpis.totalForecast),
        hint: 'Demanda consolidada del periodo filtrado.',
      },
      {
        label: 'Riesgo de faltante',
        value: this.kpis.shortageAlerts.toString(),
        hint: 'Alertas que comprometen despacho o produccion.',
      },
      {
        label: 'Riesgo de sobrestock',
        value: this.kpis.overstockAlerts.toString(),
        hint: 'Cobertura por encima del nivel objetivo.',
      },
      {
        label: 'Ajuste vs sistema',
        value: `${this.kpis.adjustedVsSystemPct}%`,
        hint: 'Impacto comercial sobre el forecast del sistema.',
      },
      {
        label: 'Cobertura promedio',
        value: `${this.kpis.averageCoverageDays} d`,
        hint: 'Dias promedio cubiertos con inventario actual.',
      },
    ];
  }
}
