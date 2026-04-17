import { DemandAnalysisAlertSeverity } from './demand-analysis-alert.model';
import { DemandAnalysisDetail } from './demand-analysis-detail.model';
import { DemandAnalysisKpis } from './demand-analysis-kpi.model';

export interface DemandAnalysis {
  id: string;
  empresaId: string;
  empresaNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  canal: string | null;
  zona: string | null;
  segmento: string | null;
  clienteId: string | null;
  clienteNombre?: string | null;
  forecastBaseId: string;
  creadoEn: string;
  resumenKpis: DemandAnalysisKpis;
}

export interface DemandAnalysisAggregate {
  analysis: DemandAnalysis;
  details: DemandAnalysisDetail[];
  alerts: import('./demand-analysis-alert.model').DemandAnalysisAlert[];
}

export interface DemandAnalysisCatalogOption {
  value: string;
  label: string;
}

export interface DemandAnalysisClientOption {
  value: string;
  label: string;
  zone: string;
  segment: string;
}

export interface DemandAnalysisCatalogs {
  channels: DemandAnalysisCatalogOption[];
  zones: DemandAnalysisCatalogOption[];
  segments: DemandAnalysisCatalogOption[];
  products: DemandAnalysisCatalogOption[];
  clients: DemandAnalysisClientOption[];
  forecasts: DemandAnalysisCatalogOption[];
  severities: Array<{ value: DemandAnalysisAlertSeverity | 'TODAS'; label: string }>;
}

export interface DemandAnalysisTrendPoint {
  label: string;
  forecast: number;
  actual: number;
}

export interface DemandAnalysisRankingPoint {
  label: string;
  value: number;
  auxValue?: number;
}

export interface DemandAnalysisRegionalPoint {
  label: string;
  forecast: number;
  actual: number;
  gapPct: number;
}

export interface DemandAnalysisCharts {
  forecastVsActual: DemandAnalysisTrendPoint[];
  topVolume: DemandAnalysisRankingPoint[];
  topValue: DemandAnalysisRankingPoint[];
  growthRanking: DemandAnalysisRankingPoint[];
  declineRanking: DemandAnalysisRankingPoint[];
  regionalTrend: DemandAnalysisRegionalPoint[];
  channelTrend: DemandAnalysisRegionalPoint[];
}
