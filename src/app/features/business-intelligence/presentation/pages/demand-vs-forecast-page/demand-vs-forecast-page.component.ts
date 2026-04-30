import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  DemandVsForecastFilters,
  DemandVsForecastResponse,
  ForecastAccuracyStatus,
  ForecastDeviationItem,
} from '../../../domain/models/demand-vs-forecast.model';

interface ForecastKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'amber' | 'red' | 'slate';
}

@Component({
  selector: 'app-demand-vs-forecast-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-038</p>
            <h1 class="erp-page-title">Demanda vs Forecast</h1>
            <p class="erp-page-description">
              Comparativo mock-first para {{ activeCompanyName }} entre forecast y venta real, conectado
              conceptualmente con Gestion de Demanda, Analisis de Demanda, MPS y desempeno comercial.
              La visualizacion final queda preparada para Grafana sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como caso de planeacion comercial.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">30 minutos</p>
              <p class="erp-meta-card__hint">Contrato preparado para datamart de forecast.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form class="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]" (ngSubmit)="applyFilters()">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha desde</span>
            <input
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="date"
              name="fechaDesde"
              [(ngModel)]="filters.fechaDesde"
            />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha hasta</span>
            <input
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="date"
              name="fechaHasta"
              [(ngModel)]="filters.fechaHasta"
            />
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="productoId"
              [(ngModel)]="filters.productoId"
            >
              <option [ngValue]="null">Todos</option>
              @for (product of products; track product.id) {
                <option [value]="product.id">{{ product.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Linea</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="lineaId"
              [(ngModel)]="filters.lineaId"
            >
              <option [ngValue]="null">Todas</option>
              @for (line of lines; track line.id) {
                <option [value]="line.id">{{ line.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Zona</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="zonaId"
              [(ngModel)]="filters.zonaId"
            >
              <option [ngValue]="null">Todas</option>
              @for (zone of zones; track zone.id) {
                <option [value]="zone.id">{{ zone.name }}</option>
              }
            </select>
          </label>
          <div class="flex items-end gap-2">
            <button class="h-11" type="submit" mat-flat-button color="primary" [disabled]="loading">
              Aplicar
            </button>
            <button class="h-11" type="button" mat-stroked-button (click)="resetFilters()" [disabled]="loading">
              Limpiar
            </button>
          </div>
        </form>
      </section>

      @if (loading) {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          @for (item of loadingCards; track item) {
            <article class="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div class="h-3 w-28 rounded bg-slate-200"></div>
              <div class="mt-5 h-8 w-32 rounded bg-slate-200"></div>
              <div class="mt-4 h-3 w-full rounded bg-slate-100"></div>
            </article>
          }
        </section>
      } @else if (!dashboard) {
        <section class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p class="text-lg font-semibold text-slate-900">Sin datos de forecast para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta filtros para consultar demanda vs forecast.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          @for (card of kpiCards; track card.label) {
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
              <p class="mt-3 text-2xl font-semibold text-slate-950">{{ card.value }}</p>
              <span class="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="toneClass(card.tone)">
                {{ card.hint }}
              </span>
            </article>
          }
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1fr_0.8fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Comparativo forecast vs real</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Lectura ejecutiva del periodo</h2>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="accuracyClass(accuracyStatus(dashboard.precisionPct))">
                Precision {{ accuracyStatus(dashboard.precisionPct) }}
              </span>
            </div>
            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <div class="rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Forecast</p>
                <p class="mt-2 text-xl font-semibold text-slate-950">{{ formatUnits(dashboard.forecastTotal) }}</p>
              </div>
              <div class="rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Venta real</p>
                <p class="mt-2 text-xl font-semibold text-slate-950">{{ formatUnits(dashboard.ventaReal) }}</p>
              </div>
              <div class="rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Diferencia</p>
                <p class="mt-2 text-xl font-semibold" [ngClass]="dashboard.ventaReal >= dashboard.forecastTotal ? 'text-emerald-700' : 'text-amber-700'">
                  {{ formatSignedUnits(dashboard.ventaReal - dashboard.forecastTotal) }}
                </p>
              </div>
            </div>
            <p class="mt-5 rounded-md bg-emerald-50 p-4 text-sm text-emerald-900">
              {{ dashboard.lecturaEjecutiva }}
            </p>

            <div class="mt-5 space-y-3">
              @for (point of dashboard.tendenciaForecastReal; track point.fecha) {
                <div class="grid grid-cols-[5rem_1fr_5rem_5rem] items-center gap-3 text-sm">
                  <span class="text-slate-500">{{ point.fecha }}</span>
                  <div class="space-y-1">
                    <div class="h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-slate-500" [style.width.%]="trendWidth(point.valor, dashboard.tendenciaForecastReal)"></div>
                    </div>
                    <div class="h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-emerald-600" [style.width.%]="trendWidth(point.comparativo || 0, dashboard.tendenciaForecastReal)"></div>
                    </div>
                  </div>
                  <span class="text-right font-semibold text-slate-700">{{ formatCompact(point.valor) }}</span>
                  <span class="text-right font-semibold text-emerald-700">{{ formatCompact(point.comparativo || 0) }}</span>
                </div>
              }
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Precision por zona / linea</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Segmentos con mayor desviacion</h2>
            <div class="mt-5 space-y-3">
              @for (segment of dashboard.precisionSegmentos; track segment.segmentoId + segment.tipoSegmento) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-semibold text-slate-900">{{ segment.segmentoNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ segment.tipoSegmento }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="accuracyClass(segment.estado)">
                      {{ segment.estado }}
                    </span>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-slate-700">
                    <div class="flex justify-between gap-3">
                      <span>Forecast</span>
                      <span>{{ formatUnits(segment.forecast) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                      <span>Real</span>
                      <span>{{ formatUnits(segment.ventaReal) }}</span>
                    </div>
                    <div class="flex justify-between gap-3 font-semibold text-slate-950">
                      <span>Precision</span>
                      <span>{{ formatPercent(segment.precisionPct) }}</span>
                    </div>
                  </div>
                  <div class="mt-3 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600" [style.width.%]="segment.precisionPct"></div>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay segmentos para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-2">
          <ng-container *ngTemplateOutlet="deviationTable; context: { title: 'Productos subestimados', subtitle: 'Real mayor que forecast: riesgo de faltante, quiebre o perdida de venta.', rows: dashboard.subestimados, mode: 'sub' }"></ng-container>
          <ng-container *ngTemplateOutlet="deviationTable; context: { title: 'Productos sobrestimados', subtitle: 'Forecast mayor que real: riesgo de sobreinventario, vencimiento o caja inmovilizada.', rows: dashboard.sobrestimados, mode: 'over' }"></ng-container>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">Demanda vs Forecast</h2>
          <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
            <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
            <p class="mt-4 text-sm text-slate-600">
              La version final consultara el datamart de demanda y forecast via Grafana. En esta fase no se crea token,
              URL firmada ni iframe real.
            </p>
            <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafana?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
            </div>
          </div>
        </section>
      }
    </div>

    <ng-template #deviationTable let-title="title" let-subtitle="subtitle" let-rows="rows" let-mode="mode">
      <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ title }}</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">{{ subtitle }}</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3">Linea</th>
                <th class="px-4 py-3">Zona</th>
                <th class="px-4 py-3">Forecast</th>
                <th class="px-4 py-3">Real</th>
                <th class="px-4 py-3">{{ mode === 'sub' ? 'Diferencia' : 'Exceso' }}</th>
                <th class="px-4 py-3">Error</th>
                <th class="px-4 py-3">Impacto estimado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (row of rows; track row.productoId + row.zonaId) {
                <tr>
                  <td class="px-4 py-4">
                    <p class="font-semibold text-slate-900">{{ row.productoNombre }}</p>
                    <p class="mt-1 text-xs text-slate-500">{{ row.sku }}</p>
                  </td>
                  <td class="px-4 py-4 text-slate-700">{{ row.lineaNombre }}</td>
                  <td class="px-4 py-4 text-slate-700">{{ row.zonaNombre }}</td>
                  <td class="px-4 py-4 text-slate-700">{{ formatUnits(row.forecast) }}</td>
                  <td class="px-4 py-4 font-semibold text-slate-900">{{ formatUnits(row.ventaReal) }}</td>
                  <td class="px-4 py-4 font-semibold" [ngClass]="row.desviacion > 0 ? 'text-emerald-700' : 'text-amber-700'">
                    {{ formatUnits(abs(row.desviacion)) }}
                  </td>
                  <td class="px-4 py-4 text-slate-700">{{ formatPercent(row.errorForecastPct) }}</td>
                  <td class="px-4 py-4 text-slate-700">{{ formatCurrency(row.impactoEstimado) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                    No hay desviaciones para esta categoria con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </ng-template>
  `,
})
export class DemandVsForecastPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: DemandVsForecastResponse | null = null;
  filters: DemandVsForecastFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 5 }, (_, index) => index);
  readonly products = [
    { id: 'prod-arb-001', name: 'Yogurt bebible fresa 200 ml' },
    { id: 'prod-arb-002', name: 'Queso campesino 500 g' },
    { id: 'prod-arb-003', name: 'Leche entera UHT 1L' },
    { id: 'prod-arb-004', name: 'Kumis tradicional 150 g' },
    { id: 'prod-arb-005', name: 'Avena UHT 1L' },
    { id: 'prod-arb-006', name: 'Cuajada fresca 450 g' },
  ];
  readonly lines = [
    { id: 'lacteos-bebibles', name: 'Lacteos bebibles' },
    { id: 'uht', name: 'UHT' },
    { id: 'quesos', name: 'Quesos' },
  ];
  readonly zones = [
    { id: 'bogota-norte', name: 'Bogota Norte' },
    { id: 'sabana', name: 'Sabana' },
    { id: 'centro', name: 'Centro' },
  ];

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  get kpiCards(): ForecastKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Forecast total', value: this.formatUnits(this.dashboard.forecastTotal), hint: 'Plan periodo', tone: 'slate' },
      { label: 'Venta real', value: this.formatUnits(this.dashboard.ventaReal), hint: 'Demanda confirmada', tone: 'green' },
      { label: 'Desviacion absoluta', value: this.formatUnits(this.dashboard.desviacionAbsoluta), hint: 'Gap total', tone: this.dashboard.errorForecastPct > 10 ? 'amber' : 'green' },
      { label: 'Error forecast', value: this.formatPercent(this.dashboard.errorForecastPct), hint: 'Abs / forecast', tone: this.dashboard.errorForecastPct > 10 ? 'amber' : 'green' },
      { label: 'Precision forecast', value: this.formatPercent(this.dashboard.precisionPct), hint: this.accuracyStatus(this.dashboard.precisionPct), tone: this.dashboard.precisionPct >= 90 ? 'green' : 'amber' },
    ];
  }

  applyFilters(): void {
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  formatUnits(value: number): string {
    return `${value.toLocaleString('es-CO')} uds`;
  }

  formatCompact(value: number): string {
    return `${Math.round(value / 1000).toLocaleString('es-CO')}k`;
  }

  formatSignedUnits(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${this.formatUnits(value)}`;
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  accuracyStatus(value: number): ForecastAccuracyStatus {
    if (value >= 90) {
      return 'ALTA';
    }

    if (value >= 80) {
      return 'MEDIA';
    }

    return 'BAJA';
  }

  accuracyClass(status: ForecastAccuracyStatus): string {
    const classes: Record<ForecastAccuracyStatus, string> = {
      ALTA: 'bg-emerald-50 text-emerald-700',
      MEDIA: 'bg-amber-50 text-amber-700',
      BAJA: 'bg-red-50 text-red-700',
    };

    return classes[status];
  }

  toneClass(tone: ForecastKpiCard['tone']): string {
    const classes: Record<ForecastKpiCard['tone'], string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  trendWidth(value: number, points: Array<{ valor: number; comparativo?: number | null }>): number {
    const max = Math.max(...points.flatMap((point) => [point.valor, point.comparativo ?? 0]), 1);
    return Math.max(8, Math.round((value / max) * 100));
  }

  rowImpactClass(row: ForecastDeviationItem): string {
    return row.desviacion > 0 ? 'text-emerald-700' : 'text-amber-700';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getDemandVsForecast(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar demanda vs forecast.';
        },
      });
  }

  private defaultFilters(): DemandVsForecastFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      productoId: null,
      lineaId: null,
      zonaId: null,
    };
  }
}
