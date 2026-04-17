import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAlert } from '../../../domain/models/demand-alert.model';

@Component({
  selector: 'app-forecast-alerts-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Alertas</p>
          <h3 class="erp-section-title">Dashboard de riesgo</h3>
          <p class="erp-section-description">
            Faltantes, sobrestock, baja confianza y ajustes relevantes del forecast activo.
          </p>
        </div>
        <span class="erp-chip erp-chip--neutral">{{ alerts.length }} alertas</span>
      </div>

      @if (alerts.length) {
        <div class="mt-4 space-y-3">
          @for (alert of alerts.slice(0, 8); track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="erp-chip" [ngClass]="severityClass(alert.severity)">{{ alert.severity }}</span>
                <span class="erp-chip erp-chip--info">{{ alert.type }}</span>
                @if (alert.sku) {
                  <span class="erp-chip erp-chip--neutral">{{ alert.sku }}</span>
                }
              </div>
              <p class="mt-3 text-sm font-semibold text-slate-900">{{ alert.title }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ alert.description }}</p>
              <div class="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                @if (alert.zone) {
                  <span>Zona: {{ alert.zone }}</span>
                }
                @if (alert.channel) {
                  <span>Canal: {{ alert.channel }}</span>
                }
                @if (alert.period) {
                  <span>Periodo: {{ alert.period }}</span>
                }
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[16rem]">
          <div>
            <span class="material-symbols-outlined text-4xl text-slate-300">campaign</span>
            <p class="mt-3 text-base font-semibold text-slate-700">Sin alertas para esta vista</p>
            <p class="mt-1 text-sm text-slate-500">
              Genera un nuevo forecast o cambia el filtro de severidad para explorar riesgos.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class ForecastAlertsPanelComponent {
  @Input({ required: true }) alerts: DemandAlert[] = [];

  severityClass(severity: DemandAlert['severity']): string {
    switch (severity) {
      case 'ALTA':
        return 'erp-chip--warning';
      case 'MEDIA':
        return 'erp-chip--info';
      default:
        return 'erp-chip--success';
    }
  }
}
