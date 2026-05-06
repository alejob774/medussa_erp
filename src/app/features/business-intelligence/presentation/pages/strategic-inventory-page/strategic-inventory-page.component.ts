import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  CriticalSku,
  InventoryAgingItem,
  StrategicInventoryFilters,
  StrategicInventoryResponse,
  StrategicInventoryRisk,
} from '../../../domain/models/strategic-inventory.model';

type Tone = 'green' | 'amber' | 'red' | 'slate';

interface CatalogOption {
  id: string;
  name: string;
}

interface InventoryKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}

interface BreakStockRow {
  producto: string;
  stockActual: number;
  referencia: number;
  diferencia: number;
  impactoEstimado: number;
  tipo: 'QUIEBRE' | 'SOBRESTOCK';
}

@Component({
  selector: 'app-strategic-inventory-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-042</p>
            <h1 class="erp-page-title">Inventario Estrategico</h1>
            <p class="erp-page-description">
              Vista supply chain mock-first para {{ activeCompanyName }}. Prioriza quiebres,
              sobrestock, capital inmovilizado, rotacion, cobertura y aging sin consultar Inventory Core
              ni Costos Core directamente.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo SCM.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Fecha corte</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ filters.fechaCorte || filters.fechaHasta }}</p>
              <p class="erp-meta-card__hint">Mock contractual preparado para DW.</p>
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bodega</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="bodegaId"
              [(ngModel)]="filters.bodegaId"
            >
              <option [ngValue]="null">Todas</option>
              @for (warehouse of warehouses; track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="categoriaId"
              [(ngModel)]="filters.categoriaId"
            >
              <option [ngValue]="null">Todas</option>
              @for (category of categories; track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Proveedor</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="proveedorId"
              [(ngModel)]="filters.proveedorId"
            >
              <option [ngValue]="null">Todos</option>
              @for (supplier of suppliers; track supplier.id) {
                <option [value]="supplier.id">{{ supplier.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha corte</span>
            <input
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="date"
              name="fechaCorte"
              [(ngModel)]="filters.fechaCorte"
            />
          </label>
          <div class="flex items-end gap-2">
            <button class="h-11" type="submit" mat-flat-button color="primary" [disabled]="loading">Aplicar</button>
            <button class="h-11" type="button" mat-stroked-button (click)="resetFilters()" [disabled]="loading">Limpiar</button>
          </div>
        </form>
      </section>

      @if (loading) {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de inventario para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta bodega, categoria, proveedor o fecha de corte.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
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

        <section class="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top SKU criticos</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Quiebres, sobrestock y capital inmovilizado</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">SKU / producto</th>
                    <th class="px-4 py-3">Categoria</th>
                    <th class="px-4 py-3">Bodega</th>
                    <th class="px-4 py-3">Stock</th>
                    <th class="px-4 py-3">Min / Max</th>
                    <th class="px-4 py-3">Cobertura</th>
                    <th class="px-4 py-3">Valor</th>
                    <th class="px-4 py-3">Riesgo</th>
                    <th class="px-4 py-3">Accion sugerida</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (sku of dashboard.topSkuCriticos; track sku.sku) {
                    <tr>
                      <td class="px-4 py-4">
                        <p class="font-semibold text-slate-900">{{ sku.productoNombre }}</p>
                        <p class="mt-1 font-mono text-xs text-slate-500">{{ sku.sku }}</p>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ sku.categoriaNombre || 'Sin categoria' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ sku.bodegaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatNumber(sku.stockActual) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatNumber(sku.stockMinimo) }} / {{ formatNumber(sku.stockMaximo || 0) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="sku.coberturaDias < 3 ? 'text-red-700' : 'text-slate-900'">{{ formatDays(sku.coberturaDias) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(sku.valorInventario) }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="riskClass(sku.riesgo)">{{ riskLabel(sku.riesgo) }}</span>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ actionForRisk(sku.riesgo) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="9" class="px-4 py-8 text-center text-slate-500">No hay SKU criticos para el filtro seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura ejecutiva</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Prioridades de inventario</h2>
            <div class="mt-5 space-y-4">
              @for (insight of executiveInsights; track insight.title) {
                <div class="rounded-md bg-slate-50 p-4">
                  <p class="font-semibold text-slate-950">{{ insight.title }}</p>
                  <p class="mt-2 text-sm text-slate-600">{{ insight.description }}</p>
                </div>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen por bodega</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Valor, ocupacion y riesgos</h2>
            </div>
            <div class="divide-y divide-slate-100">
              @for (warehouse of dashboard.inventarioPorBodega; track warehouse.bodegaId) {
                <div class="p-5">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ warehouse.bodegaNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ warehouse.observacion || 'Sin observacion' }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="trafficClass(warehouse.estado)">
                      {{ warehouse.estado }}
                    </span>
                  </div>
                  <div class="mt-4 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-md bg-slate-50 p-3"><p class="text-xs uppercase text-slate-500">Stock</p><p class="mt-1 font-semibold text-slate-950">{{ formatNumber(warehouse.stockActual) }}</p></div>
                    <div class="rounded-md bg-slate-50 p-3"><p class="text-xs uppercase text-slate-500">Valor</p><p class="mt-1 font-semibold text-slate-950">{{ formatCurrency(warehouse.valorInventario) }}</p></div>
                    <div class="rounded-md bg-slate-50 p-3"><p class="text-xs uppercase text-slate-500">Ocupacion</p><p class="mt-1 font-semibold text-slate-950">{{ formatPercent(warehouse.ocupacionPct || 0) }}</p></div>
                  </div>
                  <div class="mt-3 text-sm text-slate-700">
                    Quiebre: {{ warehouse.skuQuiebre || 0 }} SKU | Sobrestock: {{ warehouse.skuSobrestock || 0 }} SKU | Cobertura: {{ formatDays(warehouse.coberturaDias) }}
                  </div>
                </div>
              } @empty {
                <p class="p-5 text-sm text-slate-500">No hay resumen por bodega para el filtro seleccionado.</p>
              }
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Inventario lento / aging</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Mas de 60 dias sin movimiento</h2>
            <div class="mt-5 space-y-3">
              @for (item of slowInventoryItems; track item.sku || item.rangoDias) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ item.productoNombre || item.rangoDias }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ item.bodegaNombre || 'Todas las bodegas' }} | {{ item.diasSinMovimiento || 0 }} dias sin movimiento</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="riskClass(item.riesgo || 'LENTO_MOVIMIENTO')">
                      {{ riskLabel(item.riesgo || 'LENTO_MOVIMIENTO') }}
                    </span>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <span>Unidades {{ formatNumber(item.unidades) }}</span>
                    <span>Valor {{ formatCurrency(item.valorInventario) }}</span>
                    <span>{{ actionForRisk(item.riesgo || 'LENTO_MOVIMIENTO') }}</span>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay inventario lento con el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiebres y sobrestock</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Diferencias contra minimos y maximos</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">Producto</th>
                  <th class="px-4 py-3">Tipo</th>
                  <th class="px-4 py-3">Stock actual</th>
                  <th class="px-4 py-3">Referencia</th>
                  <th class="px-4 py-3">Diferencia</th>
                  <th class="px-4 py-3">Impacto estimado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                @for (row of breakStockRows; track row.producto + row.tipo) {
                  <tr>
                    <td class="px-4 py-4 font-semibold text-slate-900">{{ row.producto }}</td>
                    <td class="px-4 py-4">
                      <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="row.tipo === 'QUIEBRE' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'">{{ row.tipo }}</span>
                    </td>
                    <td class="px-4 py-4 text-slate-700">{{ formatNumber(row.stockActual) }}</td>
                    <td class="px-4 py-4 text-slate-700">{{ formatNumber(row.referencia) }}</td>
                    <td class="px-4 py-4 font-semibold" [ngClass]="row.tipo === 'QUIEBRE' ? 'text-red-700' : 'text-amber-700'">{{ formatNumber(row.diferencia) }}</td>
                    <td class="px-4 py-4 text-slate-700">{{ formatCurrency(row.impactoEstimado) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No hay quiebres ni sobrestock para el filtro seleccionado.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">Inventario Estrategico</h2>
          <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
            <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafanaEmbedConfig?.dashboardUid || 'medussa-inventory-strategic' }}</p>
            <p class="mt-4 text-sm text-slate-600">
              La version final consultara Data Warehouse y datamarts de inventario via Grafana. Esta HU no crea iframe real,
              token firmado, URL embebida, ETL ni conexion a backend.
            </p>
            <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafanaEmbedConfig?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Datasource futuro: DW/datamart</span>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class StrategicInventoryPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: StrategicInventoryResponse | null = null;
  filters: StrategicInventoryFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 7 }, (_, index) => index);
  readonly warehouses: CatalogOption[] = [
    { id: 'bg-prod-terminado', name: 'Producto terminado' },
    { id: 'bg-cuarentena', name: 'Cuarentena' },
    { id: 'bg-mp-lacteos', name: 'Materias primas' },
    { id: 'bg-empaques', name: 'Bodega principal / Empaques' },
  ];
  readonly categories: CatalogOption[] = [
    { id: 'cat-lacteos-bebibles', name: 'Lacteos bebibles' },
    { id: 'cat-uht', name: 'UHT' },
    { id: 'cat-quesos', name: 'Quesos frescos' },
    { id: 'cat-empaques', name: 'Empaques' },
  ];
  readonly suppliers: CatalogOption[] = [
    { id: 'sup-leche-sabana', name: 'Cooperativa Lechera Sabana' },
    { id: 'sup-empaques-andina', name: 'Empaques Andina' },
    { id: 'sup-cultivos-pro', name: 'Cultivos Probioticos SAS' },
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

  get kpiCards(): InventoryKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Stock actual', value: `${this.formatNumber(this.dashboard.stockActual)} uds`, hint: 'Total consolidado', tone: 'slate' },
      { label: 'Valor inventario', value: this.formatCurrency(this.dashboard.valorInventario), hint: 'Capital en inventario', tone: 'amber' },
      { label: 'Quiebres', value: this.formatNumber(this.dashboard.quiebres), hint: 'SKU bajo minimo', tone: this.dashboard.quiebres ? 'red' : 'green' },
      { label: 'Sobrestock', value: this.formatCurrency(this.dashboard.sobreinventario), hint: 'Exceso estimado', tone: 'amber' },
      { label: 'Inventario lento', value: this.formatCurrency(this.dashboard.inventarioLento), hint: '> 60 dias', tone: 'amber' },
      { label: 'Rotacion promedio', value: `${this.dashboard.rotacionPromedio.toLocaleString('es-CO')}x`, hint: 'Veces periodo', tone: this.dashboard.rotacionPromedio >= 5 ? 'green' : 'amber' },
      { label: 'Cobertura dias', value: this.formatDays(this.dashboard.coberturaDias), hint: 'Promedio total', tone: this.dashboard.coberturaDias > 25 ? 'amber' : 'green' },
    ];
  }

  get slowInventoryItems(): InventoryAgingItem[] {
    return (this.dashboard?.agingInventario ?? []).filter((item) => (item.diasSinMovimiento ?? 0) > 60);
  }

  get breakStockRows(): BreakStockRow[] {
    return (this.dashboard?.topSkuCriticos ?? [])
      .filter((sku) => sku.riesgo === 'QUIEBRE' || sku.riesgo === 'SOBREINVENTARIO')
      .map((sku) => {
        const isBreak = sku.riesgo === 'QUIEBRE';
        const reference = isBreak ? sku.stockMinimo : sku.stockMaximo ?? sku.stockMinimo;

        return {
          producto: sku.productoNombre,
          stockActual: sku.stockActual,
          referencia: reference,
          diferencia: isBreak ? reference - sku.stockActual : sku.stockActual - reference,
          impactoEstimado: sku.valorInventario,
          tipo: isBreak ? 'QUIEBRE' : 'SOBRESTOCK',
        };
      });
  }

  get executiveInsights(): Array<{ title: string; description: string }> {
    const firstCritical = this.dashboard?.topSkuCriticos[0];

    return [
      {
        title: 'Capital inmovilizado',
        description: `${this.formatCurrency(this.dashboard?.inventarioLento ?? 0)} estan concentrados en inventario lento y aging superior a 60 dias.`,
      },
      {
        title: 'Productos criticos a priorizar',
        description: firstCritical
          ? `${firstCritical.productoNombre} requiere accion por riesgo ${this.riskLabel(firstCritical.riesgo).toLowerCase()} en ${firstCritical.bodegaNombre}.`
          : 'No hay SKU criticos para el filtro seleccionado.',
      },
      {
        title: 'Riesgo de vencimiento',
        description: 'Cuarentena y producto terminado concentran riesgo de vencimiento en lacteos frescos; liberar, reprocesar o disponer lotes antes de compras adicionales.',
      },
      {
        title: 'Reabastecimiento y compras',
        description: 'Reabastecer yogurt bebible con cobertura menor a 3 dias y pausar compras de empaque PET hasta reducir sobrestock.',
      },
    ];
  }

  applyFilters(): void {
    this.filters = {
      ...this.filters,
      fechaDesde: this.filters.fechaCorte || this.filters.fechaDesde,
      fechaHasta: this.filters.fechaCorte || this.filters.fechaHasta,
    };
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CO');
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

  formatDays(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} dias`;
  }

  toneClass(tone: Tone): string {
    const classes: Record<Tone, string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  riskLabel(risk: StrategicInventoryRisk): string {
    const labels: Record<StrategicInventoryRisk, string> = {
      QUIEBRE: 'QUIEBRE',
      SOBREINVENTARIO: 'SOBRESTOCK',
      LENTO_MOVIMIENTO: 'LENTO_MOVIMIENTO',
      VENCIMIENTO: 'VENCIMIENTO',
      CAPITAL_INMOVILIZADO: 'CAPITAL_INMOVILIZADO',
    };

    return labels[risk];
  }

  riskClass(risk: StrategicInventoryRisk): string {
    const classes: Record<StrategicInventoryRisk, string> = {
      QUIEBRE: 'bg-red-50 text-red-700',
      SOBREINVENTARIO: 'bg-amber-50 text-amber-700',
      LENTO_MOVIMIENTO: 'bg-amber-50 text-amber-700',
      VENCIMIENTO: 'bg-red-50 text-red-700',
      CAPITAL_INMOVILIZADO: 'bg-slate-100 text-slate-700',
    };

    return classes[risk];
  }

  trafficClass(status: 'ROJO' | 'AMARILLO' | 'VERDE'): string {
    const classes = {
      ROJO: 'bg-red-50 text-red-700',
      AMARILLO: 'bg-amber-50 text-amber-700',
      VERDE: 'bg-emerald-50 text-emerald-700',
    };

    return classes[status];
  }

  actionForRisk(risk: StrategicInventoryRisk): string {
    const actions: Record<StrategicInventoryRisk, string> = {
      QUIEBRE: 'Reabastecer y ajustar MPS/demanda de corto plazo.',
      SOBREINVENTARIO: 'Pausar compra y activar salida comercial prioritaria.',
      LENTO_MOVIMIENTO: 'Revisar rotacion, FEFO y plan de liquidacion.',
      VENCIMIENTO: 'Liberar, reprocesar o disponer antes del vencimiento.',
      CAPITAL_INMOVILIZADO: 'Reducir compras y renegociar lote minimo.',
    };

    return actions[risk];
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getStrategicInventory(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar Inventario Estrategico.';
        },
      });
  }

  private defaultFilters(): StrategicInventoryFilters {
    return {
      fechaDesde: '2026-04-30',
      fechaHasta: '2026-04-30',
      fechaCorte: '2026-04-30',
      bodegaId: null,
      categoriaId: null,
      proveedorId: null,
      sedeId: null,
      lineaId: null,
      clasificacionAbc: null,
    };
  }
}
