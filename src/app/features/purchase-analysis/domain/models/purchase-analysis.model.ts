import { PurchaseAnalysisAlertSeverity } from './purchase-analysis-alert.model';
import { PurchaseAnalysisDetail } from './purchase-analysis-detail.model';
import { PurchaseAnalysisKpis } from './purchase-analysis-kpi.model';

export interface PurchaseAnalysis {
  id: string;
  empresaId: string;
  empresaNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  categoria: string | null;
  tipoAbastecimiento: string | null;
  proveedorId: string | null;
  proveedorNombre?: string | null;
  creadoEn: string;
  resumenKpis: PurchaseAnalysisKpis;
}

export interface PurchaseAnalysisAggregate {
  analysis: PurchaseAnalysis;
  details: PurchaseAnalysisDetail[];
  alerts: import('./purchase-analysis-alert.model').PurchaseAnalysisAlert[];
}

export interface PurchaseAnalysisCatalogOption {
  value: string;
  label: string;
}

export interface PurchaseAnalysisCatalogs {
  providers: PurchaseAnalysisCatalogOption[];
  categories: PurchaseAnalysisCatalogOption[];
  supplyTypes: PurchaseAnalysisCatalogOption[];
  cities: PurchaseAnalysisCatalogOption[];
  severities: Array<{ value: PurchaseAnalysisAlertSeverity | 'TODAS'; label: string }>;
}

export interface PurchaseAnalysisTrendPoint {
  label: string;
  value: number;
}

export interface PurchaseAnalysisRankingPoint {
  label: string;
  value: number;
  auxValue?: number;
}

export interface PurchaseAnalysisConcentrationPoint {
  label: string;
  sharePct: number;
  spend: number;
}

export interface PurchaseAnalysisCharts {
  topSpend: PurchaseAnalysisRankingPoint[];
  topQuality: PurchaseAnalysisRankingPoint[];
  topCompliance: PurchaseAnalysisRankingPoint[];
  priceTrend: PurchaseAnalysisTrendPoint[];
  concentration: PurchaseAnalysisConcentrationPoint[];
  savingsByCategory: PurchaseAnalysisRankingPoint[];
}
