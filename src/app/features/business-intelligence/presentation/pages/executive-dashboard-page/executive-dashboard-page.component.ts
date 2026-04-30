import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  ExecutiveCriticalAlert,
  ExecutiveDashboard360Response,
  ExecutiveDashboardFilters,
} from '../../../domain/models/executive-dashboard.model';
import { BiMetricValue, BiTrendPoint } from '../../../domain/models/bi-filter-context.model';
import { BiDashboardEmbedConfig } from '../../../domain/models/grafana-embed.model';

interface ExecutiveKpiCard {
  key: string;
  label: string;
  description: string;
  metric: BiMetricValue;
}

@Component({
  selector: 'app-executive-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-033</p>
            <h1 class="erp-page-title">Dashboard Ejecutivo 360</h1>
            <p class="erp-page-description">
              Vista ejecutiva mock-first para {{ activeCompanyName }} con ventas, presupuesto, produccion,
              inventario, OTIF, margen y alertas criticas. La visualizacion final queda preparada para Grafana
              sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo principal multiempresa.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Fuente BI</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">Mock BI + Grafana UID</p>
              <p class="erp-meta-card__hint">API-ready, sin ETL ni Grafana real todavia.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form class="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_0.8fr_auto]" (ngSubmit)="applyFilters()">
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="sedeId"
              [(ngModel)]="filters.sedeId"
            >
              <option [ngValue]="null">Todas las sedes</option>
              <option value="arb-planta-principal">Planta principal</option>
              <option value="arb-bogota-norte">Bogota Norte</option>
              <option value="arb-sabana">Sabana</option>
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Moneda</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="moneda"
              [(ngModel)]="filters.moneda"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
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
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (item of loadingCards; track item) {
            <article class="h-36 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div class="h-3 w-24 rounded bg-slate-200"></div>
              <div class="mt-6 h-8 w-36 rounded bg-slate-200"></div>
              <div class="mt-5 h-3 w-full rounded bg-slate-100"></div>
            </article>
          }
        </section>
      } @else if (!dashboard) {
        <section class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p class="text-lg font-semibold text-slate-900">Sin datos para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta el rango de fechas o sede para recargar la vista ejecutiva.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (card of kpiCards; track card.key) {
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
                  <p class="mt-3 text-2xl font-semibold text-slate-950">{{ formatMetric(card.metric) }}</p>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="statusClass(card.metric.estado)">
                  {{ card.metric.estado || 'N/D' }}
                </span>
              </div>
              <p class="mt-3 text-sm text-slate-600">{{ card.description }}</p>
              <p class="mt-4 text-xs font-medium" [ngClass]="variationClass(card.metric.variacionPct)">
                {{ formatVariation(card.metric.variacionPct) }}
              </p>
            </article>
          }
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tendencias ejecutivas</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Pulso mensual consolidado</h2>
              </div>
              <p class="text-sm text-slate-500">{{ filters.fechaDesde }} a {{ filters.fechaHasta }}</p>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-3">
              <ng-container *ngTemplateOutlet="trendBlock; context: { label: 'Ventas', points: dashboard.tendencias?.ventas, suffix: 'M' }"></ng-container>
              <ng-container *ngTemplateOutlet="trendBlock; context: { label: 'Margen', points: dashboard.tendencias?.margen, suffix: '%' }"></ng-container>
              <ng-container *ngTemplateOutlet="trendBlock; context: { label: 'OTIF', points: dashboard.tendencias?.otif, suffix: '%' }"></ng-container>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Alertas criticas</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Riesgos gerenciales activos</h2>
              </div>
              <span class="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                {{ dashboard.alertas?.length || 0 }} alertas
              </span>
            </div>

            <div class="mt-5 space-y-3">
              @for (alert of dashboard.alertas ?? []; track alert.id) {
                <article class="rounded-md border border-slate-200 p-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="alertSeverityClass(alert.severidad)">
                      {{ alert.severidad }}
                    </span>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {{ alert.tipo }}
                    </span>
                    <span class="text-xs text-slate-500">{{ alert.estado }}</span>
                  </div>
                  <p class="mt-3 text-sm font-semibold text-slate-900">{{ alert.mensaje }}</p>
                  <p class="mt-2 text-xs text-slate-500">
                    Responsable sugerido: {{ alert.responsableSugerido }} - {{ alert.fechaDeteccion }}
                  </p>
                </article>
              } @empty {
                <p class="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
                  No hay alertas criticas para el filtro seleccionado.
                </p>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Dashboard embed pendiente de conexion</h2>
            <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
              <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
              <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
              <p class="mt-4 text-sm text-slate-600">
                La visualizacion final consultara Data Warehouse via Grafana. En esta fase no se crea token,
                URL firmada ni iframe real.
              </p>
              <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
                <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafana?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
              </div>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Contrato BI aplicado</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Filtros enviados al facade</h2>
            <dl class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-md bg-slate-50 p-3">
                <dt class="text-xs font-semibold uppercase text-slate-500">Empresa</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ dashboard.filters.empresaId }}</dd>
              </div>
              <div class="rounded-md bg-slate-50 p-3">
                <dt class="text-xs font-semibold uppercase text-slate-500">Sede</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ dashboard.filters.sedeId || 'Todas' }}</dd>
              </div>
              <div class="rounded-md bg-slate-50 p-3">
                <dt class="text-xs font-semibold uppercase text-slate-500">Moneda</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ dashboard.filters.moneda || 'COP' }}</dd>
              </div>
              <div class="rounded-md bg-slate-50 p-3">
                <dt class="text-xs font-semibold uppercase text-slate-500">Fuente</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">BusinessIntelligenceFacadeService</dd>
              </div>
            </dl>
          </article>
        </section>
      }
    </div>

    <ng-template #trendBlock let-label="label" let-points="points" let-suffix="suffix">
      <div class="rounded-md bg-slate-50 p-4">
        <p class="text-sm font-semibold text-slate-900">{{ label }}</p>
        <div class="mt-4 space-y-2">
          @for (point of points ?? []; track point.fecha) {
            <div class="grid grid-cols-[4rem_1fr_4rem] items-center gap-3">
              <span class="text-xs text-slate-500">{{ point.fecha }}</span>
              <span class="h-2 overflow-hidden rounded-full bg-slate-200">
                <span class="block h-full rounded-full bg-emerald-600" [style.width.%]="trendWidth(point, points)"></span>
              </span>
              <span class="text-right text-xs font-semibold text-slate-700">{{ point.valor }}{{ suffix }}</span>
            </div>
          } @empty {
            <p class="text-sm text-slate-500">Tendencia pendiente de consolidacion.</p>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class ExecutiveDashboardPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: ExecutiveDashboard360Response | null = null;
  filters: ExecutiveDashboardFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 7 }, (_, index) => index);

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  get kpiCards(): ExecutiveKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { key: 'ventasMes', label: 'Ventas del mes', description: 'Venta neta consolidada del periodo.', metric: this.dashboard.ventasMes },
      { key: 'cumplimientoPresupuesto', label: 'Cumplimiento presupuesto', description: 'Avance contra presupuesto comercial y financiero.', metric: this.dashboard.cumplimientoPresupuesto },
      { key: 'produccionVsPlan', label: 'Produccion vs plan', description: 'Ejecucion de planta frente al plan maestro.', metric: this.dashboard.produccionVsPlan },
      { key: 'inventarioTotal', label: 'Inventario total', description: 'Valor estimado de inventario central y layout.', metric: this.dashboard.inventarioTotal },
      { key: 'otif', label: 'OTIF', description: 'Entrega completa y a tiempo por zona y ruta.', metric: this.dashboard.otif },
      { key: 'margenEstimado', label: 'Margen estimado', description: 'Margen bruto mock desde Costos Core base.', metric: this.dashboard.margenEstimado },
      { key: 'alertasCriticas', label: 'Alertas criticas', description: 'Riesgos abiertos que requieren seguimiento ejecutivo.', metric: this.dashboard.alertasCriticas },
    ];
  }

  applyFilters(): void {
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  formatMetric(metric: BiMetricValue): string {
    if (metric.unidad === 'COP') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(metric.valor);
    }

    if (metric.unidad === '%') {
      return `${metric.valor.toLocaleString('es-CO')}%`;
    }

    return `${metric.valor.toLocaleString('es-CO')} ${metric.unidad ?? ''}`.trim();
  }

  formatVariation(value?: number | null): string {
    if (value === null || value === undefined) {
      return 'Sin variacion comparable';
    }

    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('es-CO')}% vs periodo anterior`;
  }

  statusClass(status?: BiMetricValue['estado']): string {
    if (status === 'VERDE') {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (status === 'AMARILLO') {
      return 'bg-amber-50 text-amber-700';
    }

    if (status === 'ROJO') {
      return 'bg-red-50 text-red-700';
    }

    return 'bg-slate-100 text-slate-600';
  }

  variationClass(value?: number | null): string {
    if ((value ?? 0) > 0) {
      return 'text-emerald-700';
    }

    if ((value ?? 0) < 0) {
      return 'text-red-700';
    }

    return 'text-slate-500';
  }

  alertSeverityClass(severity: ExecutiveCriticalAlert['severidad']): string {
    if (severity === 'CRITICA') {
      return 'bg-red-100 text-red-800';
    }

    if (severity === 'ALTA') {
      return 'bg-orange-100 text-orange-800';
    }

    if (severity === 'MEDIA') {
      return 'bg-amber-100 text-amber-800';
    }

    return 'bg-slate-100 text-slate-700';
  }

  trendWidth(point: BiTrendPoint, points: BiTrendPoint[] | null | undefined): number {
    const max = Math.max(...(points ?? []).map((item) => item.valor), 1);
    return Math.max(8, Math.round((point.valor / max) * 100));
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getExecutiveDashboard(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el Dashboard Ejecutivo 360.';
        },
      });
  }

  private defaultFilters(): ExecutiveDashboardFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      sedeId: null,
      moneda: 'COP',
    };
  }
}
