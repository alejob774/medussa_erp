import { DEFAULT_DEMAND_FORECAST_FILTERS, DemandForecastFilters } from './demand-forecast-filters.model';
import {
  DemandForecastAggregate,
  DemandForecastCatalogs,
  DemandForecastCharts,
  DemandForecastKpis,
} from './demand-forecast.model';

export type DemandForecastAuditAction =
  | 'generate'
  | 'adjust'
  | 'approve'
  | 'recalculate';

export interface DemandForecastAuditDraft {
  module: 'gestion-demanda';
  action: DemandForecastAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface DemandForecastDashboard {
  filters: DemandForecastFilters;
  catalogs: DemandForecastCatalogs;
  forecasts: DemandForecastAggregate[];
  selectedForecast: DemandForecastAggregate | null;
  kpis: DemandForecastKpis;
  charts: DemandForecastCharts;
}

export interface DemandForecastMutationResult {
  action: 'generated' | 'adjusted' | 'approved';
  forecast: DemandForecastAggregate;
  message: string;
  auditDraft: DemandForecastAuditDraft;
}

export interface DemandForecastStore {
  forecasts: DemandForecastAggregate[];
  auditTrail: DemandForecastAuditDraft[];
}

export const EMPTY_DEMAND_FORECAST_DASHBOARD: DemandForecastDashboard = {
  filters: { ...DEFAULT_DEMAND_FORECAST_FILTERS },
  catalogs: {
    horizons: [],
    channels: [],
    zones: [],
    segments: [],
    products: [],
    clients: [],
    severities: [],
  },
  forecasts: [],
  selectedForecast: null,
  kpis: {
    totalSkus: 0,
    totalForecast: 0,
    shortageAlerts: 0,
    overstockAlerts: 0,
    adjustedVsSystemPct: 0,
    averageCoverageDays: 0,
  },
  charts: {
    trend: [],
    zoneDistribution: [],
    channelDistribution: [],
    topRiskSkus: [],
  },
};
