import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  CommercialPerformanceFilters,
  CommercialPerformanceResponse,
} from '../../../domain/models/commercial-performance.model';

interface CommercialKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'amber' | 'slate';
}

@Component({
  selector: 'app-commercial-performance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-036</p>
            <h1 class="erp-page-title">Ventas y Cumplimiento Comercial</h1>
            <p class="erp-page-description">
              Desempeno comercial mock-first para {{ activeCompanyName }} con ventas diarias y mensuales,
              cumplimiento de meta, ranking de vendedores, zonas, clientes, ticket promedio y conversion.
              La visualizacion final queda preparada para Grafana sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como base comercial demo.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">15 minutos</p>
              <p class="erp-meta-card__hint">Contrato preparado para datamart comercial.</p>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos comerciales para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta filtros para consultar el cumplimiento comercial.</p>
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

        <section class="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking vendedores</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Cumplimiento por asesor comercial</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Vendedor</th>
                    <th class="px-4 py-3">Zona</th>
                    <th class="px-4 py-3">Ventas</th>
                    <th class="px-4 py-3">Meta</th>
                    <th class="px-4 py-3">Cumplimiento</th>
                    <th class="px-4 py-3">Pedidos</th>
                    <th class="px-4 py-3">Ticket promedio</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (seller of dashboard.topVendedores; track seller.vendedorId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ seller.vendedorNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ seller.zonaNombre }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ formatCurrency(seller.ventas) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(seller.meta) }}</td>
                      <td class="px-4 py-4">
                        <div class="min-w-32">
                          <div class="flex items-center justify-between gap-3">
                            <span class="font-semibold" [ngClass]="achievementClass(seller.cumplimientoMetaPct)">
                              {{ formatPercent(seller.cumplimientoMetaPct) }}
                            </span>
                          </div>
                          <div class="mt-2 h-2 rounded-full bg-slate-200">
                            <div class="h-full rounded-full bg-emerald-600" [style.width.%]="progressWidth(seller.cumplimientoMetaPct)"></div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ seller.pedidos }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(seller.ticketPromedio) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-4 py-8 text-center text-slate-500">
                        No hay vendedores para los filtros seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <aside class="space-y-6">
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ventas por zona</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Meta regional</h2>
              <div class="mt-5 space-y-3">
                @for (zone of dashboard.ventasPorZona; track zone.zonaId) {
                  <div class="rounded-md bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-slate-900">{{ zone.zonaNombre }}</p>
                        <p class="mt-1 text-sm text-slate-600">{{ zone.pedidos }} pedidos</p>
                      </div>
                      <span class="text-sm font-semibold" [ngClass]="achievementClass(zone.cumplimientoMetaPct)">
                        {{ formatPercent(zone.cumplimientoMetaPct) }}
                      </span>
                    </div>
                    <div class="mt-3 grid gap-2 text-sm text-slate-700">
                      <div class="flex justify-between gap-3">
                        <span>Ventas</span>
                        <span class="font-semibold text-slate-900">{{ formatCurrency(zone.ventas) }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span>Meta</span>
                        <span>{{ formatCurrency(zone.meta) }}</span>
                      </div>
                    </div>
                    <div class="mt-3 h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-emerald-600" [style.width.%]="progressWidth(zone.cumplimientoMetaPct)"></div>
                    </div>
                  </div>
                } @empty {
                  <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay zonas para mostrar.</p>
                }
              </div>
            </article>

            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen comercial</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Ticket y conversion</h2>
              <dl class="mt-5 grid gap-3">
                <div class="rounded-md bg-slate-50 p-4">
                  <dt class="text-xs font-semibold uppercase text-slate-500">Ticket promedio</dt>
                  <dd class="mt-2 text-xl font-semibold text-slate-950">{{ formatCurrency(dashboard.ticketPromedio) }}</dd>
                </div>
                <div class="rounded-md bg-slate-50 p-4">
                  <dt class="text-xs font-semibold uppercase text-slate-500">Conversion comercial</dt>
                  <dd class="mt-2 text-xl font-semibold text-slate-950">{{ formatPercent(dashboard.conversionComercial) }}</dd>
                </div>
              </dl>
            </article>
          </aside>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top clientes</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Base para HU-037 Clientes Estrategicos</h2>
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
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-4 py-8 text-center text-slate-500">
                        No hay clientes para los filtros seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Ventas y cumplimiento comercial</h2>
            <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
              <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
              <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
              <p class="mt-4 text-sm text-slate-600">
                La version final consultara el datamart comercial via Grafana. En esta fase no se crea token,
                URL firmada ni iframe real.
              </p>
              <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
                <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafana?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
              </div>
            </div>
          </article>
        </section>
      }
    </div>
  `,
})
export class CommercialPerformancePageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: CommercialPerformanceResponse | null = null;
  filters: CommercialPerformanceFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 5 }, (_, index) => index);
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

  get kpiCards(): CommercialKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      {
        label: 'Ventas del dia',
        value: this.formatCurrency(this.dashboard.ventasDia),
        hint: 'Corte operativo',
        tone: 'slate',
      },
      {
        label: 'Ventas del mes',
        value: this.formatCurrency(this.dashboard.ventasMes),
        hint: 'Acumulado',
        tone: 'green',
      },
      {
        label: 'Cumplimiento meta',
        value: this.formatPercent(this.dashboard.cumplimientoMeta),
        hint: this.dashboard.cumplimientoMeta >= 100 ? 'Sobre meta' : 'En seguimiento',
        tone: this.dashboard.cumplimientoMeta >= 100 ? 'green' : 'amber',
      },
      {
        label: 'Ticket promedio',
        value: this.formatCurrency(this.dashboard.ticketPromedio),
        hint: 'Por pedido',
        tone: 'slate',
      },
      {
        label: 'Conversion comercial',
        value: this.formatPercent(this.dashboard.conversionComercial),
        hint: 'Lead a pedido',
        tone: this.dashboard.conversionComercial >= 36 ? 'green' : 'amber',
      },
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

  toneClass(tone: CommercialKpiCard['tone']): string {
    const classes: Record<CommercialKpiCard['tone'], string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  achievementClass(value: number): string {
    if (value >= 100) {
      return 'text-emerald-700';
    }

    if (value >= 90) {
      return 'text-amber-700';
    }

    return 'text-red-700';
  }

  progressWidth(value: number): number {
    return Math.max(8, Math.min(100, Math.round(value)));
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getCommercialPerformance(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el desempeno comercial.';
        },
      });
  }

  private defaultFilters(): CommercialPerformanceFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      zonaId: null,
      vendedorId: null,
      clienteId: null,
    };
  }
}
