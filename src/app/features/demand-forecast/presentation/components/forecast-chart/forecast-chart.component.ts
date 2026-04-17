import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DemandForecastCharts } from '../../../domain/models/demand-forecast.model';

@Component({
  selector: 'app-forecast-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Analitica</p>
        <h3 class="erp-section-title">Forecast vs historico</h3>
        <p class="erp-section-description">
          Comparativo consolidado y distribucion por zona, canal y SKU criticos.
        </p>
      </div>

      <div class="mt-5 space-y-6">
        <div>
          <p class="text-sm font-semibold text-slate-900">Tendencia del periodo</p>
          <div class="mt-3 space-y-3">
            @for (point of charts.trend; track point.label) {
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-500">
                  <span>{{ point.label }}</span>
                  <span>Hist: {{ point.historical }} · Sist: {{ point.system }} · Final: {{ point.final }}</span>
                </div>
                <div class="grid gap-2">
                  <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-slate-300" [style.width.%]="calc(point.historical)"></div>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-sky-400" [style.width.%]="calc(point.system)"></div>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-emerald-500" [style.width.%]="calc(point.final)"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <div>
            <p class="text-sm font-semibold text-slate-900">Distribucion por zona</p>
            <div class="mt-3 space-y-3">
              @for (point of charts.zoneDistribution; track point.label) {
                <div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>{{ point.label }}</span>
                    <span>{{ point.value }}</span>
                  </div>
                  <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-indigo-500" [style.width.%]="calc(point.value)"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div>
            <p class="text-sm font-semibold text-slate-900">Distribucion por canal</p>
            <div class="mt-3 space-y-3">
              @for (point of charts.channelDistribution; track point.label) {
                <div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>{{ point.label }}</span>
                    <span>{{ point.value }}</span>
                  </div>
                  <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-amber-500" [style.width.%]="calc(point.value)"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div>
          <p class="text-sm font-semibold text-slate-900">Top SKU con mas riesgo</p>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            @for (point of charts.topRiskSkus; track point.label + point.type) {
              <article class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="font-semibold text-slate-900">{{ point.label }}</span>
                  <span class="erp-chip" [ngClass]="point.type === 'FALTANTE' ? 'erp-chip--warning' : 'erp-chip--info'">
                    {{ point.type }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-slate-500">Brecha estimada: {{ point.value }} unidades</p>
              </article>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ForecastChartComponent {
  @Input({ required: true }) charts: DemandForecastCharts = {
    trend: [],
    zoneDistribution: [],
    channelDistribution: [],
    topRiskSkus: [],
  };

  private maxValue(): number {
    const values = [
      ...this.charts.trend.flatMap((point) => [point.historical, point.system, point.final]),
      ...this.charts.zoneDistribution.map((point) => point.value),
      ...this.charts.channelDistribution.map((point) => point.value),
      ...this.charts.topRiskSkus.map((point) => point.value),
    ];

    return Math.max(...values, 1);
  }

  calc(value: number): number {
    return Math.max(8, Math.round((value / this.maxValue()) * 100));
  }
}
