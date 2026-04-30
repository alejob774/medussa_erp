import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  StrategicClientClassification,
  StrategicClientsFilters,
  StrategicClientsResponse,
  StrategicClientTrend,
} from '../../../domain/models/strategic-clients.model';

interface StrategicClientKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'amber' | 'red' | 'slate';
}

@Component({
  selector: 'app-strategic-clients-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-037</p>
            <h1 class="erp-page-title">Clientes Estrategicos</h1>
            <p class="erp-page-description">
              Vista comercial mock-first para {{ activeCompanyName }} enfocada en cartera clave,
              clientes inactivos, crecimiento, concentracion de ventas, frecuencia de compra y
              oportunidades de expansion. La visualizacion final queda preparada para Grafana sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Cartera demo de El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">30 minutos</p>
              <p class="erp-meta-card__hint">Contrato preparado para datamart de clientes.</p>
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
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendedor</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="vendedorId"
              [(ngModel)]="filters.vendedorId"
            >
              <option [ngValue]="null">Todos</option>
              @for (seller of sellers; track seller.id) {
                <option [value]="seller.id">{{ seller.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="clienteId"
              [(ngModel)]="filters.clienteId"
            >
              <option [ngValue]="null">Todos</option>
              @for (client of clients; track client.id) {
                <option [value]="client.id">{{ client.name }}</option>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de cartera para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta filtros para consultar clientes estrategicos.</p>
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

        <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.75fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking de clientes</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Cartera por valor y participacion</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Zona</th>
                    <th class="px-4 py-3">Vendedor</th>
                    <th class="px-4 py-3">Ventas</th>
                    <th class="px-4 py-3">Pedidos</th>
                    <th class="px-4 py-3">Ticket promedio</th>
                    <th class="px-4 py-3">Frecuencia</th>
                    <th class="px-4 py-3">Participacion</th>
                    <th class="px-4 py-3">Clasificacion</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (client of dashboard.topClientes; track client.clienteId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ client.clienteNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ client.zonaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ client.vendedorNombre }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ formatCurrency(client.ventas) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ client.pedidos }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(client.ticketPromedio) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ client.frecuenciaCompra }} compras/mes</td>
                      <td class="px-4 py-4">
                        <div class="min-w-28">
                          <span class="font-semibold text-slate-900">{{ formatPercent(client.participacionPct) }}</span>
                          <div class="mt-2 h-2 rounded-full bg-slate-200">
                            <div class="h-full rounded-full bg-emerald-600" [style.width.%]="progressWidth(client.participacionPct, 15)"></div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="classificationClass(client.clasificacion)">
                          {{ client.clasificacion }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="px-4 py-8 text-center text-slate-500">
                        No hay clientes para los filtros seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <aside class="space-y-6">
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Concentracion de ventas</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Riesgo de dependencia</h2>
              <div class="mt-5 space-y-4">
                <div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-slate-700">Top 5</span>
                    <span class="font-semibold text-slate-950">{{ formatPercent(dashboard.concentracionVentasTop5) }}</span>
                  </div>
                  <div class="mt-2 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600" [style.width.%]="dashboard.concentracionVentasTop5"></div>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-slate-700">Top 10</span>
                    <span class="font-semibold text-slate-950">{{ formatPercent(dashboard.concentracionVentasTop10) }}</span>
                  </div>
                  <div class="mt-2 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-amber-500" [style.width.%]="dashboard.concentracionVentasTop10"></div>
                  </div>
                </div>
              </div>
              <div class="mt-5 rounded-md bg-slate-50 p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel de riesgo</p>
                <span class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="riskClass(dashboard.concentracion.nivelRiesgo)">
                  {{ dashboard.concentracion.nivelRiesgo }}
                </span>
                <p class="mt-3 text-sm text-slate-600">{{ dashboard.concentracion.lecturaEjecutiva }}</p>
              </div>
            </article>

            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Clientes estrategicos</h2>
              <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
                <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
                <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
                <p class="mt-4 text-sm text-slate-600">
                  La version final consultara el datamart de clientes via Grafana. En esta fase no se crea token,
                  URL firmada ni iframe real.
                </p>
                <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
                  <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafana?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
                </div>
              </div>
            </article>
          </aside>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes inactivos</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Riesgo 30 / 60 / 90 dias</h2>
            </div>
            <div class="divide-y divide-slate-100">
              @for (client of dashboard.clientesInactivos; track client.clienteId) {
                <article class="p-5">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ client.clienteNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ client.zonaNombre }} - {{ client.vendedorNombre }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="inactiveClass(client.diasInactivo)">
                      {{ client.diasInactivo }} dias sin compra
                    </span>
                  </div>
                  <dl class="mt-4 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-md bg-slate-50 p-3">
                      <dt class="text-xs font-semibold uppercase text-slate-500">Ultima compra</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ client.ultimaCompra || 'Sin dato' }}</dd>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <dt class="text-xs font-semibold uppercase text-slate-500">Ventas historicas</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(client.ventasHistoricas) }}</dd>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <dt class="text-xs font-semibold uppercase text-slate-500">Ultimo periodo</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(client.ventasUltimoPeriodo) }}</dd>
                    </div>
                  </dl>
                  <p class="mt-4 text-sm text-slate-600">{{ client.accionSugerida }}</p>
                </article>
              } @empty {
                <p class="p-8 text-center text-sm text-slate-500">No hay clientes inactivos para los filtros seleccionados.</p>
              }
            </div>
          </article>

          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Crecimiento / caida</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Variacion por cliente</h2>
            </div>
            <div class="divide-y divide-slate-100">
              @for (growth of dashboard.crecimientoClientes; track growth.clienteId) {
                <article class="p-5">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ growth.clienteNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ growth.oportunidadSugerida }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="trendClass(growth.tendencia)">
                      {{ growth.tendencia }} {{ formatSignedPercent(growth.crecimientoPct) }}
                    </span>
                  </div>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs font-semibold uppercase text-slate-500">Periodo actual</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(growth.ventasPeriodoActual) }}</p>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs font-semibold uppercase text-slate-500">Periodo anterior</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(growth.ventasPeriodoAnterior) }}</p>
                    </div>
                  </div>
                </article>
              } @empty {
                <p class="p-8 text-center text-sm text-slate-500">No hay variaciones para los filtros seleccionados.</p>
              }
            </div>
          </article>
        </section>
      }
    </div>
  `,
})
export class StrategicClientsPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: StrategicClientsResponse | null = null;
  filters: StrategicClientsFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 6 }, (_, index) => index);
  readonly zones = [
    { id: 'bogota-norte', name: 'Bogota Norte' },
    { id: 'sabana', name: 'Sabana' },
    { id: 'centro', name: 'Centro' },
  ];
  readonly sellers = [
    { id: 'ven-001', name: 'Carolina Mejia' },
    { id: 'ven-002', name: 'Andres Rubio' },
    { id: 'ven-003', name: 'Natalia Gomez' },
    { id: 'ven-004', name: 'Felipe Torres' },
  ];
  readonly clients = [
    { id: 'cli-001', name: 'Distribuidora Santa Clara' },
    { id: 'cli-002', name: 'Supermercados La Colina' },
    { id: 'cli-003', name: 'Autoservicio El Prado' },
    { id: 'cli-004', name: 'Mayorista Los Andes' },
    { id: 'cli-005', name: 'Mercados Don Rafael' },
    { id: 'cli-006', name: 'Tienda La Esperanza' },
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

  get kpiCards(): StrategicClientKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    const topClient = this.dashboard.topClientes[0]?.clienteNombre ?? 'Sin datos';

    return [
      { label: 'Top cliente', value: topClient, hint: 'Mayor venta', tone: 'green' },
      { label: 'Clientes inactivos', value: String(this.dashboard.clientesInactivos.length), hint: '30/60/90 dias', tone: this.dashboard.clientesInactivos.length > 0 ? 'amber' : 'green' },
      { label: 'Concentracion top 5', value: this.formatPercent(this.dashboard.concentracionVentasTop5), hint: this.dashboard.concentracion.nivelRiesgo, tone: this.dashboard.concentracion.nivelRiesgo === 'ALTO' ? 'red' : 'amber' },
      { label: 'Concentracion top 10', value: this.formatPercent(this.dashboard.concentracionVentasTop10), hint: 'Base ampliada', tone: 'slate' },
      { label: 'Ticket promedio', value: this.formatCurrency(this.dashboard.ticketPromedioCliente), hint: 'Por cliente', tone: 'slate' },
      { label: 'Frecuencia compra', value: `${this.dashboard.frecuenciaCompra}x/mes`, hint: 'Promedio cartera', tone: 'green' },
    ];
  }

  applyFilters(): void {
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${this.formatPercent(value)}`;
  }

  progressWidth(value: number, max: number): number {
    return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
  }

  toneClass(tone: StrategicClientKpiCard['tone']): string {
    const classes: Record<StrategicClientKpiCard['tone'], string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  classificationClass(classification: StrategicClientClassification): string {
    const classes: Record<StrategicClientClassification, string> = {
      CLAVE: 'bg-emerald-50 text-emerald-700',
      CRECIMIENTO: 'bg-sky-50 text-sky-700',
      RIESGO: 'bg-amber-50 text-amber-700',
      INACTIVO: 'bg-red-50 text-red-700',
      OPORTUNIDAD: 'bg-indigo-50 text-indigo-700',
    };

    return classes[classification];
  }

  inactiveClass(days: number): string {
    if (days >= 90) {
      return 'bg-red-50 text-red-700';
    }

    if (days >= 60) {
      return 'bg-orange-50 text-orange-700';
    }

    return 'bg-amber-50 text-amber-700';
  }

  trendClass(trend: StrategicClientTrend): string {
    if (trend === 'CRECE') {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (trend === 'CAE') {
      return 'bg-red-50 text-red-700';
    }

    return 'bg-slate-100 text-slate-700';
  }

  riskClass(risk: StrategicClientsResponse['concentracion']['nivelRiesgo']): string {
    if (risk === 'ALTO') {
      return 'bg-red-50 text-red-700';
    }

    if (risk === 'MEDIO') {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getStrategicClients(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar clientes estrategicos.';
        },
      });
  }

  private defaultFilters(): StrategicClientsFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      vendedorId: null,
      zonaId: null,
      clienteId: null,
    };
  }
}
