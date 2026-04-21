import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TpmKpis } from '../../../domain/models/tpm-kpi.model';

@Component({
  selector: 'app-tpm-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Equipos operativos</p>
        <p class="erp-metric-card__value text-emerald-700">{{ kpis.equiposOperativos }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Equipos bloqueados</p>
        <p class="erp-metric-card__value text-rose-700">{{ kpis.equiposBloqueados }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">OTs abiertas</p>
        <p class="erp-metric-card__value">{{ kpis.otsAbiertas }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Mantenimientos vencidos</p>
        <p class="erp-metric-card__value text-amber-700">{{ kpis.mantenimientosVencidos }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Calibraciones vencidas</p>
        <p class="erp-metric-card__value text-fuchsia-700">{{ kpis.calibracionesVencidas }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Sanitarios pendientes</p>
        <p class="erp-metric-card__value text-cyan-700">{{ kpis.sanitariosPendientes }}</p>
      </article>
    </section>
  `,
})
export class TpmSummaryCardsComponent {
  @Input() kpis: TpmKpis = {
    equiposOperativos: 0,
    equiposBloqueados: 0,
    otsAbiertas: 0,
    mantenimientosVencidos: 0,
    calibracionesVencidas: 0,
    sanitariosPendientes: 0,
  };
}
