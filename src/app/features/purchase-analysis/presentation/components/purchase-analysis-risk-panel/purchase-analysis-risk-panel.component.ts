import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PurchaseAnalysisAlert } from '../../../domain/models/purchase-analysis-alert.model';

@Component({
  selector: 'app-purchase-analysis-risk-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Riesgos de abastecimiento</p>
        <h3 class="erp-section-title">Panel ejecutivo</h3>
        <p class="erp-section-description">Dependencia, proveedor unico, calidad, precio y cumplimiento.</p>
      </div>
      @if (alerts.length) {
        <div class="mt-4 space-y-3">
          @for (alert of alerts.slice(0, 8); track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="erp-chip" [ngClass]="chipClass(alert.severidad)">{{ alert.severidad }}</span>
                <span class="erp-chip erp-chip--info">{{ alert.tipo }}</span>
              </div>
              <p class="mt-3 text-sm text-slate-700">{{ alert.descripcion }}</p>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[16rem]"><div><p class="text-slate-600">Sin alertas para esta vista.</p></div></div>
      }
    </section>
  `,
})
export class PurchaseAnalysisRiskPanelComponent {
  @Input() alerts: PurchaseAnalysisAlert[] = [];

  chipClass(severity: string): string {
    if (severity === 'ALTA') return 'erp-chip--warning';
    if (severity === 'MEDIA') return 'erp-chip--info';
    return 'erp-chip--success';
  }
}
