import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PickingPackingKpis } from '../../../domain/models/picking-packing-kpi.model';

@Component({
  selector: 'app-picking-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Pedidos pendientes</p>
        <p class="erp-metric-card__value">{{ kpis.pendingOrders }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Pedidos alistados</p>
        <p class="erp-metric-card__value text-emerald-700">{{ kpis.readyOrders }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Con faltante</p>
        <p class="erp-metric-card__value text-amber-700">{{ kpis.shortageOrders }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">OTIF preparacion</p>
        <p class="erp-metric-card__value">{{ kpis.otifPreparationPct }}%</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Operario mas productivo</p>
        <p class="erp-metric-card__value text-lg">{{ kpis.topOperatorName }}</p>
        <p class="mt-2 text-sm text-slate-500">{{ kpis.topOperatorLinesPerHour }} lineas/hora</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Tiempo promedio</p>
        <p class="erp-metric-card__value">{{ kpis.averagePreparationMinutes }} min</p>
      </article>
    </section>
  `,
})
export class PickingKpisComponent {
  @Input() kpis: PickingPackingKpis = {
    pendingOrders: 0,
    readyOrders: 0,
    shortageOrders: 0,
    otifPreparationPct: 0,
    topOperatorName: 'Sin datos',
    topOperatorLinesPerHour: 0,
    averagePreparationMinutes: 0,
  };
}
