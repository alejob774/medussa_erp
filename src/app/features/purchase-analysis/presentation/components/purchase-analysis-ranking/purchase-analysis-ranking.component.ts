import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PurchaseAnalysisCharts, PurchaseAnalysisRankingPoint } from '../../../domain/models/purchase-analysis.model';

@Component({
  selector: 'app-purchase-analysis-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Ranking de proveedores</p>
        <h3 class="erp-section-title">Desempeno y gasto</h3>
        <p class="erp-section-description">Top por gasto, calidad, cumplimiento y ahorro por categoria.</p>
      </div>
      <div class="mt-5 grid gap-4 xl:grid-cols-2">
        <ng-container *ngFor="let block of blocks">
          <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">{{ block.title }}</p>
            <div class="mt-3 space-y-3">
              @for (item of block.items; track item.label) {
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3">
                  <span class="text-sm text-slate-700">{{ item.label }}</span>
                  <span class="font-semibold text-slate-900">{{ item.value | number: '1.0-0' }}</span>
                </div>
              }
            </div>
          </article>
        </ng-container>
      </div>
    </section>
  `,
})
export class PurchaseAnalysisRankingComponent {
  @Input({ required: true }) charts: PurchaseAnalysisCharts = {
    topSpend: [],
    topQuality: [],
    topCompliance: [],
    priceTrend: [],
    concentration: [],
    savingsByCategory: [],
  };

  get blocks(): Array<{ title: string; items: PurchaseAnalysisRankingPoint[] }> {
    return [
      { title: 'Top por gasto', items: this.charts.topSpend },
      { title: 'Top por calidad', items: this.charts.topQuality },
      { title: 'Top por cumplimiento', items: this.charts.topCompliance },
      { title: 'Ahorro por categoria', items: this.charts.savingsByCategory },
    ];
  }
}
