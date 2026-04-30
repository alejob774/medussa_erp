import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  ManagerialAlert,
  ManagerialAlertsFilters,
  ManagerialAlertsResponse,
  ManagerialAlertType,
} from '../../../domain/models/managerial-alerts.model';
import { BiAlertSeverity, BiAlertStatus } from '../../../domain/models/bi-filter-context.model';

interface AlertSummaryCard {
  label: string;
  value: number;
  hint: string;
  tone: 'red' | 'amber' | 'green' | 'slate';
}

@Component({
  selector: 'app-managerial-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-035</p>
            <h1 class="erp-page-title">Alertas Gerenciales</h1>
            <p class="erp-page-description">
              Semaforo ejecutivo mock-first para {{ activeCompanyName }} con alertas de inventario, ventas,
              OEE, pedidos, presupuesto y margen. La capa final queda preparada para Grafana sobre Data Warehouse.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito concentra el caso BI gerencial.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">5 minutos</p>
              <p class="erp-meta-card__hint">Contrato preparado para datamart de alertas.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form class="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]" (ngSubmit)="applyFilters()">
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
              <option [ngValue]="null">Todas</option>
              <option value="arb-planta-principal">Planta principal</option>
              <option value="arb-bogota-norte">Bogota Norte</option>
              <option value="arb-sabana">Sabana</option>
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Severidad</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="severidad"
              [(ngModel)]="filters.severidad"
            >
              <option value="TODAS">Todas</option>
              <option value="ROJA">Roja</option>
              <option value="AMARILLA">Amarilla</option>
              <option value="VERDE">Verde</option>
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="tipoAlerta"
              [(ngModel)]="filters.tipoAlerta"
            >
              <option value="TODAS">Todos</option>
              @for (type of alertTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="estado"
              [(ngModel)]="filters.estado"
            >
              <option value="TODAS">Todos</option>
              <option value="ABIERTA">Abierta</option>
              <option value="EN_GESTION">En gestion</option>
              <option value="CERRADA">Cerrada</option>
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
            <article class="h-28 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div class="h-3 w-28 rounded bg-slate-200"></div>
              <div class="mt-5 h-8 w-16 rounded bg-slate-200"></div>
            </article>
          }
        </section>
      } @else if (!dashboard) {
        <section class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p class="text-lg font-semibold text-slate-900">Sin alertas para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta filtros para consultar el semaforo gerencial.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (card of summaryCards; track card.label) {
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
              <div class="mt-4 flex items-end justify-between gap-4">
                <p class="text-3xl font-semibold text-slate-950">{{ card.value }}</p>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="summaryToneClass(card.tone)">
                  {{ card.hint }}
                </span>
              </div>
            </article>
          }
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1.45fr_0.75fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Listado de alertas</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Semaforo gerencial operativo</h2>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Severidad</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Mensaje</th>
                    <th class="px-4 py-3">Valor detectado</th>
                    <th class="px-4 py-3">Umbral</th>
                    <th class="px-4 py-3">Responsable</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (alert of dashboard.alertas; track alert.id) {
                    <tr class="align-top">
                      <td class="px-4 py-4">
                        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="severityClass(alert.severidad)">
                          {{ alert.severidad }}
                        </span>
                      </td>
                      <td class="px-4 py-4 font-medium text-slate-800">{{ typeLabel(alert.tipoAlerta) }}</td>
                      <td class="max-w-md px-4 py-4">
                        <p class="font-semibold text-slate-900">{{ alert.titulo }}</p>
                        <p class="mt-1 text-slate-600">{{ alert.descripcion }}</p>
                        <p class="mt-1 text-xs text-slate-500">{{ alert.sedeNombre || 'Todas las sedes' }}</p>
                      </td>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ alert.valorDetectado ?? 'N/D' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ alert.umbral ?? 'N/D' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ alert.responsableSugerido || 'Pendiente' }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {{ statusLabel(alert.estado) }}
                        </span>
                      </td>
                      <td class="px-4 py-4 text-slate-600">{{ alert.fechaDeteccion }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                        No hay alertas para los filtros seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <aside class="space-y-6">
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen por tipo</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Concentracion de eventos</h2>
              <div class="mt-5 space-y-3">
                @for (item of alertsByType; track item.type) {
                  <div class="rounded-md bg-slate-50 p-3">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm font-semibold text-slate-800">{{ typeLabel(item.type) }}</p>
                      <span class="text-sm font-semibold text-slate-950">{{ item.count }}</span>
                    </div>
                    <div class="mt-2 h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-emerald-600" [style.width.%]="typeWidth(item.count)"></div>
                    </div>
                  </div>
                }
              </div>
            </article>

            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Alertas gerenciales</h2>
              <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
                <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
                <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafana?.dashboardUid || 'pendiente' }}</p>
                <p class="mt-4 text-sm text-slate-600">
                  La version final consultara el datamart de alertas gerenciales via Grafana. No hay iframe,
                  token ni URL real en esta fase.
                </p>
                <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
                  <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: {{ dashboard.grafana?.iframeAllowed ? 'habilitado' : 'no configurado' }}</span>
                </div>
              </div>
            </article>
          </aside>
        </section>
      }
    </div>
  `,
})
export class ManagerialAlertsPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: ManagerialAlertsResponse | null = null;
  filters: ManagerialAlertsFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 4 }, (_, index) => index);
  readonly alertTypes: Array<{ value: ManagerialAlertType; label: string }> = [
    { value: 'QUIEBRE_STOCK', label: 'Quiebre stock' },
    { value: 'CAIDA_VENTAS', label: 'Caida ventas' },
    { value: 'OEE_BAJO', label: 'OEE bajo' },
    { value: 'PEDIDOS_ATRASADOS', label: 'Pedidos atrasados' },
    { value: 'DESVIACION_PRESUPUESTO', label: 'Desviacion presupuesto' },
    { value: 'MARGEN_BAJO', label: 'Margen bajo' },
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

  get summaryCards(): AlertSummaryCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Alertas rojas', value: this.dashboard.totalRojas, hint: 'Criticas', tone: 'red' },
      { label: 'Alertas amarillas', value: this.dashboard.totalAmarillas, hint: 'Seguimiento', tone: 'amber' },
      { label: 'Verdes / normalizadas', value: this.dashboard.totalVerdes, hint: 'Controladas', tone: 'green' },
      { label: 'Total abiertas', value: this.dashboard.totalAbiertas, hint: 'Activas', tone: 'slate' },
    ];
  }

  get alertsByType(): Array<{ type: ManagerialAlertType; count: number }> {
    const counts = new Map<ManagerialAlertType, number>();

    (this.dashboard?.alertas ?? []).forEach((alert) => {
      counts.set(alert.tipoAlerta, (counts.get(alert.tipoAlerta) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }

  applyFilters(): void {
    this.reload();
  }

  resetFilters(): void {
    this.filters = this.defaultFilters();
    this.reload();
  }

  severityClass(severity: BiAlertSeverity): string {
    if (severity === 'ROJA') {
      return 'bg-red-100 text-red-800';
    }

    if (severity === 'AMARILLA') {
      return 'bg-amber-100 text-amber-800';
    }

    return 'bg-emerald-100 text-emerald-800';
  }

  summaryToneClass(tone: AlertSummaryCard['tone']): string {
    const classes: Record<AlertSummaryCard['tone'], string> = {
      red: 'bg-red-50 text-red-700',
      amber: 'bg-amber-50 text-amber-700',
      green: 'bg-emerald-50 text-emerald-700',
      slate: 'bg-slate-100 text-slate-700',
    };

    return classes[tone];
  }

  typeLabel(type: ManagerialAlertType): string {
    return this.alertTypes.find((item) => item.value === type)?.label ?? type.replace(/_/g, ' ');
  }

  statusLabel(status: BiAlertStatus): string {
    const labels: Record<BiAlertStatus, string> = {
      ABIERTA: 'Abierta',
      EN_GESTION: 'En gestion',
      CERRADA: 'Cerrada',
    };

    return labels[status];
  }

  typeWidth(count: number): number {
    const max = Math.max(...this.alertsByType.map((item) => item.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getManagerialAlerts(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar las alertas gerenciales.';
        },
      });
  }

  private defaultFilters(): ManagerialAlertsFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      sedeId: null,
      estado: 'TODAS',
      severidad: 'TODAS',
      tipoAlerta: 'TODAS',
    };
  }
}
