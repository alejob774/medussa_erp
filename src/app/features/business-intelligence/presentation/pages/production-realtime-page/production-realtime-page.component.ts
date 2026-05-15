import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { interval } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import { GrafanaDemoEmbedComponent } from '../../components/grafana-demo-embed/grafana-demo-embed.component';
import {
  ActiveDowntime,
  ProductionLineStatus,
  ProductionRealtimeFilters,
  ProductionRealtimeResponse,
} from '../../../domain/models/production-realtime.model';

type KpiTone = 'green' | 'amber' | 'red' | 'slate';
type LineOperatingStatus = 'OPERANDO' | 'LENTA' | 'PARADA' | 'CAMBIO_FORMATO' | 'MANTENIMIENTO';

interface CatalogOption {
  id: string;
  name: string;
}

interface ProductionKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
}

interface LineMonitorRow extends ProductionLineStatus {
  plantaNombre: string;
  estadoLinea: LineOperatingStatus;
  paradaActiva: boolean;
}

interface DowntimeRow extends ActiveDowntime {
  equipo: string;
  accionSugerida: string;
}

@Component({
  selector: 'app-production-realtime-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, GrafanaDemoEmbedComponent],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-039</p>
            <h1 class="erp-page-title">Produccion Tiempo Real</h1>
            <p class="erp-page-description">
              Monitor operativo mock-first para {{ activeCompanyName }}. Consolida produccion diaria,
              plan, paradas y eficiencia por linea, preparado para futura conexion BI/DW/Grafana sin
              integrar PLC, WebSockets ni backend real en esta fase.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como planta demo principal.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh mock</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">60 segundos</p>
              <p class="erp-meta-card__hint">Ultima actualizacion: {{ lastUpdatedLabel }}</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form class="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]" (ngSubmit)="applyFilters()">
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Planta</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="sedeId"
              [(ngModel)]="filters.sedeId"
            >
              <option [ngValue]="null">Todas</option>
              @for (plant of plants; track plant.id) {
                <option [value]="plant.id">{{ plant.name }}</option>
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="turnoId"
              [(ngModel)]="filters.turnoId"
            >
              <option [ngValue]="null">Todos</option>
              @for (shift of shifts; track shift.id) {
                <option [value]="shift.id">{{ shift.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</span>
            <input
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="date"
              name="fecha"
              [(ngModel)]="selectedDate"
            />
          </label>
          <div class="flex items-end gap-2">
            <button class="h-11" type="submit" mat-flat-button color="primary" [disabled]="loading">
              Actualizar
            </button>
            <button class="h-11" type="button" mat-stroked-button (click)="resetFilters()" [disabled]="loading">
              Limpiar
            </button>
          </div>
        </form>
      </section>

      @if (loading) {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de produccion para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta planta, linea, turno o fecha para recargar el mock BI.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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

        <section class="grid gap-6 2xl:grid-cols-[1.3fr_0.7fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Monitor por linea productiva</p>
                  <h2 class="mt-1 text-lg font-semibold text-slate-950">Estado operativo planta</h2>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Sin integracion PLC
                </span>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Linea</th>
                    <th class="px-4 py-3">Planta</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3">Producto</th>
                    <th class="px-4 py-3">Orden activa</th>
                    <th class="px-4 py-3">Unidades</th>
                    <th class="px-4 py-3">Plan</th>
                    <th class="px-4 py-3">Cumplimiento</th>
                    <th class="px-4 py-3">Eficiencia</th>
                    <th class="px-4 py-3">Parada</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (line of lineMonitorRows; track line.lineaId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ line.lineaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ line.plantaNombre }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="lineStatusClass(line.estadoLinea)">
                          {{ line.estadoLinea }}
                        </span>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ line.productoActual }}</td>
                      <td class="px-4 py-4 font-mono text-xs text-slate-600">{{ line.ordenProduccionId }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatNumber(line.unidadesProducidas) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatNumber(line.unidadesPlan) }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ formatPercent(line.cumplimientoPlanPct) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="efficiencyTextClass(line.eficienciaPct)">
                        {{ formatPercent(line.eficienciaPct) }}
                      </td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="line.paradaActiva ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'">
                          {{ line.paradaActiva ? 'Si' : 'No' }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="10" class="px-4 py-8 text-center text-slate-500">
                        No hay lineas productivas para el filtro seleccionado.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Refresh visual</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Estado de actualizacion</h2>
              </div>
              <span class="relative flex h-3 w-3">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                <span class="relative inline-flex h-3 w-3 rounded-full bg-emerald-600"></span>
              </span>
            </div>
            <div class="mt-5 space-y-4 text-sm text-slate-700">
              <div class="rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Ultima actualizacion</p>
                <p class="mt-2 text-xl font-semibold text-slate-950">{{ lastUpdatedLabel }}</p>
              </div>
              <div class="rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase text-slate-500">Modo</p>
                <p class="mt-2 font-semibold text-slate-950">Mock BI / frontend-only</p>
                <p class="mt-2 text-slate-600">El boton recarga datos mock y el auto-refresh visual corre cada 60 segundos.</p>
              </div>
              <button type="button" mat-stroked-button class="w-full" (click)="reload()" [disabled]="loading">
                Actualizar ahora
              </button>
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Paradas activas</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Eventos operativos abiertos</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Linea</th>
                    <th class="px-4 py-3">Equipo</th>
                    <th class="px-4 py-3">Causa</th>
                    <th class="px-4 py-3">Duracion</th>
                    <th class="px-4 py-3">Responsable</th>
                    <th class="px-4 py-3">Severidad</th>
                    <th class="px-4 py-3">Inicio</th>
                    <th class="px-4 py-3">Accion sugerida</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (downtime of downtimeRows; track downtime.id) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ downtime.lineaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ downtime.equipo }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ downtime.causa }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ downtime.duracionMin }} min</td>
                      <td class="px-4 py-4 text-slate-700">{{ downtime.responsable }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="severityClass(downtime.severidad)">
                          {{ downtime.severidad }}
                        </span>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ formatTime(downtime.inicio) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ downtime.accionSugerida }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                        No hay paradas activas para el filtro seleccionado.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Produccion horaria</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Unidades reales vs plan por hora</h2>
            <div class="mt-5 space-y-3">
              @for (point of dashboard.produccionHora; track point.fecha) {
                <div class="grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-[4rem_1fr_7rem_7rem_6rem] sm:items-center">
                  <span class="font-semibold text-slate-900">{{ point.fecha }}</span>
                  <div class="space-y-1">
                    <div class="h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-emerald-600" [style.width.%]="hourlyWidth(point.valor)"></div>
                    </div>
                    <div class="h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-slate-500" [style.width.%]="hourlyWidth(point.plan || 0)"></div>
                    </div>
                  </div>
                  <span class="text-sm text-slate-700">Real {{ formatNumber(point.valor) }}</span>
                  <span class="text-sm text-slate-700">Plan {{ formatNumber(point.plan || 0) }}</span>
                  <span class="text-sm font-semibold" [ngClass]="hourlyCompliance(point) >= 95 ? 'text-emerald-700' : 'text-amber-700'">
                    {{ formatPercent(hourlyCompliance(point)) }}
                  </span>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay produccion horaria para el filtro seleccionado.</p>
              }
            </div>
            <div class="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
              <span class="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">Verde: unidades reales</span>
              <span class="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">Gris: unidades plan</span>
            </div>
          </article>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <app-bi-grafana-demo-embed
            [embedConfig]="dashboard.grafanaEmbedConfig"
            fallbackDashboardUid="medussa-production-rt"
            title="Produccion Tiempo Real"
            description="La version final consultara Data Warehouse y datamarts de produccion via Grafana. Esta fase demo/local no crea token firmado, URL productiva, WebSockets, ETL ni conexion directa a equipos de planta."
          ></app-bi-grafana-demo-embed>
        </section>
      }
    </div>
  `,
})
export class ProductionRealtimePageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: ProductionRealtimeResponse | null = null;
  filters: ProductionRealtimeFilters = this.defaultFilters();
  selectedDate = this.filters.fechaDesde;
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  lastUpdated: Date | null = null;
  readonly loadingCards = Array.from({ length: 6 }, (_, index) => index);
  readonly plants: CatalogOption[] = [
    { id: 'arb-planta-principal', name: 'Planta principal El Arbolito' },
    { id: 'arb-planta-lacteos-frios', name: 'Planta lacteos frios' },
    { id: 'arb-planta-uht', name: 'Planta UHT' },
  ];
  readonly lines: CatalogOption[] = [
    { id: 'linea-bebibles-2', name: 'Linea Yogurt' },
    { id: 'linea-uht-1', name: 'Linea UHT' },
    { id: 'linea-quesos-1', name: 'Linea Quesos' },
    { id: 'linea-empaque-1', name: 'Linea Empaque' },
  ];
  readonly shifts: CatalogOption[] = [
    { id: 'MANANA', name: 'MANANA' },
    { id: 'TARDE', name: 'TARDE' },
    { id: 'NOCHE', name: 'NOCHE' },
  ];

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.reload();
    });

    interval(60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!this.loading) {
          this.reload();
        }
      });
  }

  get lastUpdatedLabel(): string {
    return this.lastUpdated
      ? this.lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Pendiente';
  }

  get kpiCards(): ProductionKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    const activeStops = this.dashboard.paradasActivas.length;
    const averageEfficiency = this.averageEfficiency();

    return [
      { label: 'Produccion hoy', value: `${this.formatNumber(this.dashboard.produccionHoy)} uds`, hint: 'Acumulado diario', tone: 'green' },
      { label: 'Ordenes abiertas', value: this.formatNumber(this.dashboard.ordenesAbiertas), hint: 'OP activas y en cola', tone: 'slate' },
      { label: 'Cumplimiento plan', value: this.formatPercent(this.dashboard.cumplimientoPlanPct), hint: 'Plan diario', tone: this.dashboard.cumplimientoPlanPct >= 95 ? 'green' : 'amber' },
      { label: 'Paradas activas', value: this.formatNumber(activeStops), hint: activeStops ? 'Requiere seguimiento' : 'Sin eventos abiertos', tone: activeStops ? 'red' : 'green' },
      { label: 'Tiempo detenido', value: `${this.dashboard.tiempoDetenidoMin} min`, hint: 'Minutos acumulados', tone: this.dashboard.tiempoDetenidoMin > 20 ? 'amber' : 'green' },
      { label: 'Eficiencia promedio', value: this.formatPercent(averageEfficiency), hint: 'Promedio por linea', tone: averageEfficiency >= 82 ? 'green' : 'amber' },
    ];
  }

  get lineMonitorRows(): LineMonitorRow[] {
    if (!this.dashboard) {
      return [];
    }

    return this.dashboard.unidadesPorLinea.map((line) => {
      const activeDowntime = this.dashboard?.paradasActivas.find((downtime) => downtime.lineaId === line.lineaId);

      return {
        ...line,
        plantaNombre: this.plantNameForLine(line.lineaId),
        estadoLinea: this.resolveLineStatus(line, activeDowntime),
        paradaActiva: !!activeDowntime,
      };
    });
  }

  get downtimeRows(): DowntimeRow[] {
    return (this.dashboard?.paradasActivas ?? []).map((downtime) => ({
      ...downtime,
      equipo: this.equipmentForLine(downtime.lineaId),
      accionSugerida: this.suggestedAction(downtime.causa),
    }));
  }

  applyFilters(): void {
    this.filters = {
      ...this.filters,
      fechaDesde: this.selectedDate,
      fechaHasta: this.selectedDate,
    };
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.selectedDate = this.filters.fechaDesde;
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getProductionRealtime(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.lastUpdated = new Date();
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar Produccion Tiempo Real.';
        },
      });
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CO');
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  toneClass(tone: KpiTone): string {
    const classes: Record<KpiTone, string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  lineStatusClass(status: LineOperatingStatus): string {
    const classes: Record<LineOperatingStatus, string> = {
      OPERANDO: 'bg-emerald-50 text-emerald-700',
      LENTA: 'bg-amber-50 text-amber-700',
      PARADA: 'bg-red-50 text-red-700',
      CAMBIO_FORMATO: 'bg-sky-50 text-sky-700',
      MANTENIMIENTO: 'bg-slate-100 text-slate-700',
    };

    return classes[status];
  }

  severityClass(severity: ActiveDowntime['severidad']): string {
    const classes: Record<ActiveDowntime['severidad'], string> = {
      ALTA: 'bg-red-50 text-red-700',
      MEDIA: 'bg-amber-50 text-amber-700',
      BAJA: 'bg-slate-100 text-slate-700',
    };

    return classes[severity];
  }

  efficiencyTextClass(value: number): string {
    if (value >= 84) {
      return 'text-emerald-700';
    }

    if (value >= 78) {
      return 'text-amber-700';
    }

    return 'text-red-700';
  }

  hourlyCompliance(point: { valor: number; plan?: number | null }): number {
    return point.plan ? Number(((point.valor / point.plan) * 100).toFixed(1)) : 0;
  }

  hourlyWidth(value: number): number {
    const max = Math.max(...(this.dashboard?.produccionHora ?? []).flatMap((point) => [point.valor, point.plan ?? 0]), 1);
    return Math.max(8, Math.round((value / max) * 100));
  }

  private averageEfficiency(): number {
    const lines = this.dashboard?.eficienciaPorLinea ?? [];

    if (!lines.length) {
      return 0;
    }

    return Number((lines.reduce((sum, line) => sum + line.eficienciaPct, 0) / lines.length).toFixed(1));
  }

  private resolveLineStatus(line: ProductionLineStatus, downtime?: ActiveDowntime): LineOperatingStatus {
    if (downtime?.causa.toLowerCase().includes('mantenimiento')) {
      return 'MANTENIMIENTO';
    }

    if (downtime?.causa.toLowerCase().includes('formato')) {
      return 'CAMBIO_FORMATO';
    }

    if (downtime && downtime.duracionMin >= 15) {
      return 'PARADA';
    }

    if (line.eficienciaPct < 82 || line.cumplimientoPlanPct < 95) {
      return 'LENTA';
    }

    return 'OPERANDO';
  }

  private plantNameForLine(lineId: string): string {
    const plantsByLine: Record<string, string> = {
      'linea-bebibles-2': 'Planta lacteos frios',
      'linea-uht-1': 'Planta UHT',
      'linea-quesos-1': 'Planta principal El Arbolito',
      'linea-empaque-1': 'Planta principal El Arbolito',
    };

    return plantsByLine[lineId] ?? 'Planta principal El Arbolito';
  }

  private equipmentForLine(lineId: string): string {
    const equipmentByLine: Record<string, string> = {
      'linea-bebibles-2': 'Llenadora aseptica YG-02',
      'linea-uht-1': 'Esterilizador UHT-01',
      'linea-quesos-1': 'Prensa queso fresco QF-01',
      'linea-empaque-1': 'Empacadora flowpack EP-01',
    };

    return equipmentByLine[lineId] ?? 'Equipo de linea';
  }

  private suggestedAction(cause: string): string {
    const normalized = cause.toLowerCase();

    if (normalized.includes('material')) {
      return 'Escalar abastecimiento de material a SCM y validar inventario de seguridad.';
    }

    if (normalized.includes('calidad')) {
      return 'Solicitar liberacion de calidad y registrar causa de retrabajo si aplica.';
    }

    if (normalized.includes('limpieza') || normalized.includes('cip')) {
      return 'Confirmar ciclo sanitario y liberar linea con checklist de calidad.';
    }

    if (normalized.includes('formato')) {
      return 'Acompanamiento de lider de turno para reducir tiempo de cambio.';
    }

    return 'Coordinar mantenimiento y actualizar estimado de reinicio en el tablero.';
  }

  private defaultFilters(): ProductionRealtimeFilters {
    return {
      fechaDesde: '2026-05-05',
      fechaHasta: '2026-05-05',
      sedeId: null,
      lineaId: null,
      turnoId: null,
    };
  }
}
