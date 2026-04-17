import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PurchaseAnalysisCharts } from '../../../domain/models/purchase-analysis.model';

@Component({
  selector: 'app-purchase-analysis-price-trend',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Precio y concentracion</p>
        <h3 class="erp-section-title">Tendencia de precios</h3>
        <p class="erp-section-description">Lectura rapida de precio promedio mensual y concentracion por categoria.</p>
      </div>

      <div class="mt-5 space-y-6">
        <div class="space-y-3">
          @for (point of charts.priceTrend; track point.label) {
            <div>
              <div class="flex items-center justify-between text-xs text-slate-500">
                <span>{{ point.label }}</span>
                <span>{{ point.value | number: '1.0-0' }}</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-amber-500" [style.width.%]="calc(point.value)"></div>
              </div>
            </div>
          }
        </div>

        <div>
          <p class="text-sm font-semibold text-slate-900">Concentracion por categoria</p>
          <div class="mt-3 space-y-3">
            @for (item of charts.concentration; track item.label) {
              <article class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-900">{{ item.label }}</span>
                  <span class="erp-chip" [ngClass]="item.sharePct >= 70 ? 'erp-chip--warning' : 'erp-chip--info'">{{ item.sharePct }}%</span>
                </div>
                <p class="mt-2 text-xs text-slate-500">Gasto concentrado: {{ item.spend | number: '1.0-0' }}</p>
              </article>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PurchaseAnalysisPriceTrendComponent {
  @Input({ required: true }) charts: PurchaseAnalysisCharts = {
    topSpend: [],
    topQuality: [],
    topCompliance: [],
    priceTrend: [],
    concentration: [],
    savingsByCategory: [],
  };

  private maxValue(): number {
    const values = [...this.charts.priceTrend.map((item) => item.value), ...this.charts.concentration.map((item) => item.spend)];
    return Math.max(...values, 1);
  }

  calc(value: number): number {
    return Math.max(8, Math.round((value / this.maxValue()) * 100));
  }
}
