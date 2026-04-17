import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAnalysisCharts, DemandAnalysisRankingPoint } from '../../../domain/models/demand-analysis.model';

@Component({
  selector: 'app-demand-analysis-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Ranking comercial</p>
        <h3 class="erp-section-title">Top SKU y variaciones</h3>
        <p class="erp-section-description">Volumen, valor, crecimiento y caidas sobre la base analizada.</p>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-2">
        <ng-container *ngFor="let block of blocks">
          <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">{{ block.title }}</p>
            <div class="mt-3 space-y-3">
              @for (item of block.items; track item.label) {
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3">
                  <span class="text-sm text-slate-700">{{ item.label }}</span>
                  <span class="font-semibold text-slate-900">{{ item.value }}</span>
                </div>
              }
            </div>
          </article>
        </ng-container>
      </div>
    </section>
  `,
})
export class DemandAnalysisRankingComponent {
  @Input({ required: true }) charts: DemandAnalysisCharts = {
    forecastVsActual: [],
    topVolume: [],
    topValue: [],
    growthRanking: [],
    declineRanking: [],
    regionalTrend: [],
    channelTrend: [],
  };

  get blocks(): Array<{ title: string; items: DemandAnalysisRankingPoint[] }> {
    return [
      { title: 'Top SKU por volumen', items: this.charts.topVolume },
      { title: 'Top SKU por valor', items: this.charts.topValue },
      { title: 'Mayor crecimiento', items: this.charts.growthRanking },
      { title: 'Mayor caida', items: this.charts.declineRanking },
    ];
  }
}
