import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import { GrafanaDemoEmbedComponent } from '../../components/grafana-demo-embed/grafana-demo-embed.component';
import {
  PriceVariationItem,
  StrategicPurchasingFilters,
  StrategicPurchasingResponse,
  SupplierRanking,
} from '../../../domain/models/strategic-purchasing.model';

type Tone = 'green' | 'amber' | 'red' | 'slate';
type SupplierClass = 'ESTRATEGICO' | 'CONFIABLE' | 'COSTOSO' | 'LENTO' | 'RIESGO';

interface CatalogOption {
  id: string;
  name: string;
}

interface PurchasingKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}

interface SupplierRankingRow extends SupplierRanking {
  clasificacion: SupplierClass;
  accionSugerida: string;
}

@Component({
  selector: 'app-strategic-purchasing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, GrafanaDemoEmbedComponent],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-043</p>
            <h1 class="erp-page-title">Compras Estrategicas</h1>
            <p class="erp-page-description">
              Analitica mock-first de abastecimiento para {{ activeCompanyName }}. Consolida ahorro,
              variaciones de precio, lead time, compras urgentes y cumplimiento proveedor sin conectar
              backend, ETL ni modulos operativos.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo de abastecimiento.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">1 hora</p>
              <p class="erp-meta-card__hint">Contrato listo para datamart de compras.</p>
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Comprador</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="compradorId"
              [(ngModel)]="filters.compradorId"
            >
              <option [ngValue]="null">Todos</option>
              @for (buyer of buyers; track buyer.id) {
                <option [value]="buyer.id">{{ buyer.name }}</option>
              }
            </select>
          </label>
          <div class="flex items-end gap-2">
            <button class="h-11" type="submit" mat-flat-button color="primary" [disabled]="loading">Aplicar</button>
            <button class="h-11" type="button" mat-stroked-button (click)="resetFilters()" [disabled]="loading">Limpiar</button>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de compras para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta fechas, proveedor, categoria o comprador para recargar el mock BI.</p>
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

        <section class="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking proveedores</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Costo, lead time y cumplimiento</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Proveedor</th>
                    <th class="px-4 py-3">Categoria</th>
                    <th class="px-4 py-3">Compras</th>
                    <th class="px-4 py-3">Precio prom.</th>
                    <th class="px-4 py-3">Lead time</th>
                    <th class="px-4 py-3">Cumplimiento</th>
                    <th class="px-4 py-3">Urgentes</th>
                    <th class="px-4 py-3">Score</th>
                    <th class="px-4 py-3">Clasificacion</th>
                    <th class="px-4 py-3">Accion sugerida</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (supplier of supplierRows; track supplier.proveedorId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ supplier.proveedorNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ supplier.categoriaPrincipal }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(supplier.compras) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(supplier.precioPromedio || 0) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatDays(supplier.leadTimeDias) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="supplier.cumplimientoPct >= 95 ? 'text-emerald-700' : 'text-amber-700'">{{ formatPercent(supplier.cumplimientoPct) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ supplier.comprasUrgentes || 0 }}</td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ supplier.score }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="supplierClassClass(supplier.clasificacion)">{{ supplier.clasificacion }}</span>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ supplier.accionSugerida }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="10" class="px-4 py-8 text-center text-slate-500">No hay proveedores para el filtro seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura ejecutiva</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Abastecimiento estrategico</h2>
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

        <section class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Variacion de precios</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Insumos con inflacion u oportunidad</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Insumo</th>
                    <th class="px-4 py-3">Categoria</th>
                    <th class="px-4 py-3">Anterior</th>
                    <th class="px-4 py-3">Actual</th>
                    <th class="px-4 py-3">Variacion</th>
                    <th class="px-4 py-3">Impacto</th>
                    <th class="px-4 py-3">Tendencia</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (item of priceVariations; track item.insumoId + item.fecha) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ item.insumoNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ item.categoriaNombre || 'Sin categoria' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(item.precioAnterior || 0) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(item.precioActual || item.valor) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="item.variacionPct > 0 ? 'text-red-700' : 'text-emerald-700'">{{ formatPercent(item.variacionPct) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(item.impactoEstimado || 0) }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="trendClass(item)">{{ item.tendencia || 'ESTABLE' }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">No hay variaciones para el filtro seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Cumplimiento proveedores</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Entregas, calidad y orden completa</h2>
            <div class="mt-5 space-y-3">
              @for (item of dashboard.cumplimientoProveedores; track item.proveedorId) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ item.proveedorNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ item.observacion || 'Sin observacion' }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="item.cumplimientoGlobalPct >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                      {{ formatPercent(item.cumplimientoGlobalPct) }}
                    </span>
                  </div>
                  <div class="mt-4 grid gap-3 sm:grid-cols-4">
                    <div class="rounded-md bg-white p-3 ring-1 ring-slate-200"><p class="text-xs uppercase text-slate-500">A tiempo</p><p class="mt-1 font-semibold text-slate-950">{{ formatPercent(item.entregasATiempoPct) }}</p></div>
                    <div class="rounded-md bg-white p-3 ring-1 ring-slate-200"><p class="text-xs uppercase text-slate-500">Lead time</p><p class="mt-1 font-semibold text-slate-950">{{ formatDays(item.leadTimeDias || 0) }}</p></div>
                    <div class="rounded-md bg-white p-3 ring-1 ring-slate-200"><p class="text-xs uppercase text-slate-500">Calidad</p><p class="mt-1 font-semibold text-slate-950">{{ formatPercent(item.calidadRecepcionPct) }}</p></div>
                    <div class="rounded-md bg-white p-3 ring-1 ring-slate-200"><p class="text-xs uppercase text-slate-500">Completas</p><p class="mt-1 font-semibold text-slate-950">{{ formatPercent(item.ordenesCompletasPct) }}</p></div>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay cumplimiento para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Compras urgentes</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Causas y recomendaciones</h2>
            <div class="mt-5 space-y-3">
              @for (urgent of dashboard.comprasUrgentesDetalle || []; track urgent.id) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ urgent.proveedorNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ urgent.categoriaNombre }} | {{ urgent.causa }}</p>
                    </div>
                    <span class="font-semibold text-slate-900">{{ formatCurrency(urgent.valor) }}</span>
                  </div>
                  <p class="mt-3 text-sm text-slate-700">{{ urgent.recomendacion }}</p>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay compras urgentes para el filtro seleccionado.</p>
              }
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Oportunidades</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Consolidacion y renegociacion</h2>
            <div class="mt-5 space-y-3">
              @for (opportunity of dashboard.oportunidades || []; track opportunity.id) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ opportunity.tipo }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ opportunity.proveedorNombre || 'Multi proveedor' }} | {{ opportunity.categoriaNombre }}</p>
                    </div>
                    <span class="font-semibold text-emerald-700">{{ formatCurrency(opportunity.impactoEstimado) }}</span>
                  </div>
                  <p class="mt-3 text-sm text-slate-700">{{ opportunity.recomendacion }}</p>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay oportunidades para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <app-bi-grafana-demo-embed
            [embedConfig]="dashboard.grafanaEmbedConfig"
            fallbackDashboardUid="medussa-purchases-strategic"
            title="Compras Estrategicas"
            description="La version final consultara Data Warehouse y datamarts de compras via Grafana. Esta fase demo/local no crea token firmado, URL productiva, ETL ni conexion a backend."
          ></app-bi-grafana-demo-embed>
        </section>
      }
    </div>
  `,
})
export class StrategicPurchasingPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: StrategicPurchasingResponse | null = null;
  filters: StrategicPurchasingFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 6 }, (_, index) => index);
  readonly suppliers: CatalogOption[] = [
    { id: 'sup-leche-sabana', name: 'Cooperativa Lechera Sabana' },
    { id: 'sup-empaques-andina', name: 'Empaques Andina' },
    { id: 'sup-cultivos-pro', name: 'Cultivos Probioticos SAS' },
    { id: 'sup-azucar-centro', name: 'Ingenio Centro' },
  ];
  readonly categories: CatalogOption[] = [
    { id: 'cat-leche-cruda', name: 'Leche cruda' },
    { id: 'cat-empaques', name: 'Empaques' },
    { id: 'cat-cultivos', name: 'Cultivos' },
    { id: 'cat-azucar', name: 'Endulzantes' },
  ];
  readonly buyers: CatalogOption[] = [
    { id: 'buyer-scm-001', name: 'Mariana Cardenas' },
    { id: 'buyer-scm-002', name: 'Julian Prieto' },
    { id: 'buyer-scm-003', name: 'Sandra Mora' },
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

  get kpiCards(): PurchasingKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    const compliance = this.averageCompliance();

    return [
      { label: 'Ahorro compras', value: this.formatCurrency(this.dashboard.ahorrosCompras), hint: 'Negociado periodo', tone: 'green' },
      { label: 'Proveedor mas costoso', value: this.dashboard.proveedorMasCostoso?.proveedorNombre ?? 'Sin datos', hint: this.dashboard.proveedorMasCostoso ? `${this.formatPercent(this.dashboard.proveedorMasCostoso.ahorroPct)} vs objetivo` : 'Sin alerta', tone: this.dashboard.proveedorMasCostoso ? 'red' : 'green' },
      { label: 'Lead time prom.', value: this.formatDays(this.dashboard.leadTimePromedioDias), hint: 'Dias proveedor', tone: this.dashboard.leadTimePromedioDias > 5 ? 'amber' : 'green' },
      { label: 'Compras urgentes', value: this.dashboard.comprasUrgentes.toLocaleString('es-CO'), hint: 'Ordenes no planeadas', tone: this.dashboard.comprasUrgentes > 10 ? 'red' : 'amber' },
      { label: 'Variacion precios', value: this.formatPercent(this.dashboard.variacionPreciosPct), hint: 'Insumos clave', tone: this.dashboard.variacionPreciosPct > 4 ? 'red' : 'amber' },
      { label: 'Cumplimiento prom.', value: this.formatPercent(compliance), hint: 'Proveedor global', tone: compliance >= 95 ? 'green' : 'amber' },
    ];
  }

  get supplierRows(): SupplierRankingRow[] {
    return (this.dashboard?.rankingProveedores ?? []).map((supplier) => {
      const clasificacion = this.classifySupplier(supplier);

      return {
        ...supplier,
        clasificacion,
        accionSugerida: this.actionForSupplier(clasificacion),
      };
    });
  }

  get priceVariations(): PriceVariationItem[] {
    return [...(this.dashboard?.tendenciaPrecios ?? [])].sort((left, right) => Math.abs(right.variacionPct) - Math.abs(left.variacionPct));
  }

  get executiveInsights(): Array<{ title: string; description: string }> {
    const costly = this.dashboard?.proveedorMasCostoso;
    const topUrgent = this.dashboard?.comprasUrgentesDetalle?.[0];

    return [
      {
        title: 'Renegociar primero',
        description: costly
          ? `${costly.proveedorNombre} debe priorizarse por ahorro negativo y categoria ${costly.categoriaPrincipal}.`
          : 'No hay proveedor costoso para el filtro seleccionado.',
      },
      {
        title: 'Impacto de urgencias',
        description: topUrgent
          ? `La urgencia principal es ${topUrgent.causa.toLowerCase()} por ${this.formatCurrency(topUrgent.valor)} en ${topUrgent.categoriaNombre}.`
          : 'Las urgencias estan controladas con el filtro actual.',
      },
      {
        title: 'Dependencia proveedor',
        description: 'Leche cruda concentra alto valor de compra, pero con buen cumplimiento; mantener contrato y backup homologado.',
      },
      {
        title: 'Recomendacion de abastecimiento',
        description: 'Renegociar empaques, ampliar lead time de planeacion y conectar forecast/inventario para reducir compras urgentes.',
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

  supplierClassClass(value: SupplierClass): string {
    const classes: Record<SupplierClass, string> = {
      ESTRATEGICO: 'bg-emerald-50 text-emerald-700',
      CONFIABLE: 'bg-sky-50 text-sky-700',
      COSTOSO: 'bg-red-50 text-red-700',
      LENTO: 'bg-amber-50 text-amber-700',
      RIESGO: 'bg-slate-100 text-slate-700',
    };

    return classes[value];
  }

  trendClass(item: PriceVariationItem): string {
    if (item.tendencia === 'BAJA' || item.variacionPct < 0) {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (item.tendencia === 'SUBE' || item.variacionPct > 4) {
      return 'bg-red-50 text-red-700';
    }

    return 'bg-slate-100 text-slate-700';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getStrategicPurchasing(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar Compras Estrategicas.';
        },
      });
  }

  private averageCompliance(): number {
    const rows = this.dashboard?.cumplimientoProveedores ?? [];

    if (!rows.length) {
      return 0;
    }

    return Number((rows.reduce((sum, item) => sum + item.cumplimientoGlobalPct, 0) / rows.length).toFixed(1));
  }

  private classifySupplier(supplier: SupplierRanking): SupplierClass {
    if (supplier.ahorroPct < 0 && supplier.cumplimientoPct < 92) {
      return 'RIESGO';
    }

    if (supplier.ahorroPct < 0) {
      return 'COSTOSO';
    }

    if (supplier.leadTimeDias > 6) {
      return 'LENTO';
    }

    if (supplier.score >= 90) {
      return 'ESTRATEGICO';
    }

    return 'CONFIABLE';
  }

  private actionForSupplier(value: SupplierClass): string {
    const actions: Record<SupplierClass, string> = {
      ESTRATEGICO: 'Mantener contrato marco y negociar escala de volumen.',
      CONFIABLE: 'Consolidar volumen y medir mejora mensual.',
      COSTOSO: 'Renegociar precio o abrir licitacion corta.',
      LENTO: 'Ampliar horizonte de planeacion y revisar lead time comprometido.',
      RIESGO: 'Activar proveedor alterno y plan de mitigacion.',
    };

    return actions[value];
  }

  private defaultFilters(): StrategicPurchasingFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      proveedorId: null,
      categoriaId: null,
      compradorId: null,
      moneda: 'COP',
    };
  }
}
