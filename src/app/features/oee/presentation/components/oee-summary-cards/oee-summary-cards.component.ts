import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { OeeKpis } from '../../../domain/models/oee-kpi.model';

@Component({
  selector: 'app-oee-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Registros del periodo</p>
        <p class="erp-metric-card__value">{{ kpis.registrosPeriodo }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">OEE promedio</p>
        <p class="erp-metric-card__value text-slate-900">{{ kpis.oeePromedio | percent: '1.0-1' }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Disponibilidad promedio</p>
        <p class="erp-metric-card__value text-cyan-700">{{ kpis.disponibilidadPromedio | percent: '1.0-1' }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Rendimiento promedio</p>
        <p class="erp-metric-card__value text-amber-700">{{ kpis.rendimientoPromedio | percent: '1.0-1' }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Calidad promedio</p>
        <p class="erp-metric-card__value text-emerald-700">{{ kpis.calidadPromedio | percent: '1.0-1' }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Maquinas bajo meta</p>
        <p class="erp-metric-card__value text-rose-700">{{ kpis.maquinasBajoMeta }}</p>
      </article>
    </section>
  `,
})
export class OeeSummaryCardsComponent {
  @Input() kpis: OeeKpis = {
    registrosPeriodo: 0,
    oeePromedio: 0,
    disponibilidadPromedio: 0,
    rendimientoPromedio: 0,
    calidadPromedio: 0,
    maquinasBajoMeta: 0,
  };
}
