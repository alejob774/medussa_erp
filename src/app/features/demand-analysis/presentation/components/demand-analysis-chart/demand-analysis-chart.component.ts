import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandAnalysisCharts } from '../../../domain/models/demand-analysis.model';

@Component({
  selector: 'app-demand-analysis-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Forecast vs real</p>
        <h3 class="erp-section-title">Comparativo del periodo</h3>
        <p class="erp-section-description">Lectura ejecutiva del comportamiento real frente al forecast aprobado.</p>
      </div>

      <div class="mt-5 space-y-6">
        <div class="space-y-3">
          @for (point of charts.forecastVsActual; track point.label) {
            <div>
              <div class="flex items-center justify-between text-xs text-slate-500">
                <span>{{ point.label }}</span>
                <span>Forecast {{ point.forecast }} · Real {{ point.actual }}</span>
              </div>
              <div class="mt-2 grid gap-2">
                <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-sky-400" [style.width.%]="calc(point.forecast)"></div>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-emerald-500" [style.width.%]="calc(point.actual)"></div>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <div>
            <p class="text-sm font-semibold text-slate-900">Tendencia regional</p>
            <div class="mt-3 space-y-3">
              @for (point of charts.regionalTrend; track point.label) {
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-900">{{ point.label }}</span>
                    <span class="erp-chip" [ngClass]="point.gapPct >= 0 ? 'erp-chip--success' : 'erp-chip--warning'">
                      {{ point.gapPct }}%
                    </span>
                  </div>
                  <p class="mt-2 text-xs text-slate-500">Forecast {{ point.forecast }} · Real {{ point.actual }}</p>
                </div>
              }
            </div>
          </div>

          <div>
            <p class="text-sm font-semibold text-slate-900">Comportamiento por canal</p>
            <div class="mt-3 space-y-3">
              @for (point of charts.channelTrend; track point.label) {
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-900">{{ point.label }}</span>
                    <span class="erp-chip" [ngClass]="point.gapPct >= 0 ? 'erp-chip--info' : 'erp-chip--warning'">
                      {{ point.gapPct }}%
                    </span>
                  </div>
                  <p class="mt-2 text-xs text-slate-500">Forecast {{ point.forecast }} · Real {{ point.actual }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DemandAnalysisChartComponent {
  @Input({ required: true }) charts: DemandAnalysisCharts = {
    forecastVsActual: [],
    topVolume: [],
    topValue: [],
    growthRanking: [],
    declineRanking: [],
    regionalTrend: [],
    channelTrend: [],
  };

  private maxValue(): number {
    const values = [
      ...this.charts.forecastVsActual.flatMap((item) => [item.forecast, item.actual]),
      ...this.charts.regionalTrend.flatMap((item) => [item.forecast, item.actual]),
      ...this.charts.channelTrend.flatMap((item) => [item.forecast, item.actual]),
    ];
    return Math.max(...values, 1);
  }

  calc(value: number): number {
    return Math.max(8, Math.round((value / this.maxValue()) * 100));
  }
}
