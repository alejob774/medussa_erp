import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  QualityCausePareto,
  QualityEventSummary,
  QualityNonconformityFilters,
  QualityNonconformityResponse,
} from '../../../domain/models/quality-nonconformity.model';

type Tone = 'green' | 'amber' | 'red' | 'slate';
type Risk = 'ALTO' | 'MEDIO' | 'BAJO';

interface CatalogOption {
  id: string;
  name: string;
}

interface QualityKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}

interface ParetoRow extends QualityCausePareto {
  categoria: string;
  accionSugerida: string;
}

interface CriticalQualityRow {
  item: string;
  tipoProblema: string;
  costo: number;
  frecuencia: number;
  riesgo: Risk;
  accionSugerida: string;
}

@Component({
  selector: 'app-quality-nonconformity-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-041</p>
            <h1 class="erp-page-title">Calidad y No Conformidades</h1>
            <p class="erp-page-description">
              Tablero mock-first para {{ activeCompanyName }} con rechazos, reclamos, scrap,
              retrabajos y costo de mala calidad. Preparado para consolidar eventos desde DW/datamarts
              sin conectar backend, ETL ni Grafana real.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo de calidad.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">15 minutos</p>
              <p class="erp-meta-card__hint">Contrato listo para datamart de calidad.</p>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos de calidad para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta fechas, producto, linea o cliente para recargar el mock BI.</p>
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

        <section class="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pareto / causas top</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Causas de mala calidad</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Causa</th>
                    <th class="px-4 py-3">Categoria</th>
                    <th class="px-4 py-3">Cantidad</th>
                    <th class="px-4 py-3">Costo</th>
                    <th class="px-4 py-3">Participacion</th>
                    <th class="px-4 py-3">Accion sugerida</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (cause of paretoRows; track cause.causaId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ cause.causaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ cause.categoria }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ cause.eventos }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(cause.costoEstimado) }}</td>
                      <td class="px-4 py-4">
                        <div class="min-w-28">
                          <div class="flex justify-between gap-2 text-xs font-semibold text-slate-700">
                            <span>{{ formatPercent(cause.participacionPct) }}</span>
                          </div>
                          <div class="mt-2 h-2 rounded-full bg-slate-200">
                            <div class="h-full rounded-full bg-emerald-600" [style.width.%]="cause.participacionPct"></div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ cause.accionSugerida }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-4 py-8 text-center text-slate-500">No hay causas para el filtro seleccionado.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Criticos por producto / linea / cliente</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Donde atacar primero</h2>
            <div class="mt-5 space-y-3">
              @for (critical of criticalRows; track critical.item + critical.tipoProblema) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ critical.item }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ critical.tipoProblema }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="riskClass(critical.riesgo)">
                      {{ critical.riesgo }}
                    </span>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <span>Costo {{ formatCurrency(critical.costo) }}</span>
                    <span>Frecuencia {{ critical.frecuencia }}</span>
                    <span>{{ critical.accionSugerida }}</span>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay criticidad para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Eventos de calidad</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Scrap, retrabajos, rechazos, reclamos y devoluciones</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Producto</th>
                    <th class="px-4 py-3">Linea</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Cantidad</th>
                    <th class="px-4 py-3">Costo</th>
                    <th class="px-4 py-3">Causa</th>
                    <th class="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (event of dashboard.eventosRecientes; track event.eventoId) {
                    <tr>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="eventTypeClass(event.tipo)">
                          {{ eventTypeLabel(event.tipo) }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <p class="font-semibold text-slate-900">{{ event.productoNombre }}</p>
                        <p class="mt-1 font-mono text-xs text-slate-500">{{ event.lote }}</p>
                      </td>
                      <td class="px-4 py-4 text-slate-700">{{ event.lineaNombre || 'Sin linea' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ event.clienteNombre || 'No aplica' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatNumber(event.cantidad) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(event.costoEstimado) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ event.causa || 'Sin causa clasificada' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ event.fecha }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-8 text-center text-slate-500">No hay eventos para el filtro seleccionado.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tendencia mensual</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Costo, scrap y reclamos</h2>
            <div class="mt-5 space-y-3">
              @for (point of dashboard.tendenciaMensual; track point.fecha) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-semibold text-slate-950">{{ point.fecha }}</p>
                    <p class="text-sm font-semibold text-red-700">{{ formatCurrency(point.costoMalaCalidad || 0) }}</p>
                  </div>
                  <div class="mt-3 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-red-500" [style.width.%]="trendWidth(point.costoMalaCalidad || 0)"></div>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <span>Scrap {{ formatNumber(point.scrapKg || 0) }} kg</span>
                    <span>Reclamos {{ point.reclamos || 0 }}</span>
                    <span>Lotes rechazados {{ point.valor }}</span>
                  </div>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay tendencia mensual para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">Calidad y No Conformidades</h2>
          <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
            <p class="mt-2 font-mono text-sm text-slate-700">
              {{ dashboard.grafanaEmbedConfig?.dashboardUid || 'medussa-quality-nc' }}
            </p>
            <p class="mt-4 text-sm text-slate-600">
              La version final consultara Data Warehouse y datamarts de calidad via Grafana. Esta HU no
              crea iframe real, token firmado, URL embebida, ETL ni conexion a backend.
            </p>
            <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                Iframe: {{ dashboard.grafanaEmbedConfig?.iframeAllowed ? 'habilitado' : 'no configurado' }}
              </span>
              <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Datasource futuro: DW/datamart</span>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class QualityNonconformityPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: QualityNonconformityResponse | null = null;
  filters: QualityNonconformityFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 5 }, (_, index) => index);
  readonly products: CatalogOption[] = [
    { id: 'prod-arb-001', name: 'Yogurt bebible fresa 200 ml' },
    { id: 'prod-arb-002', name: 'Queso campesino 500 g' },
    { id: 'prod-arb-003', name: 'Leche entera UHT 1L' },
    { id: 'prod-arb-004', name: 'Kumis tradicional 150 g' },
    { id: 'prod-arb-005', name: 'Avena UHT 1L' },
  ];
  readonly lines: CatalogOption[] = [
    { id: 'linea-bebibles-2', name: 'Linea Yogurt' },
    { id: 'linea-uht-1', name: 'Linea UHT' },
    { id: 'linea-quesos-1', name: 'Linea Quesos' },
    { id: 'linea-empaque-1', name: 'Linea Empaque' },
  ];
  readonly clients: CatalogOption[] = [
    { id: 'cli-001', name: 'Distribuidora Santa Clara' },
    { id: 'cli-002', name: 'Supermercados La Colina' },
    { id: 'cli-003', name: 'Autoservicio El Prado' },
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

  get kpiCards(): QualityKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Lotes rechazados', value: this.formatNumber(this.dashboard.lotesRechazados), hint: 'Periodo analizado', tone: this.dashboard.lotesRechazados > 5 ? 'amber' : 'green' },
      { label: 'Reclamos cliente', value: this.formatNumber(this.dashboard.reclamosCliente), hint: 'Eventos externos', tone: this.dashboard.reclamosCliente > 10 ? 'red' : 'amber' },
      { label: 'Scrap', value: `${this.formatNumber(this.dashboard.scrapKg)} kg`, hint: 'Merma registrada', tone: this.dashboard.scrapKg > 400 ? 'amber' : 'green' },
      { label: 'Retrabajos', value: this.formatNumber(this.dashboard.retrabajos), hint: 'Lotes reprocesados', tone: this.dashboard.retrabajos > 8 ? 'amber' : 'green' },
      { label: 'Costo mala calidad', value: this.formatCurrency(this.dashboard.costoMalaCalidad), hint: 'COP estimado', tone: this.dashboard.costoMalaCalidad > 15_000_000 ? 'red' : 'amber' },
    ];
  }

  get paretoRows(): ParetoRow[] {
    return (this.dashboard?.causasTop ?? []).map((cause) => ({
      ...cause,
      categoria: this.categoryForCause(cause.causaId),
      accionSugerida: this.actionForCause(cause.causaId),
    }));
  }

  get criticalRows(): CriticalQualityRow[] {
    const events = this.dashboard?.eventosRecientes ?? [];
    const grouped = new Map<string, QualityEventSummary[]>();

    events.forEach((event) => {
      const key = event.clienteNombre
        ? `Cliente: ${event.clienteNombre}`
        : event.lineaNombre
          ? `Linea: ${event.lineaNombre}`
          : `Producto: ${event.productoNombre}`;
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    });

    return Array.from(grouped.entries())
      .map(([item, rows]) => {
        const costo = rows.reduce((sum, event) => sum + event.costoEstimado, 0);
        const main = [...rows].sort((left, right) => right.costoEstimado - left.costoEstimado)[0];

        return {
          item,
          tipoProblema: main?.causa ?? main?.tipo ?? 'No conformidad',
          costo,
          frecuencia: rows.length,
          riesgo: costo > 1_500_000 || rows.length >= 2 ? 'ALTO' as const : costo > 800_000 ? 'MEDIO' as const : 'BAJO' as const,
          accionSugerida: this.actionForCause(this.causeKey(main?.causa)),
        };
      })
      .sort((left, right) => right.costo - left.costo);
  }

  applyFilters(): void {
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CO');
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

  toneClass(tone: Tone): string {
    const classes: Record<Tone, string> = {
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-red-50 text-red-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  riskClass(risk: Risk): string {
    const classes: Record<Risk, string> = {
      ALTO: 'bg-red-50 text-red-700',
      MEDIO: 'bg-amber-50 text-amber-700',
      BAJO: 'bg-emerald-50 text-emerald-700',
    };

    return classes[risk];
  }

  eventTypeLabel(type: QualityEventSummary['tipo']): string {
    const labels: Record<QualityEventSummary['tipo'], string> = {
      SCRAP: 'SCRAP',
      RETRABAJO: 'RETRABAJO',
      RECHAZO_LOTE: 'LOTE_RECHAZADO',
      RECLAMO_CLIENTE: 'RECLAMO_CLIENTE',
      DEVOLUCION: 'DEVOLUCION',
    };

    return labels[type];
  }

  eventTypeClass(type: QualityEventSummary['tipo']): string {
    const classes: Record<QualityEventSummary['tipo'], string> = {
      SCRAP: 'bg-red-50 text-red-700',
      RETRABAJO: 'bg-amber-50 text-amber-700',
      RECHAZO_LOTE: 'bg-red-50 text-red-700',
      RECLAMO_CLIENTE: 'bg-sky-50 text-sky-700',
      DEVOLUCION: 'bg-slate-100 text-slate-700',
    };

    return classes[type];
  }

  trendWidth(value: number): number {
    const max = Math.max(...(this.dashboard?.tendenciaMensual ?? []).map((point) => point.costoMalaCalidad ?? 0), 1);
    return Math.max(8, Math.round((value / max) * 100));
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getQualityNonconformities(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar Calidad y No Conformidades.';
        },
      });
  }

  private categoryForCause(causeId: string): string {
    const categories: Record<string, string> = {
      'materia-prima': 'Materia prima',
      maquina: 'Maquina',
      operador: 'Operador',
      proceso: 'Proceso',
      transporte: 'Transporte',
      almacenamiento: 'Almacenamiento',
      empaque: 'Empaque',
    };

    return categories[causeId] ?? 'Proceso';
  }

  private actionForCause(causeId: string): string {
    const actions: Record<string, string> = {
      'materia-prima': 'Reforzar inspeccion de recepcion y bloquear proveedor/lote reincidente.',
      maquina: 'Programar ajuste TPM y validar parametros de sellado/llenado.',
      operador: 'Reentrenar estandar operacional y checklist de arranque.',
      proceso: 'Revisar parametros criticos y liberar cambios con Calidad.',
      transporte: 'Auditar cadena de frio y condiciones de entrega por ruta.',
      almacenamiento: 'Validar FEFO, temperatura y tiempos maximos en bodega.',
      empaque: 'Inspeccionar empaque secundario y condiciones de palletizado.',
    };

    return actions[causeId] ?? 'Abrir analisis de causa raiz y definir contencion.';
  }

  private causeKey(cause?: string | null): string {
    const normalized = (cause ?? '').toLowerCase();

    if (normalized.includes('materia')) {
      return 'materia-prima';
    }

    if (normalized.includes('maquina') || normalized.includes('sellado')) {
      return 'maquina';
    }

    if (normalized.includes('operador')) {
      return 'operador';
    }

    if (normalized.includes('transporte') || normalized.includes('frio')) {
      return 'transporte';
    }

    if (normalized.includes('almacen')) {
      return 'almacenamiento';
    }

    if (normalized.includes('empaque')) {
      return 'empaque';
    }

    return 'proceso';
  }

  private defaultFilters(): QualityNonconformityFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      productoId: null,
      lineaId: null,
      clienteId: null,
      tipoEvento: null,
    };
  }
}
