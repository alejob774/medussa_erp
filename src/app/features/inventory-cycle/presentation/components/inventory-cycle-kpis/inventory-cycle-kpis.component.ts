import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InventoryCycleKpis } from '../../../domain/models/inventory-cycle-kpi.model';

@Component({
  selector: 'app-inventory-cycle-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Conteos del periodo</p>
        <p class="erp-metric-card__value">{{ kpis.totalCounts }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Exactitud promedio</p>
        <p class="erp-metric-card__value">{{ kpis.averageAccuracyPct }}%</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Diferencias criticas</p>
        <p class="erp-metric-card__value text-amber-700">{{ kpis.criticalDifferences }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Ajustes pendientes</p>
        <p class="erp-metric-card__value text-rose-700">{{ kpis.pendingAdjustments }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Ubicaciones recurrentes</p>
        <p class="erp-metric-card__value">{{ kpis.recurrentLocations }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">SKU recurrentes</p>
        <p class="erp-metric-card__value">{{ kpis.recurrentSkus }}</p>
      </article>
    </section>
  `,
})
export class InventoryCycleKpisComponent {
  @Input() kpis: InventoryCycleKpis = {
    totalCounts: 0,
    averageAccuracyPct: 0,
    criticalDifferences: 0,
    pendingAdjustments: 0,
    recurrentLocations: 0,
    recurrentSkus: 0,
  };
}
