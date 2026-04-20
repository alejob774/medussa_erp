import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { PurchaseAnalysisFacadeService } from '../../../application/facade/purchase-analysis.facade';
import { DEFAULT_PURCHASE_ANALYSIS_FILTERS, PurchaseAnalysisFilters } from '../../../domain/models/purchase-analysis-filters.model';
import {
  EMPTY_PURCHASE_ANALYSIS_DASHBOARD,
  PurchaseAnalysisDashboard,
} from '../../../domain/models/purchase-analysis-response.model';
import { PurchaseAnalysisAggregate } from '../../../domain/models/purchase-analysis.model';
import { PurchaseAnalysisFiltersComponent } from '../../components/purchase-analysis-filters/purchase-analysis-filters.component';
import { PurchaseAnalysisKpisComponent } from '../../components/purchase-analysis-kpis/purchase-analysis-kpis.component';
import { PurchaseAnalysisRankingComponent } from '../../components/purchase-analysis-ranking/purchase-analysis-ranking.component';
import { PurchaseAnalysisPriceTrendComponent } from '../../components/purchase-analysis-price-trend/purchase-analysis-price-trend.component';
import { PurchaseAnalysisRiskPanelComponent } from '../../components/purchase-analysis-risk-panel/purchase-analysis-risk-panel.component';
import { PurchaseAnalysisTableComponent } from '../../components/purchase-analysis-table/purchase-analysis-table.component';

@Component({
  selector: 'app-purchase-analysis-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    PurchaseAnalysisFiltersComponent,
    PurchaseAnalysisKpisComponent,
    PurchaseAnalysisRankingComponent,
    PurchaseAnalysisPriceTrendComponent,
    PurchaseAnalysisRiskPanelComponent,
    PurchaseAnalysisTableComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-028</p>
            <h1 class="erp-page-title">Analisis Estrategico de Compras</h1>
            <p class="erp-page-description">
              Dashboard de abastecimiento para {{ activeCompanyName }} con gasto, ranking de proveedores, tendencia
              de precios, concentracion y riesgos de dependencia.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal sobre Industrias Alimenticias El Arbolito y su abastecimiento realista.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Analisis seleccionado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ selectedAnalysis?.analysis?.fechaDesde || 'Pendiente' }}</p>
              <p class="erp-meta-card__hint">Se recalcula localmente sin dependencia de backend.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) { <div class="erp-alert erp-alert--error">{{ errorMessage }}</div> }
      @if (successMessage) { <div class="erp-alert erp-alert--success">{{ successMessage }}</div> }

      <div class="flex gap-3">
        <button type="button" mat-flat-button color="primary" (click)="refresh()">Actualizar analisis</button>
      </div>

      <app-purchase-analysis-filters [catalogs]="dashboard.catalogs" [filters]="filters" (apply)="handleFilters($event)" (refresh)="refresh($event)" (reset)="resetFilters()" />
      <app-purchase-analysis-kpis [kpis]="dashboard.kpis" />

      <section class="grid gap-6 2xl:grid-cols-[1.3fr_1fr]">
        <app-purchase-analysis-ranking [charts]="dashboard.charts" />
        <app-purchase-analysis-risk-panel [alerts]="selectedAnalysis?.alerts ?? []" />
      </section>

      <app-purchase-analysis-price-trend [charts]="dashboard.charts" />
      <app-purchase-analysis-table [analysis]="selectedAnalysis" />
    </div>
  `,
})
export class PurchaseAnalysisPageComponent {
  private readonly facade = inject(PurchaseAnalysisFacadeService);

  dashboard: PurchaseAnalysisDashboard = EMPTY_PURCHASE_ANALYSIS_DASHBOARD;
  filters: PurchaseAnalysisFilters = { ...DEFAULT_PURCHASE_ANALYSIS_FILTERS };
  selectedAnalysis: PurchaseAnalysisAggregate | null = null;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) return;
      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  handleFilters(filters: PurchaseAnalysisFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_PURCHASE_ANALYSIS_FILTERS };
    this.reload();
  }

  refresh(filters?: PurchaseAnalysisFilters): void {
    if (filters) {
      this.filters = { ...filters };
    }
    this.clearMessages();
    this.loading = true;
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

  private reload(clearMessages = true): void {
    if (clearMessages) this.clearMessages();
    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedAnalysis = dashboard.selectedAnalysis;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_PURCHASE_ANALYSIS_DASHBOARD;
        this.selectedAnalysis = null;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el analisis de compras.';
      },
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
