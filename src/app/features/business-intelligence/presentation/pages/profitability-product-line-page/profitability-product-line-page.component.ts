import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  ProductProfitabilityItem,
  ProfitabilityClassification,
  ProfitabilityFilters,
  ProfitabilityProductLineResponse,
} from '../../../domain/models/profitability.model';

interface ProfitabilityKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'green' | 'amber' | 'red' | 'slate';
}

@Component({
  selector: 'app-profitability-product-line-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-034</p>
            <h1 class="erp-page-title">Rentabilidad por Producto / Linea</h1>
            <p class="erp-page-description">
              Vista financiera mock-first para {{ activeCompanyName }} con margen por producto, linea y familia.
              Toma como referencia conceptual Costos Core, BOM estandar, ventas mock e indirectos asignados.
              La visualizacion final queda preparada para Grafana sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como caso de rentabilidad demo.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Fuente costo</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">Costos Core + mock BI</p>
              <p class="erp-meta-card__hint">Sin contabilidad ni Profit Intelligence todavia.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form class="grid gap-4 2xl:grid-cols-[1fr_1fr_1fr_1fr_0.7fr_0.7fr_auto]" (ngSubmit)="applyFilters()">
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Linea / familia</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="lineaProductoId"
              [(ngModel)]="filters.lineaProductoId"
            >
              <option [ngValue]="null">Todas</option>
              @for (line of lines; track line.id) {
                <option [value]="line.id">{{ line.name }}</option>
              }
            </select>
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="top"
              [(ngModel)]="filters.top"
            >
              <option [ngValue]="3">3</option>
              <option [ngValue]="5">5</option>
              <option [ngValue]="10">10</option>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de rentabilidad para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta filtros para consultar producto, linea o moneda.</p>
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

        <section class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
          <ng-container *ngTemplateOutlet="profitabilityTable; context: { title: 'Ranking productos mas rentables', subtitle: 'Productos con mayor margen y utilidad estimada.', rows: dashboard.topRentables, mode: 'best' }"></ng-container>
          <ng-container *ngTemplateOutlet="profitabilityTable; context: { title: 'Ranking productos menos rentables', subtitle: 'Productos con margen bajo, perdida o costo a revisar.', rows: dashboard.topNoRentables, mode: 'risk' }"></ng-container>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Rentabilidad por linea / familia</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Contribucion por portafolio</h2>
            <div class="mt-5 space-y-3">
              @for (line of dashboard.rentabilidadLineas; track line.lineaProductoId) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-semibold text-slate-900">{{ line.lineaProductoNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ formatPercent(line.participacionVentasPct) }} de ventas</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="marginTone(line.margenPromedioPct)">
                      {{ formatPercent(line.margenPromedioPct) }}
                    </span>
                  </div>
                  <dl class="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt class="text-xs font-semibold uppercase text-slate-500">Ventas</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(line.ventas) }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase text-slate-500">Costo total</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(line.costoTotal) }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase text-slate-500">Utilidad</dt>
                      <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrency(line.utilidad) }}</dd>
                    </div>
                  </dl>
                  <div class="mt-3 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600" [style.width.%]="progressWidth(line.participacionVentasPct)"></div>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay lineas para el filtro seleccionado.</p>
              }
            </div>
          </article>

          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tabla detalle de productos</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Ventas, costo y utilidad</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Producto</th>
                    <th class="px-4 py-3">Linea</th>
                    <th class="px-4 py-3">Ventas</th>
                    <th class="px-4 py-3">Costo variable</th>
                    <th class="px-4 py-3">Costo indirecto</th>
                    <th class="px-4 py-3">Utilidad</th>
                    <th class="px-4 py-3">Margen</th>
                    <th class="px-4 py-3">Clasificacion</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (product of dashboard.rankingProductos; track product.productoId) {
                    <tr>
                      <td class="px-4 py-4">
                        <p class="font-semibold text-slate-900">{{ product.productoNombre }}</p>
                        <p class="mt-1 text-xs text-slate-500">{{ product.sku }}</p>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ product.lineaProductoNombre }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ formatCurrency(product.ventas) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(product.costoVariable) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(product.costoIndirecto) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="product.utilidad >= 0 ? 'text-emerald-700' : 'text-red-700'">
                        {{ formatCurrency(product.utilidad) }}
                      </td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="marginTextClass(product.margenBrutoPct)">
                        {{ formatPercent(product.margenBrutoPct) }}
                      </td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="classificationClass(product.clasificacion)">
                          {{ product.clasificacion }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                        No hay productos para los filtros seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1fr_0.85fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura ejecutiva</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Recomendaciones de direccion</h2>
            <div class="mt-5 grid gap-3">
              @for (insight of dashboard.lecturaEjecutiva; track insight.titulo) {
                <article class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="insightClass(insight.severidad)">
                      {{ insight.severidad }}
                    </span>
                    <p class="font-semibold text-slate-950">{{ insight.titulo }}</p>
                  </div>
                  <p class="mt-2 text-sm text-slate-600">{{ insight.descripcion }}</p>
                </article>
              }
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Rentabilidad producto / linea</h2>
            <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
              <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
              <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
              <p class="mt-4 text-sm text-slate-600">
                La version final consultara datamarts financieros y de costos via Grafana. En esta fase no se crea
                token, URL firmada ni iframe real.
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

    <ng-template #profitabilityTable let-title="title" let-subtitle="subtitle" let-rows="rows" let-mode="mode">
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
                <th class="px-4 py-3">Ventas</th>
                <th class="px-4 py-3">Costo total</th>
                <th class="px-4 py-3">Utilidad</th>
                <th class="px-4 py-3">Margen</th>
                <th class="px-4 py-3">{{ mode === 'risk' ? 'Causa sugerida' : 'Clasificacion' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (row of rows; track row.productoId) {
                <tr>
                  <td class="px-4 py-4">
                    <p class="font-semibold text-slate-900">{{ row.productoNombre }}</p>
                    <p class="mt-1 text-xs text-slate-500">{{ row.sku }}</p>
                  </td>
                  <td class="px-4 py-4 text-slate-700">{{ row.lineaProductoNombre }}</td>
                  <td class="px-4 py-4 font-semibold text-slate-900">{{ formatCurrency(row.ventas) }}</td>
                  <td class="px-4 py-4 text-slate-700">{{ formatCurrency(row.costoVentas) }}</td>
                  <td class="px-4 py-4 font-semibold" [ngClass]="row.utilidad >= 0 ? 'text-emerald-700' : 'text-red-700'">
                    {{ formatCurrency(row.utilidad) }}
                  </td>
                  <td class="px-4 py-4 font-semibold" [ngClass]="marginTextClass(row.margenBrutoPct)">
                    {{ formatPercent(row.margenBrutoPct) }}
                  </td>
                  <td class="max-w-xs px-4 py-4">
                    @if (mode === 'risk') {
                      <p class="text-slate-600">{{ row.causaSugerida || 'Revisar costo asignado.' }}</p>
                    } @else {
                      <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="classificationClass(row.clasificacion)">
                        {{ row.clasificacion }}
                      </span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-8 text-center text-slate-500">
                    No hay productos para el filtro seleccionado.
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
export class ProfitabilityProductLinePageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: ProfitabilityProductLineResponse | null = null;
  filters: ProfitabilityFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 6 }, (_, index) => index);
  readonly lines = [
    { id: 'lacteos-bebibles', name: 'Lacteos bebibles' },
    { id: 'uht', name: 'UHT' },
    { id: 'quesos', name: 'Quesos' },
  ];
  readonly products = [
    { id: 'prod-arb-001', name: 'Yogurt bebible fresa 200 ml' },
    { id: 'prod-arb-002', name: 'Queso campesino 500 g' },
    { id: 'prod-arb-003', name: 'Leche entera UHT 1L' },
    { id: 'prod-arb-004', name: 'Kumis tradicional 150 g' },
    { id: 'prod-arb-005', name: 'Avena UHT 1L' },
    { id: 'prod-arb-006', name: 'Cuajada fresca 450 g' },
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

  get kpiCards(): ProfitabilityKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Producto mas rentable', value: this.dashboard.productoMasRentable?.productoNombre ?? 'Sin datos', hint: this.formatPercent(this.dashboard.productoMasRentable?.margenBrutoPct ?? 0), tone: 'green' },
      { label: 'Producto menos rentable', value: this.dashboard.productoMenosRentable?.productoNombre ?? 'Sin datos', hint: this.formatPercent(this.dashboard.productoMenosRentable?.margenBrutoPct ?? 0), tone: this.dashboard.productoMenosRentable && this.dashboard.productoMenosRentable.margenBrutoPct < 15 ? 'amber' : 'slate' },
      { label: 'Margen bruto promedio', value: this.formatPercent(this.dashboard.margenBrutoPromedio), hint: 'Utilidad / ventas', tone: this.dashboard.margenBrutoPromedio >= 25 ? 'green' : 'amber' },
      { label: 'Costos variables', value: this.formatCurrency(this.dashboard.costosVariables), hint: 'MP, empaque, MO, energia', tone: 'slate' },
      { label: 'Costos indirectos', value: this.formatCurrency(this.dashboard.costosIndirectos), hint: 'Asignacion mock', tone: 'slate' },
      { label: 'Utilidad estimada', value: this.formatCurrency(this.dashboard.utilidadEstimadaTotal), hint: 'Despues de costos', tone: this.dashboard.utilidadEstimadaTotal >= 0 ? 'green' : 'red' },
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
      currency: this.filters.moneda ?? 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  progressWidth(value: number): number {
    return Math.max(8, Math.min(100, Math.round(value)));
  }

  toneClass(tone: ProfitabilityKpiCard['tone']): string {
    const classes: Record<ProfitabilityKpiCard['tone'], string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  marginTone(value: number): string {
    if (value >= 30) {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (value >= 15) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-red-50 text-red-700';
  }

  marginTextClass(value: number): string {
    if (value >= 30) {
      return 'text-emerald-700';
    }

    if (value >= 15) {
      return 'text-amber-700';
    }

    return 'text-red-700';
  }

  classificationClass(classification: ProfitabilityClassification): string {
    const classes: Record<ProfitabilityClassification, string> = {
      ALTA_RENTABILIDAD: 'bg-emerald-50 text-emerald-700',
      RENTABLE: 'bg-sky-50 text-sky-700',
      MARGEN_BAJO: 'bg-amber-50 text-amber-700',
      PERDIDA: 'bg-red-50 text-red-700',
      REVISAR_COSTO: 'bg-orange-50 text-orange-700',
    };

    return classes[classification];
  }

  insightClass(severity: ProfitabilityProductLineResponse['lecturaEjecutiva'][number]['severidad']): string {
    if (severity === 'POSITIVA') {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (severity === 'CRITICA') {
      return 'bg-red-50 text-red-700';
    }

    return 'bg-amber-50 text-amber-700';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getProfitability(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar rentabilidad por producto / linea.';
        },
      });
  }

  private defaultFilters(): ProfitabilityFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      lineaProductoId: null,
      productoId: null,
      top: 3,
      moneda: 'COP',
    };
  }
}
