import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { DemandForecastFacadeService } from '../../../application/facade/demand-forecast.facade';
import { DemandForecastFilters, DEFAULT_DEMAND_FORECAST_FILTERS } from '../../../domain/models/demand-forecast-filters.model';
import {
  ApplyDemandForecastAdjustmentPayload,
  DemandForecastAggregate,
  DemandForecastCatalogs,
  GenerateDemandForecastPayload,
} from '../../../domain/models/demand-forecast.model';
import {
  DemandForecastDashboard,
  EMPTY_DEMAND_FORECAST_DASHBOARD,
} from '../../../domain/models/demand-forecast-response.model';
import { ForecastAlertsPanelComponent } from '../../components/forecast-alerts-panel/forecast-alerts-panel.component';
import { ForecastChartComponent } from '../../components/forecast-chart/forecast-chart.component';
import { ForecastFiltersPanelComponent } from '../../components/forecast-filters-panel/forecast-filters-panel.component';
import { ForecastSummaryCardsComponent } from '../../components/forecast-summary-cards/forecast-summary-cards.component';
import { ForecastTableComponent } from '../../components/forecast-table/forecast-table.component';

@Component({
  selector: 'app-demand-forecast-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ForecastFiltersPanelComponent,
    ForecastSummaryCardsComponent,
    ForecastChartComponent,
    ForecastAlertsPanelComponent,
    ForecastTableComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-025</p>
            <h1 class="erp-page-title">Gestion de Demanda</h1>
            <p class="erp-page-description">
              Forecast mock-first para {{ activeCompanyName }}, con segregacion multiempresa, alertas de riesgo,
              ajuste comercial y aprobacion de version oficial.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Experiencia principal SCM sobre Medussa Holding en local.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Version oficial</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ officialForecastLabel }}
              </p>
              <p class="erp-meta-card__hint">Solo la version aprobada alimenta la operacion posterior.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      @if (successMessage) {
        <div class="erp-alert erp-alert--success">{{ successMessage }}</div>
      }

      <app-forecast-filters-panel
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        [forecastOptions]="forecastOptions"
        (applyFilters)="handleFiltersChange($event)"
        (generateForecast)="generateForecast($event)"
        (resetFilters)="resetFilters()"
      />

      <app-forecast-summary-cards [kpis]="dashboard.kpis" />

      <section class="grid gap-6 2xl:grid-cols-[1.6fr_1fr]">
        <app-forecast-chart [charts]="dashboard.charts" />
        <app-forecast-alerts-panel [alerts]="selectedForecast?.alerts ?? []" />
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <section class="erp-panel">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="erp-section-eyebrow">Versiones</p>
              <h3 class="erp-section-title">Historico de forecast</h3>
              <p class="erp-section-description">
                Trazabilidad por version, estado y filtros usados en la empresa activa.
              </p>
            </div>
            @if (selectedForecast) {
              <button
                type="button"
                mat-flat-button
                color="primary"
                [disabled]="selectedForecast.forecast.estado === 'APROBADO' || approving"
                (click)="approveSelectedForecast()"
              >
                Aprobar forecast
              </button>
            }
          </div>

          <div class="mt-4 grid gap-3">
            @for (item of dashboard.forecasts; track item.forecast.id) {
              <button
                type="button"
                class="rounded-3xl border p-4 text-left transition"
                [class.border-sky-300]="selectedForecast?.forecast?.id === item.forecast.id"
                [class.bg-sky-50]="selectedForecast?.forecast?.id === item.forecast.id"
                [class.border-slate-200]="selectedForecast?.forecast?.id !== item.forecast.id"
                [class.bg-white]="selectedForecast?.forecast?.id !== item.forecast.id"
                (click)="selectForecast(item.forecast.id)"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="erp-chip erp-chip--strong">v{{ item.forecast.version }}</span>
                  <span class="erp-chip" [ngClass]="statusClass(item.forecast.estado)">{{ item.forecast.estado }}</span>
                  @if (item.forecast.isOfficialVersion) {
                    <span class="erp-chip erp-chip--success">Oficial</span>
                  }
                </div>
                <p class="mt-3 text-base font-semibold text-slate-900">{{ item.forecast.nombreForecast }}</p>
                <p class="mt-1 text-sm text-slate-500">
                  {{ item.forecast.fechaInicio }} a {{ item.forecast.fechaFin }} · {{ item.forecast.horizonte }}
                </p>
                <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span>Forecast: {{ item.forecast.metricasResumen.totalForecast }}</span>
                  <span>SKU: {{ item.forecast.metricasResumen.totalSku }}</span>
                  <span>Faltante: {{ item.forecast.alertasResumen.shortage }}</span>
                  <span>Sobrestock: {{ item.forecast.alertasResumen.overstock }}</span>
                </div>
              </button>
            }
          </div>
        </section>

        <section class="erp-panel">
          <div>
            <p class="erp-section-eyebrow">Ajuste comercial</p>
            <h3 class="erp-section-title">Promociones y eventos</h3>
            <p class="erp-section-description">
              Aplica impacto porcentual para recalcular el forecast final y sus alertas.
            </p>
          </div>

          <form class="mt-5 grid gap-4" [formGroup]="adjustmentForm">
            <mat-form-field appearance="outline">
              <mat-label>Tipo de evento</mat-label>
              <mat-select formControlName="tipoEvento">
                <mat-option value="Promocion">Promocion</mat-option>
                <mat-option value="Evento comercial">Evento comercial</mat-option>
                <mat-option value="Ajuste de canal">Ajuste de canal</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Descripcion</mat-label>
              <textarea matInput rows="3" formControlName="descripcion"></textarea>
            </mat-form-field>

            <div class="grid gap-4 md:grid-cols-2">
              <mat-form-field appearance="outline">
                <mat-label>Impacto %</mat-label>
                <input matInput type="number" formControlName="impactoPorcentaje" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>SKU</mat-label>
                <mat-select formControlName="skuId">
                  <mat-option [value]="null">Todos</mat-option>
                  @for (item of dashboard.catalogs.products; track item.value) {
                    <mat-option [value]="item.value">{{ item.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <mat-form-field appearance="outline">
                <mat-label>Fecha inicio</mat-label>
                <input matInput type="date" formControlName="fechaInicio" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Fecha fin</mat-label>
                <input matInput type="date" formControlName="fechaFin" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Observacion</mat-label>
              <input matInput formControlName="observacion" />
            </mat-form-field>

            <button
              type="button"
              mat-stroked-button
              [disabled]="!selectedForecast || adjusting || adjustmentForm.invalid"
              (click)="applyAdjustment()"
            >
              Registrar ajuste
            </button>
          </form>

          @if (selectedForecast?.events?.length) {
            <div class="mt-5 space-y-3 border-t border-slate-200 pt-4">
              @for (event of selectedForecast!.events.slice(0, 4); track event.id) {
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-center gap-2">
                    <span class="erp-chip erp-chip--info">{{ event.tipoEvento }}</span>
                    <span class="erp-chip erp-chip--neutral">{{ event.impactoPorcentaje }}%</span>
                  </div>
                  <p class="mt-2 text-sm font-semibold text-slate-900">{{ event.descripcion }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ event.fechaInicio }} a {{ event.fechaFin }}</p>
                </article>
              }
            </div>
          }
        </section>
      </section>

      <app-forecast-table [forecast]="selectedForecast" (refresh)="reload()" />
    </div>
  `,
})
export class DemandForecastPageComponent {
  private readonly facade = inject(DemandForecastFacadeService);
  private readonly formBuilder = inject(FormBuilder);

  dashboard: DemandForecastDashboard = EMPTY_DEMAND_FORECAST_DASHBOARD;
  filters: DemandForecastFilters = { ...DEFAULT_DEMAND_FORECAST_FILTERS };
  catalogs: DemandForecastCatalogs = EMPTY_DEMAND_FORECAST_DASHBOARD.catalogs;
  selectedForecast: DemandForecastAggregate | null = null;
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  generating = false;
  adjusting = false;
  approving = false;
  errorMessage = '';
  successMessage = '';

  readonly adjustmentForm = this.formBuilder.group({
    tipoEvento: this.formBuilder.control('Promocion', { nonNullable: true }),
    descripcion: this.formBuilder.control('', { nonNullable: true, validators: [Validators.required] }),
    impactoPorcentaje: this.formBuilder.control(12, { nonNullable: true, validators: [Validators.required] }),
    fechaInicio: this.formBuilder.control(DEFAULT_DEMAND_FORECAST_FILTERS.fechaInicio, { nonNullable: true }),
    fechaFin: this.formBuilder.control(DEFAULT_DEMAND_FORECAST_FILTERS.fechaFin, { nonNullable: true }),
    skuId: this.formBuilder.control<string | null>(null),
    observacion: this.formBuilder.control(''),
  });

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  get forecastOptions(): Array<{ value: string; label: string }> {
    return this.dashboard.forecasts.map((item) => ({
      value: item.forecast.id,
      label: `v${item.forecast.version} · ${item.forecast.nombreForecast} · ${item.forecast.estado}`,
    }));
  }

  get officialForecastLabel(): string {
    const official = this.dashboard.forecasts.find((item) => item.forecast.isOfficialVersion);
    return official ? `v${official.forecast.version} · ${official.forecast.nombreForecast}` : 'Sin version oficial';
  }

  handleFiltersChange(filters: DemandForecastFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_DEMAND_FORECAST_FILTERS };
    this.reload();
  }

  selectForecast(forecastId: string): void {
    this.filters = {
      ...this.filters,
      selectedForecastId: forecastId,
    };
    this.selectedForecast =
      this.dashboard.forecasts.find((item) => item.forecast.id === forecastId) ?? this.dashboard.selectedForecast;
  }

  generateForecast(payload: GenerateDemandForecastPayload): void {
    this.generating = true;
    this.clearMessages();

    this.facade
      .generateForecast(payload)
      .pipe(finalize(() => (this.generating = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.filters = {
            ...this.filters,
            selectedForecastId: result.forecast.forecast.id,
          };
          this.reload(false);
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible generar el forecast.';
        },
      });
  }

  applyAdjustment(): void {
    if (!this.selectedForecast || this.adjustmentForm.invalid) {
      return;
    }

    this.adjusting = true;
    this.clearMessages();
    const value = this.adjustmentForm.getRawValue();
    const payload: ApplyDemandForecastAdjustmentPayload = {
      tipoEvento: value.tipoEvento,
      descripcion: value.descripcion,
      impactoPorcentaje: Number(value.impactoPorcentaje),
      fechaInicio: value.fechaInicio,
      fechaFin: value.fechaFin,
      skuId: value.skuId,
      observacion: value.observacion?.trim() || null,
      usuario: 'demo.comercial',
    };

    this.facade
      .applyAdjustment(this.selectedForecast.forecast.id, payload)
      .pipe(finalize(() => (this.adjusting = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.filters = {
            ...this.filters,
            selectedForecastId: result.forecast.forecast.id,
          };
          this.reload(false);
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible aplicar el ajuste.';
        },
      });
  }

  approveSelectedForecast(): void {
    if (!this.selectedForecast) {
      return;
    }

    this.approving = true;
    this.clearMessages();

    this.facade
      .approveForecast(this.selectedForecast.forecast.id, {
        usuario: 'demo.director-scm',
        observaciones: 'Version oficial aprobada para planeacion operativa.',
      })
      .pipe(finalize(() => (this.approving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.filters = {
            ...this.filters,
            selectedForecastId: result.forecast.forecast.id,
          };
          this.reload(false);
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible aprobar el forecast.';
        },
      });
  }

  reload(clearMessages = true): void {
    this.loading = true;

    if (clearMessages) {
      this.clearMessages();
    }

    this.facade
      .getDashboard(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.catalogs = dashboard.catalogs;
          this.selectedForecast = dashboard.selectedForecast;
        },
        error: (error: unknown) => {
          this.dashboard = EMPTY_DEMAND_FORECAST_DASHBOARD;
          this.selectedForecast = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar la gestion de demanda.';
        },
      });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'APROBADO':
        return 'erp-chip--success';
      case 'AJUSTADO':
        return 'erp-chip--info';
      case 'GENERADO':
        return 'erp-chip--neutral';
      default:
        return 'erp-chip--warning';
    }
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
