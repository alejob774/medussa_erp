import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BudgetManagementCharts } from '../../../domain/models/budget-management.model';

@Component({
  selector: 'app-budget-management-comparison-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="erp-panel">
        <div>
          <p class="erp-section-eyebrow">Plan vs real</p>
          <h3 class="erp-section-title">Comparativo por centro de costo</h3>
          <p class="erp-section-description">
            Lectura consolidada entre plan vigente, consumo real y cierre proyectado.
          </p>
        </div>

        <div class="mt-5 space-y-4">
          @for (point of charts.planVsRealByCenter; track point.label) {
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-slate-900">{{ point.label }}</p>
                  <p class="mt-1 text-xs text-slate-500">
                    Plan {{ formatCurrency(point.plan) }} · Real {{ formatCurrency(point.real) }}
                  </p>
                </div>
                <span
                  class="erp-chip"
                  [ngClass]="point.projected > point.plan ? 'erp-chip--warning' : 'erp-chip--success'"
                >
                  {{ varianceLabel(point.projected, point.plan) }}
                </span>
              </div>

              <div class="mt-4 space-y-3">
                <div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>Plan</span>
                    <span>{{ formatCurrency(point.plan) }}</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-slate-300" [style.width.%]="width(point.plan)"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>Real</span>
                    <span>{{ formatCurrency(point.real) }}</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-sky-500" [style.width.%]="width(point.real)"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>Proyección</span>
                    <span>{{ formatCurrency(point.projected) }}</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full"
                      [class.bg-emerald-500]="point.projected <= point.plan"
                      [class.bg-amber-500]="point.projected > point.plan"
                      [style.width.%]="width(point.projected)"
                    ></div>
                  </div>
                </div>
              </div>
            </article>
          }
        </div>
      </article>

      <article class="erp-panel">
        <div>
          <p class="erp-section-eyebrow">Cierre del periodo</p>
          <h3 class="erp-section-title">Proyección por categoría</h3>
          <p class="erp-section-description">
            Categorías con mayor tensión al cierre del mes en la empresa activa.
          </p>
        </div>

        <div class="mt-5 space-y-3">
          @for (point of charts.projectionByCategory; track point.label) {
            <article class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-slate-900">{{ point.label }}</span>
                <span
                  class="erp-chip"
                  [ngClass]="point.projected > point.plan ? 'erp-chip--warning' : 'erp-chip--info'"
                >
                  {{ varianceLabel(point.projected, point.plan) }}
                </span>
              </div>
              <div class="mt-3 grid gap-2 text-xs text-slate-500">
                <div class="flex items-center justify-between">
                  <span>Plan</span>
                  <span>{{ formatCurrency(point.plan) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Real</span>
                  <span>{{ formatCurrency(point.real) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Proyección</span>
                  <span>{{ formatCurrency(point.projected) }}</span>
                </div>
              </div>
            </article>
          }
        </div>
      </article>
    </section>
  `,
})
export class BudgetManagementComparisonChartComponent {
  @Input({ required: true }) charts: BudgetManagementCharts = {
    planVsRealByCenter: [],
    projectionByCategory: [],
  };

  width(value: number): number {
    const values = [
      ...this.charts.planVsRealByCenter.flatMap((item) => [item.plan, item.real, item.projected]),
      ...this.charts.projectionByCategory.flatMap((item) => [item.plan, item.real, item.projected]),
    ];
    const maxValue = Math.max(...values, 1);

    return Math.max(8, Math.round((value / maxValue) * 100));
  }

  varianceLabel(projected: number, plan: number): string {
    if (!plan) {
      return 'Sin plan';
    }

    const variance = Math.round(((projected - plan) / plan) * 100);
    return `${variance > 0 ? '+' : ''}${variance}%`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
