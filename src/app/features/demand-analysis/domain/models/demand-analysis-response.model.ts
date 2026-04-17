import { DEFAULT_DEMAND_ANALYSIS_FILTERS, DemandAnalysisFilters } from './demand-analysis-filters.model';
import { DemandAnalysisKpis } from './demand-analysis-kpi.model';
import { DemandAnalysisAggregate, DemandAnalysisCatalogs, DemandAnalysisCharts } from './demand-analysis.model';

export type DemandAnalysisAuditAction = 'analyze' | 'refresh';

export interface DemandAnalysisAuditDraft {
  module: 'analisis-demanda';
  action: DemandAnalysisAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface DemandAnalysisDashboard {
  filters: DemandAnalysisFilters;
  catalogs: DemandAnalysisCatalogs;
  analyses: DemandAnalysisAggregate[];
  selectedAnalysis: DemandAnalysisAggregate | null;
  kpis: DemandAnalysisKpis;
  charts: DemandAnalysisCharts;
}

export interface DemandAnalysisMutationResult {
  action: 'analyzed';
  analysis: DemandAnalysisAggregate;
  message: string;
  auditDraft: DemandAnalysisAuditDraft;
}

export interface DemandAnalysisStore {
  analyses: DemandAnalysisAggregate[];
  auditTrail: DemandAnalysisAuditDraft[];
}

export const EMPTY_DEMAND_ANALYSIS_DASHBOARD: DemandAnalysisDashboard = {
  filters: { ...DEFAULT_DEMAND_ANALYSIS_FILTERS },
  catalogs: {
    channels: [],
    zones: [],
    segments: [],
    products: [],
    clients: [],
    forecasts: [],
    severities: [],
  },
  analyses: [],
  selectedAnalysis: null,
  kpis: {
    averageMape: 0,
    averageBias: 0,
    growingSkus: 0,
    decliningSkus: 0,
    activeAlerts: 0,
    totalForecast: 0,
    totalActual: 0,
  },
  charts: {
    forecastVsActual: [],
    topVolume: [],
    topValue: [],
    growthRanking: [],
    declineRanking: [],
    regionalTrend: [],
    channelTrend: [],
  },
};
