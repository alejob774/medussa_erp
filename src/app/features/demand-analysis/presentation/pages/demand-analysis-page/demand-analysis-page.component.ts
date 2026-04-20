import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { DemandAnalysisFacadeService } from '../../../application/facade/demand-analysis.facade';
import { DemandAnalysisFiltersComponent } from '../../components/demand-analysis-filters/demand-analysis-filters.component';
import { DemandAnalysisKpisComponent } from '../../components/demand-analysis-kpis/demand-analysis-kpis.component';
import { DemandAnalysisChartComponent } from '../../components/demand-analysis-chart/demand-analysis-chart.component';
import { DemandAnalysisRankingComponent } from '../../components/demand-analysis-ranking/demand-analysis-ranking.component';
import { DemandAnalysisAlertsComponent } from '../../components/demand-analysis-alerts/demand-analysis-alerts.component';
import { DemandAnalysisTableComponent } from '../../components/demand-analysis-table/demand-analysis-table.component';
import { DEFAULT_DEMAND_ANALYSIS_FILTERS, DemandAnalysisFilters } from '../../../domain/models/demand-analysis-filters.model';
import {
  DemandAnalysisDashboard,
  EMPTY_DEMAND_ANALYSIS_DASHBOARD,
} from '../../../domain/models/demand-analysis-response.model';
import { DemandAnalysisAggregate } from '../../../domain/models/demand-analysis.model';

@Component({
  selector: 'app-demand-analysis-page',
  standalone: true,
  imports: [
    CommonModule,
    DemandAnalysisFiltersComponent,
    DemandAnalysisKpisComponent,
    DemandAnalysisChartComponent,
    DemandAnalysisRankingComponent,
    DemandAnalysisAlertsComponent,
    DemandAnalysisTableComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-026</p>
            <h1 class="erp-page-title">Analisis de Demanda</h1>
            <p class="erp-page-description">
              Dashboard ejecutivo que compara forecast aprobado vs venta real mock para {{ activeCompanyName }},
              con rankings, tendencias y alertas por zona, canal y SKU.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Industrias Alimenticias El Arbolito concentra la base operativa principal del caso.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Forecast base</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ selectedAnalysis?.analysis?.forecastBaseId || 'Pendiente' }}</p>
              <p class="erp-meta-card__hint">HU-026 reutiliza la version aprobada de HU-025.</p>
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

      <app-demand-analysis-filters
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        (apply)="handleFilters($event)"
        (refresh)="refreshAnalysis($event)"
        (reset)="resetFilters()"
      />

      <app-demand-analysis-kpis [kpis]="dashboard.kpis" />

      <section class="grid gap-6 2xl:grid-cols-[1.55fr_1fr]">
        <app-demand-analysis-chart [charts]="dashboard.charts" />
        <app-demand-analysis-alerts [alerts]="selectedAnalysis?.alerts ?? []" />
      </section>

      <app-demand-analysis-ranking [charts]="dashboard.charts" />
      <app-demand-analysis-table [analysis]="selectedAnalysis" />
    </div>
  `,
})
export class DemandAnalysisPageComponent {
  private readonly facade = inject(DemandAnalysisFacadeService);

  dashboard: DemandAnalysisDashboard = EMPTY_DEMAND_ANALYSIS_DASHBOARD;
  filters: DemandAnalysisFilters = { ...DEFAULT_DEMAND_ANALYSIS_FILTERS };
  selectedAnalysis: DemandAnalysisAggregate | null = null;
  activeCompanyName = this.facade.getActiveCompanyName();
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) return;
      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  handleFilters(filters: DemandAnalysisFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  refreshAnalysis(filters: DemandAnalysisFilters): void {
    this.filters = { ...filters };
    this.clearMessages();
    this.facade
      .refreshAnalysis(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.reload(false);
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible actualizar el analisis.';
        },
      });
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_DEMAND_ANALYSIS_FILTERS };
    this.reload();
  }

  private reload(clearMessages = true): void {
    this.loading = true;
    if (clearMessages) this.clearMessages();

    this.facade
      .getDashboard(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.selectedAnalysis = dashboard.selectedAnalysis;
        },
        error: (error: unknown) => {
          this.dashboard = EMPTY_DEMAND_ANALYSIS_DASHBOARD;
          this.selectedAnalysis = null;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el analisis.';
        },
      });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
