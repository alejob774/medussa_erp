import { DEFAULT_PURCHASE_ANALYSIS_FILTERS, PurchaseAnalysisFilters } from './purchase-analysis-filters.model';
import { PurchaseAnalysisKpis } from './purchase-analysis-kpi.model';
import {
  PurchaseAnalysisAggregate,
  PurchaseAnalysisCatalogs,
  PurchaseAnalysisCharts,
} from './purchase-analysis.model';

export type PurchaseAnalysisAuditAction = 'analyze' | 'refresh';

export interface PurchaseAnalysisAuditDraft {
  module: 'analisis-compras';
  action: PurchaseAnalysisAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface PurchaseAnalysisDashboard {
  filters: PurchaseAnalysisFilters;
  catalogs: PurchaseAnalysisCatalogs;
  analyses: PurchaseAnalysisAggregate[];
  selectedAnalysis: PurchaseAnalysisAggregate | null;
  kpis: PurchaseAnalysisKpis;
  charts: PurchaseAnalysisCharts;
}

export interface PurchaseAnalysisMutationResult {
  action: 'analyzed';
  analysis: PurchaseAnalysisAggregate;
  message: string;
  auditDraft: PurchaseAnalysisAuditDraft;
}

export interface PurchaseAnalysisStore {
  analyses: PurchaseAnalysisAggregate[];
  auditTrail: PurchaseAnalysisAuditDraft[];
}

export const EMPTY_PURCHASE_ANALYSIS_DASHBOARD: PurchaseAnalysisDashboard = {
  filters: { ...DEFAULT_PURCHASE_ANALYSIS_FILTERS },
  catalogs: {
    providers: [],
    categories: [],
    supplyTypes: [],
    cities: [],
    severities: [],
  },
  analyses: [],
  selectedAnalysis: null,
  kpis: {
    totalSpend: 0,
    mirSpend: 0,
    logisticsSpend: 0,
    criticalSuppliers: 0,
    highRiskActive: 0,
    estimatedSavings: 0,
  },
  charts: {
    topSpend: [],
    topQuality: [],
    topCompliance: [],
    priceTrend: [],
    concentration: [],
    savingsByCategory: [],
  },
};
