import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  FleetUtilization,
  LogisticsKpiFilters,
  LogisticsKpiResponse,
  RoutePerformance,
} from '../../../domain/models/logistics-kpi.model';

type Tone = 'green' | 'amber' | 'red' | 'slate';
type FleetStatus = 'ALTA' | 'OPTIMA' | 'BAJA' | 'SUBUTILIZADA';

interface CatalogOption {
  id: string;
  name: string;
}

interface LogisticsKpiCard {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}

interface FleetRow extends FleetUtilization {
  estadoUtilizacion: FleetStatus;
}

@Component({
  selector: 'app-logistics-kpi-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-044</p>
            <h1 class="erp-page-title">KPI Logisticos</h1>
            <p class="erp-page-description">
              Tablero supply chain mock-first para {{ activeCompanyName }}. Mide costo de transporte,
              pedidos, rutas, conductores, flota, kilometraje y puntualidad sin consultar Conductores,
              Rutas, Equipos, Picking/Packing ni Costos directamente.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo logistico.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Refresh esperado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">15 minutos</p>
              <p class="erp-meta-card__hint">Contrato listo para datamart logistico.</p>
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
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ruta</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="rutaId"
              [(ngModel)]="filters.rutaId"
            >
              <option [ngValue]="null">Todas</option>
              @for (route of routes; track route.id) {
                <option [value]="route.id">{{ route.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Conductor</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="conductorId"
              [(ngModel)]="filters.conductorId"
            >
              <option [ngValue]="null">Todos</option>
              @for (driver of drivers; track driver.id) {
                <option [value]="driver.id">{{ driver.name }}</option>
              }
            </select>
          </label>
          <label class="space-y-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Vehiculo</span>
            <select
              class="h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="vehiculoId"
              [(ngModel)]="filters.vehiculoId"
            >
              <option [ngValue]="null">Todos</option>
              @for (vehicle of vehicles; track vehicle.id) {
                <option [value]="vehicle.id">{{ vehicle.name }}</option>
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
          <p class="text-lg font-semibold text-slate-900">Sin datos logisticos para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta fechas, ruta, conductor o vehiculo para recargar el mock BI.</p>
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
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking de rutas</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Costo, kilometraje y puntualidad</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Ruta</th>
                    <th class="px-4 py-3">Zona</th>
                    <th class="px-4 py-3">Pedidos</th>
                    <th class="px-4 py-3">Entregas</th>
                    <th class="px-4 py-3">Costo</th>
                    <th class="px-4 py-3">Costo pedido</th>
                    <th class="px-4 py-3">Km</th>
                    <th class="px-4 py-3">Puntualidad</th>
                    <th class="px-4 py-3">Observacion</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (route of dashboard.rankingRutas; track route.rutaId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ route.rutaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ route.zonaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ route.pedidos }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ route.entregas || 0 }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(route.costoTransporte) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="route.costoPorPedido > 150000 ? 'text-red-700' : 'text-slate-900'">{{ formatCurrency(route.costoPorPedido) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatKm(route.kmRecorridos) }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="route.puntualidadEntregaPct >= 92 ? 'text-emerald-700' : 'text-amber-700'">{{ formatPercent(route.puntualidadEntregaPct) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ route.observacion || 'Sin observacion' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="9" class="px-4 py-8 text-center text-slate-500">No hay rutas para el filtro seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura ejecutiva</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Optimizacion logistica</h2>
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
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking de conductores</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Productividad y apoyo operativo</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Conductor</th>
                    <th class="px-4 py-3">Ruta principal</th>
                    <th class="px-4 py-3">Entregas</th>
                    <th class="px-4 py-3">Puntualidad</th>
                    <th class="px-4 py-3">Km</th>
                    <th class="px-4 py-3">Costo asociado</th>
                    <th class="px-4 py-3">Productividad</th>
                    <th class="px-4 py-3">Observacion</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (driver of dashboard.rankingConductores; track driver.conductorId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ driver.conductorNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ driver.rutaPrincipalNombre || 'Sin ruta' }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ driver.entregas }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="driver.puntualidadEntregaPct >= 92 ? 'text-emerald-700' : 'text-amber-700'">{{ formatPercent(driver.puntualidadEntregaPct) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatKm(driver.kmRecorridos) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatCurrency(driver.costoAsociado || 0) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ driver.productividad || 0 }} entregas/100km</td>
                      <td class="px-4 py-4 text-slate-700">{{ driver.observacion || 'Sin observacion' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="8" class="px-4 py-8 text-center text-slate-500">No hay conductores para el filtro seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Utilizacion de flota</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Vehiculos, carga y accion sugerida</h2>
            <div class="mt-5 space-y-3">
              @for (vehicle of fleetRows; track vehicle.vehiculoId) {
                <div class="rounded-md bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="font-semibold text-slate-950">{{ vehicle.placa }} | {{ vehicle.tipoVehiculo }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ vehicle.conductorNombre || 'Sin conductor' }} | {{ vehicle.estado }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="fleetStatusClass(vehicle.estadoUtilizacion)">
                      {{ vehicle.estadoUtilizacion }}
                    </span>
                  </div>
                  <div class="mt-3 h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600" [style.width.%]="vehicle.utilizacionPct"></div>
                  </div>
                  <div class="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <span>Capacidad {{ formatKg(vehicle.capacidadKg || 0) }}</span>
                    <span>Carga {{ formatKg(vehicle.cargaUtilizadaKg || 0) }}</span>
                    <span>{{ formatPercent(vehicle.utilizacionPct) }}</span>
                  </div>
                  <p class="mt-3 text-sm text-slate-700">{{ vehicle.accionSugerida || actionForFleet(vehicle.estadoUtilizacion) }}</p>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay flota para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Costos y puntualidad</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Resumen operativo</h2>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-md bg-slate-50 p-4"><p class="text-xs uppercase text-slate-500">Costo por ruta prom.</p><p class="mt-2 text-xl font-semibold text-slate-950">{{ formatCurrency(avgRouteCost) }}</p></div>
              <div class="rounded-md bg-slate-50 p-4"><p class="text-xs uppercase text-slate-500">Costo por pedido</p><p class="mt-2 text-xl font-semibold text-slate-950">{{ formatCurrency(dashboard.costoPorPedido) }}</p></div>
              <div class="rounded-md bg-slate-50 p-4"><p class="text-xs uppercase text-slate-500">Puntualidad general</p><p class="mt-2 text-xl font-semibold text-slate-950">{{ formatPercent(dashboard.puntualidadEntrega) }}</p></div>
              <div class="rounded-md bg-slate-50 p-4"><p class="text-xs uppercase text-slate-500">Tardias / reentregas</p><p class="mt-2 text-xl font-semibold text-slate-950">{{ dashboard.entregasTardias || 0 }} / {{ dashboard.reentregas || 0 }}</p></div>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tendencia de costos</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Costo por pedido y puntualidad</h2>
            <div class="mt-5 space-y-3">
              @for (point of dashboard.tendenciaCostos || []; track point.fecha) {
                <div class="grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-[5rem_1fr_8rem_7rem] sm:items-center">
                  <span class="font-semibold text-slate-900">{{ point.fecha }}</span>
                  <div class="h-2 rounded-full bg-slate-200">
                    <div class="h-full rounded-full bg-emerald-600" [style.width.%]="costWidth(point.costoTransporte)"></div>
                  </div>
                  <span class="text-sm text-slate-700">{{ formatCurrency(point.costoPorPedido) }}</span>
                  <span class="text-sm font-semibold text-slate-900">{{ formatPercent(point.puntualidadEntregaPct) }}</span>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay tendencia para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">KPI Logisticos</h2>
          <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
            <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboard.grafanaEmbedConfig?.dashboardUid || 'medussa-logistics-kpi' }}</p>
            <p class="mt-4 text-sm text-slate-600">
              La version final consultara Data Warehouse y datamarts logisticos via Grafana. Esta HU no crea iframe real,
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
export class LogisticsKpiPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: LogisticsKpiResponse | null = null;
  filters: LogisticsKpiFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 7 }, (_, index) => index);
  readonly routes: CatalogOption[] = [
    { id: 'ruta-bog-norte', name: 'Bogota Norte TAT' },
    { id: 'ruta-sabana', name: 'Sabana mayoristas' },
    { id: 'ruta-centro', name: 'Centro tradicional' },
    { id: 'ruta-sur-institucional', name: 'Sur institucional' },
  ];
  readonly drivers: CatalogOption[] = [
    { id: 'drv-001', name: 'Hector Molina' },
    { id: 'drv-002', name: 'Paula Rojas' },
    { id: 'drv-003', name: 'Ivan Cardenas' },
    { id: 'drv-004', name: 'Marcela Gil' },
  ];
  readonly vehicles: CatalogOption[] = [
    { id: 'veh-001', name: 'ARB-241 | Furgon refrigerado' },
    { id: 'veh-002', name: 'ARB-318 | Camion NHR' },
    { id: 'veh-003', name: 'ARB-156 | Turbo refrigerado' },
    { id: 'veh-004', name: 'ARB-412 | VAN refrigerada' },
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

  get kpiCards(): LogisticsKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      { label: 'Costo transporte', value: this.formatCurrency(this.dashboard.costoTransporte), hint: 'Total periodo', tone: 'amber' },
      { label: 'Costo por pedido', value: this.formatCurrency(this.dashboard.costoPorPedido), hint: 'Promedio despacho', tone: this.dashboard.costoPorPedido > 145_000 ? 'red' : 'green' },
      { label: 'Pedidos por ruta', value: this.dashboard.pedidosPorRuta.toLocaleString('es-CO'), hint: 'Promedio ruta', tone: 'slate' },
      { label: 'Entregas conductor', value: this.dashboard.entregasPorConductor.toLocaleString('es-CO'), hint: 'Promedio conductor', tone: 'slate' },
      { label: 'Utilizacion flota', value: this.formatPercent(this.dashboard.utilizacionFlota), hint: 'Uso vehiculos', tone: this.dashboard.utilizacionFlota >= 80 ? 'green' : 'amber' },
      { label: 'Km recorridos', value: this.formatKm(this.dashboard.kmRecorridos), hint: 'Total rutas', tone: 'slate' },
      { label: 'Puntualidad', value: this.formatPercent(this.dashboard.puntualidadEntrega), hint: 'Entrega a tiempo', tone: this.dashboard.puntualidadEntrega >= 92 ? 'green' : 'amber' },
    ];
  }

  get fleetRows(): FleetRow[] {
    return (this.dashboard?.flota ?? []).map((vehicle) => ({
      ...vehicle,
      estadoUtilizacion: this.fleetStatus(vehicle.utilizacionPct),
    }));
  }

  get avgRouteCost(): number {
    const routes = this.dashboard?.rankingRutas ?? [];

    return routes.length ? Math.round(routes.reduce((sum, route) => sum + route.costoTransporte, 0) / routes.length) : 0;
  }

  get executiveInsights(): Array<{ title: string; description: string }> {
    const expensiveRoute = [...(this.dashboard?.rankingRutas ?? [])].sort((a, b) => b.costoPorPedido - a.costoPorPedido)[0];
    const bestDriver = this.dashboard?.rankingConductores[0];
    const underusedVehicle = this.fleetRows.find((vehicle) => vehicle.estadoUtilizacion === 'SUBUTILIZADA' || vehicle.estadoUtilizacion === 'BAJA');

    return [
      {
        title: 'Ruta a optimizar',
        description: expensiveRoute
          ? `${expensiveRoute.rutaNombre} tiene costo por pedido de ${this.formatCurrency(expensiveRoute.costoPorPedido)} y puntualidad de ${this.formatPercent(expensiveRoute.puntualidadEntregaPct)}.`
          : 'No hay rutas para el filtro seleccionado.',
      },
      {
        title: 'Vehiculo subutilizado',
        description: underusedVehicle
          ? `${underusedVehicle.placa} opera al ${this.formatPercent(underusedVehicle.utilizacionPct)}; evaluar consolidacion o reasignacion.`
          : 'La flota se mantiene en utilizacion aceptable.',
      },
      {
        title: 'Mejor desempeno conductor',
        description: bestDriver
          ? `${bestDriver.conductorNombre} lidera puntualidad con ${this.formatPercent(bestDriver.puntualidadEntregaPct)}.`
          : 'No hay ranking de conductores para el filtro actual.',
      },
      {
        title: 'Recomendacion de consolidacion',
        description: 'Consolidar Sur institucional con Centro tradicional en dias de baja carga y ajustar ventanas de recibo en Sabana.',
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

  formatKm(value: number): string {
    return `${value.toLocaleString('es-CO')} km`;
  }

  formatKg(value: number): string {
    return `${value.toLocaleString('es-CO')} kg`;
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

  fleetStatusClass(status: FleetStatus): string {
    const classes: Record<FleetStatus, string> = {
      ALTA: 'bg-amber-50 text-amber-700',
      OPTIMA: 'bg-emerald-50 text-emerald-700',
      BAJA: 'bg-sky-50 text-sky-700',
      SUBUTILIZADA: 'bg-red-50 text-red-700',
    };

    return classes[status];
  }

  actionForFleet(status: FleetStatus): string {
    const actions: Record<FleetStatus, string> = {
      ALTA: 'Monitorear sobrecarga y balancear pedidos con otra unidad.',
      OPTIMA: 'Mantener asignacion y secuencia actual.',
      BAJA: 'Complementar con pedidos cercanos o rutas express.',
      SUBUTILIZADA: 'Consolidar ruta o reasignar vehiculo.',
    };

    return actions[status];
  }

  costWidth(value: number): number {
    const max = Math.max(...(this.dashboard?.tendenciaCostos ?? []).map((point) => point.costoTransporte), 1);
    return Math.max(8, Math.round((value / max) * 100));
  }

  private fleetStatus(value: number): FleetStatus {
    if (value >= 88) {
      return 'ALTA';
    }

    if (value >= 75) {
      return 'OPTIMA';
    }

    if (value >= 60) {
      return 'BAJA';
    }

    return 'SUBUTILIZADA';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getLogisticsKpis(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar KPI Logisticos.';
        },
      });
  }

  private defaultFilters(): LogisticsKpiFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      rutaId: null,
      conductorId: null,
      vehiculoId: null,
    };
  }
}
