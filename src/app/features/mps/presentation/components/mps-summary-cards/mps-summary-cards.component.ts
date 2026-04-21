import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MpsPlan, MpsPlanSummary } from '../../../domain/models/mps-plan.model';

@Component({
  selector: 'app-mps-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Resumen operativo</p>
          <h3 class="erp-section-title">KPIs del plan seleccionado</h3>
          <p class="erp-section-description">
            Vista corta del volumen a producir, saturacion de lineas, faltantes y compras requeridas.
          </p>
        </div>

        @if (plan) {
          <div class="flex flex-wrap items-center gap-3">
            <span class="erp-status-chip" [class]="statusClass(plan.estado)">{{ plan.estado }}</span>
            <span class="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
              {{ plan.fechaInicio | date: 'dd/MM' }} - {{ plan.fechaFin | date: 'dd/MM' }}
            </span>
          </div>
        }
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">SKU planificados</p>
          <p class="erp-metric-card__value">{{ summary.skuPlanificados }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Total a producir</p>
          <p class="erp-metric-card__value">{{ summary.totalAProducir | number: '1.0-0' }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Lineas saturadas</p>
          <p class="erp-metric-card__value text-amber-700">{{ summary.lineasSaturadas }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Alertas criticas</p>
          <p class="erp-metric-card__value text-rose-700">{{ summary.alertasCriticas }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Riesgo de faltante</p>
          <p class="erp-metric-card__value text-sky-700">{{ summary.riesgoFaltante }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Compras requeridas</p>
          <p class="erp-metric-card__value text-fuchsia-700">{{ summary.comprasRequeridas }}</p>
        </article>
      </div>
    </section>
  `,
})
export class MpsSummaryCardsComponent {
  @Input() summary: MpsPlanSummary = EMPTY_SUMMARY;
  @Input() plan: MpsPlan | null = null;

  statusClass(status: MpsPlan['estado']): string {
    if (status === 'APROBADO') {
      return 'erp-status-chip--success';
    }

    if (status === 'AJUSTADO') {
      return 'erp-status-chip--warning';
    }

    if (status === 'GENERADO') {
      return 'erp-status-chip--info';
    }

    return 'erp-status-chip--muted';
  }
}

const EMPTY_SUMMARY: MpsPlanSummary = {
  skuPlanificados: 0,
  totalAProducir: 0,
  lineasSaturadas: 0,
  alertasCriticas: 0,
  riesgoFaltante: 0,
  comprasRequeridas: 0,
};
