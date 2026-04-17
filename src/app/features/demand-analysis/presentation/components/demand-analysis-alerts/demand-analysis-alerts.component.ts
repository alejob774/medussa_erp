import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAnalysisAlert } from '../../../domain/models/demand-analysis-alert.model';

@Component({
  selector: 'app-demand-analysis-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Alertas ejecutivas</p>
        <h3 class="erp-section-title">Desviaciones de demanda</h3>
        <p class="erp-section-description">Foco rapido sobre severidad, zona y canal del analisis actual.</p>
      </div>

      @if (alerts.length) {
        <div class="mt-4 space-y-3">
          @for (alert of alerts.slice(0, 8); track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="erp-chip" [ngClass]="chipClass(alert.severidad)">{{ alert.severidad }}</span>
                <span class="erp-chip erp-chip--info">{{ alert.tipo }}</span>
                @if (alert.sku) {
                  <span class="erp-chip erp-chip--neutral">{{ alert.sku }}</span>
                }
              </div>
              <p class="mt-3 text-sm text-slate-700">{{ alert.descripcion }}</p>
              <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                @if (alert.zona) { <span>{{ alert.zona }}</span> }
                @if (alert.canal) { <span>{{ alert.canal }}</span> }
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[16rem]">
          <div>
            <span class="material-symbols-outlined text-4xl text-slate-300">notification_important</span>
            <p class="mt-3 text-base font-semibold text-slate-700">Sin alertas para esta vista</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class DemandAnalysisAlertsComponent {
  @Input() alerts: DemandAnalysisAlert[] = [];

  chipClass(severity: DemandAnalysisAlert['severidad']): string {
    if (severity === 'ALTA') return 'erp-chip--warning';
    if (severity === 'MEDIA') return 'erp-chip--info';
    return 'erp-chip--success';
  }
}
