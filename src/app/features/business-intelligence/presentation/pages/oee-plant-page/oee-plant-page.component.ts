import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { BusinessIntelligenceFacadeService } from '../../../application/facade/business-intelligence.facade';
import {
  OeeByLine,
  OeeByShift,
  OeePlantFilters,
  OeePlantResponse,
  OeeTrendPoint,
} from '../../../domain/models/oee-plant.model';

type OeeStatus = 'BAJO_META' | 'ACEPTABLE' | 'CLASE_MUNDIAL';
type Tone = 'green' | 'amber' | 'red' | 'slate';

interface CatalogOption {
  id: string;
  name: string;
}

interface OeeKpiCard {
  label: string;
  value: string;
  benchmark: string;
  status: OeeStatus;
  tone: Tone;
}

interface OeeLineRow extends OeeByLine {
  plantaNombre: string;
  principalPerdida: string;
  status: OeeStatus;
}

interface OeeShiftRow extends OeeByShift {
  observacion: string;
  status: OeeStatus;
}

@Component({
  selector: 'app-oee-plant-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">BI - HU-040</p>
            <h1 class="erp-page-title">OEE Consolidado Planta</h1>
            <p class="erp-page-description">
              Vista mock-first de eficiencia global para {{ activeCompanyName }}. Consolida disponibilidad,
              rendimiento y calidad por planta, linea y turno, con lectura operativa preparada para futuro
              datamart OEE y Grafana.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">El Arbolito como demo industrial.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Benchmark OEE</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">85%</p>
              <p class="erp-meta-card__hint">Referencia de clase mundial para lectura ejecutiva.</p>
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
            <article class="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div class="h-3 w-28 rounded bg-slate-200"></div>
              <div class="mt-5 h-8 w-32 rounded bg-slate-200"></div>
              <div class="mt-4 h-3 w-full rounded bg-slate-100"></div>
            </article>
          }
        </section>
      } @else if (!dashboard) {
        <section class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p class="text-lg font-semibold text-slate-900">Sin datos OEE para el filtro seleccionado</p>
          <p class="mt-2 text-sm text-slate-600">Ajusta planta, linea, turno o rango de fechas para recargar el mock BI.</p>
        </section>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (card of kpiCards; track card.label) {
            <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
              <p class="mt-3 text-3xl font-semibold text-slate-950">{{ card.value }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="toneClass(card.tone)">
                  {{ statusLabel(card.status) }}
                </span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {{ card.benchmark }}
                </span>
              </div>
            </article>
          }
        </section>

        <section class="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking OEE por linea</p>
                  <h2 class="mt-1 text-lg font-semibold text-slate-950">Lineas con mayor oportunidad operativa</h2>
                </div>
                <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Linea critica: {{ lowestLineName }}
                </span>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Linea</th>
                    <th class="px-4 py-3">Planta</th>
                    <th class="px-4 py-3">OEE</th>
                    <th class="px-4 py-3">Disponibilidad</th>
                    <th class="px-4 py-3">Rendimiento</th>
                    <th class="px-4 py-3">Calidad</th>
                    <th class="px-4 py-3">Principal perdida</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (line of lineRows; track line.lineaId) {
                    <tr>
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ line.lineaNombre }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ line.plantaNombre }}</td>
                      <td class="px-4 py-4 font-semibold" [ngClass]="metricTextClass(line.oee)">{{ formatPercent(line.oee) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatPercent(line.disponibilidad) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatPercent(line.rendimiento) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ formatPercent(line.calidad) }}</td>
                      <td class="px-4 py-4 text-slate-700">{{ line.principalPerdida }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="statusClass(line.status)">
                          {{ statusLabel(line.status) }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-8 text-center text-slate-500">
                        No hay lineas para el filtro seleccionado.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Lectura operativa</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">Perdidas principales</h2>
            <div class="mt-5 space-y-4">
              @for (insight of operationalInsights; track insight.title) {
                <div class="rounded-md bg-slate-50 p-4">
                  <p class="text-sm font-semibold text-slate-900">{{ insight.title }}</p>
                  <p class="mt-2 text-sm text-slate-600">{{ insight.description }}</p>
                </div>
              }
            </div>
          </article>
        </section>

        <section class="grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]">
          <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 p-5">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Comparacion por turno</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Desempeno MANANA / TARDE / NOCHE</h2>
            </div>
            <div class="divide-y divide-slate-100">
              @for (shift of shiftRows; track shift.turnoId) {
                <div class="p-5">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p class="text-lg font-semibold text-slate-950">{{ shift.turnoNombre }}</p>
                      <p class="mt-1 text-sm text-slate-600">{{ shift.observacion }}</p>
                    </div>
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="statusClass(shift.status)">
                      {{ statusLabel(shift.status) }}
                    </span>
                  </div>
                  <div class="mt-4 grid gap-3 sm:grid-cols-4">
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs uppercase text-slate-500">OEE</p>
                      <p class="mt-1 font-semibold text-slate-950">{{ formatPercent(shift.oee) }}</p>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs uppercase text-slate-500">Disp.</p>
                      <p class="mt-1 font-semibold text-slate-950">{{ formatPercent(shift.disponibilidad) }}</p>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs uppercase text-slate-500">Rend.</p>
                      <p class="mt-1 font-semibold text-slate-950">{{ formatPercent(shift.rendimiento) }}</p>
                    </div>
                    <div class="rounded-md bg-slate-50 p-3">
                      <p class="text-xs uppercase text-slate-500">Calidad</p>
                      <p class="mt-1 font-semibold text-slate-950">{{ formatPercent(shift.calidad) }}</p>
                    </div>
                  </div>
                </div>
              } @empty {
                <p class="p-5 text-sm text-slate-500">No hay turnos para el filtro seleccionado.</p>
              }
            </div>
          </article>

          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tendencia historica</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-950">OEE y componentes por periodo</h2>
            <div class="mt-5 space-y-3">
              @for (point of dashboard.tendenciaHistorica; track point.fecha) {
                <div class="grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-[5rem_1fr_6rem_6rem_6rem_6rem] md:items-center">
                  <span class="font-semibold text-slate-900">{{ point.fecha }}</span>
                  <div class="space-y-1">
                    <div class="h-2 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-emerald-600" [style.width.%]="point.valor"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                      <div class="h-1.5 rounded-full bg-sky-500" [style.width.%]="point.disponibilidad || 0"></div>
                      <div class="h-1.5 rounded-full bg-amber-500" [style.width.%]="point.rendimiento || 0"></div>
                      <div class="h-1.5 rounded-full bg-teal-500" [style.width.%]="point.calidad || 0"></div>
                    </div>
                  </div>
                  <span class="text-sm font-semibold text-slate-950">OEE {{ formatPercent(point.valor) }}</span>
                  <span class="text-sm text-slate-700">D {{ formatPercent(point.disponibilidad || 0) }}</span>
                  <span class="text-sm text-slate-700">R {{ formatPercent(point.rendimiento || 0) }}</span>
                  <span class="text-sm text-slate-700">C {{ formatPercent(point.calidad || 0) }}</span>
                </div>
              } @empty {
                <p class="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay tendencia historica para el filtro seleccionado.</p>
              }
            </div>
          </article>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-950">OEE Consolidado Planta</h2>
          <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
            <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
            <p class="mt-2 font-mono text-sm text-slate-700">
              {{ dashboard.grafanaEmbedConfig?.dashboardUid || 'medussa-oee-plant' }}
            </p>
            <p class="mt-4 text-sm text-slate-600">
              La version final consultara Data Warehouse y datamarts OEE via Grafana. Esta HU no crea
              iframe real, token firmado, URL embebida, ETL ni conexion a backend.
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
export class OeePlantPageComponent {
  private readonly facade = inject(BusinessIntelligenceFacadeService);

  dashboard: OeePlantResponse | null = null;
  filters: OeePlantFilters = this.defaultFilters();
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  readonly loadingCards = Array.from({ length: 4 }, (_, index) => index);
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
  }

  get kpiCards(): OeeKpiCard[] {
    if (!this.dashboard) {
      return [];
    }

    return [
      this.kpi('OEE total planta', this.dashboard.oeeTotal),
      this.kpi('Disponibilidad', this.dashboard.disponibilidad),
      this.kpi('Rendimiento', this.dashboard.rendimiento),
      this.kpi('Calidad', this.dashboard.calidad),
    ];
  }

  get lineRows(): OeeLineRow[] {
    return [...(this.dashboard?.oeePorLinea ?? [])]
      .sort((left, right) => left.oee - right.oee)
      .map((line) => ({
        ...line,
        plantaNombre: this.plantNameForLine(line.lineaId),
        principalPerdida: this.lossForLine(line),
        status: this.oeeStatus(line.oee),
      }));
  }

  get shiftRows(): OeeShiftRow[] {
    return (this.dashboard?.oeePorTurno ?? []).map((shift) => ({
      ...shift,
      observacion: this.shiftObservation(shift),
      status: this.oeeStatus(shift.oee),
    }));
  }

  get lowestLineName(): string {
    return this.lineRows[0]?.lineaNombre ?? 'Sin datos';
  }

  get operationalInsights(): Array<{ title: string; description: string }> {
    const line = this.lineRows[0];

    return [
      {
        title: 'Principal perdida por paradas',
        description: 'La disponibilidad baja se concentra en microparadas y tiempos de espera en lineas de empaque y lacteos bebibles.',
      },
      {
        title: 'Principal perdida por velocidad',
        description: 'El rendimiento se ve presionado por ciclos lentos en cambios de formato y ajustes de llenado durante el turno TARDE.',
      },
      {
        title: 'Principal perdida por calidad',
        description: 'La calidad esta controlada sobre 98%, con impacto menor asociado a retrabajos y liberaciones sanitarias.',
      },
      {
        title: 'Recomendacion operativa',
        description: line
          ? `Priorizar plan de recuperacion para ${line.lineaNombre}: atacar ${line.principalPerdida.toLowerCase()} antes de escalar velocidad.`
          : 'Mantener seguimiento por linea y turno hasta contar con datamart OEE definitivo.',
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

  formatPercent(value: number): string {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  statusLabel(status: OeeStatus): string {
    const labels: Record<OeeStatus, string> = {
      BAJO_META: 'Bajo meta',
      ACEPTABLE: 'Aceptable',
      CLASE_MUNDIAL: 'Clase mundial',
    };

    return labels[status];
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

  statusClass(status: OeeStatus): string {
    const classes: Record<OeeStatus, string> = {
      BAJO_META: 'bg-red-50 text-red-700',
      ACEPTABLE: 'bg-amber-50 text-amber-700',
      CLASE_MUNDIAL: 'bg-emerald-50 text-emerald-700',
    };

    return classes[status];
  }

  metricTextClass(value: number): string {
    const status = this.oeeStatus(value);

    return status === 'CLASE_MUNDIAL'
      ? 'text-emerald-700'
      : status === 'ACEPTABLE'
        ? 'text-amber-700'
        : 'text-red-700';
  }

  private reload(): void {
    this.loading = true;
    this.errorMessage = '';

    this.facade
      .getOeePlant(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },
        error: (error: unknown) => {
          this.dashboard = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar OEE Consolidado Planta.';
        },
      });
  }

  private kpi(label: string, value: number): OeeKpiCard {
    const status = this.oeeStatus(value);

    return {
      label,
      value: this.formatPercent(value),
      benchmark: 'Benchmark 85%',
      status,
      tone: status === 'CLASE_MUNDIAL' ? 'green' : status === 'ACEPTABLE' ? 'amber' : 'red',
    };
  }

  private oeeStatus(value: number): OeeStatus {
    if (value >= 85) {
      return 'CLASE_MUNDIAL';
    }

    if (value >= 75) {
      return 'ACEPTABLE';
    }

    return 'BAJO_META';
  }

  private lossForLine(line: OeeByLine): string {
    const losses = [
      { label: 'Paradas / disponibilidad', value: 100 - line.disponibilidad },
      { label: 'Velocidad / rendimiento', value: 100 - line.rendimiento },
      { label: 'Calidad / retrabajos', value: 100 - line.calidad },
    ];

    return losses.sort((left, right) => right.value - left.value)[0]?.label ?? 'Sin perdida dominante';
  }

  private shiftObservation(shift: OeeByShift): string {
    const loss = this.lossForLine({
      lineaId: shift.turnoId,
      lineaNombre: shift.turnoNombre,
      oee: shift.oee,
      disponibilidad: shift.disponibilidad,
      rendimiento: shift.rendimiento,
      calidad: shift.calidad,
      estado: 'AMARILLO',
    });

    if (shift.oee >= 85) {
      return `Desempeno cerca de clase mundial; sostener estandar y control de ${loss.toLowerCase()}.`;
    }

    if (shift.oee >= 78) {
      return `Turno estable, con oportunidad focalizada en ${loss.toLowerCase()}.`;
    }

    return `Turno bajo meta; priorizar contencion de ${loss.toLowerCase()} y validacion de arranque.`;
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

  private defaultFilters(): OeePlantFilters {
    return {
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-04-30',
      sedeId: null,
      lineaId: null,
      turnoId: null,
    };
  }
}
