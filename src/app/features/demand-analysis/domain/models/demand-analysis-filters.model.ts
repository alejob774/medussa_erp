import { DemandAnalysisAlertSeverity } from './demand-analysis-alert.model';

export interface DemandAnalysisFilters {
  fechaDesde: string;
  fechaHasta: string;
  skuIds: string[];
  canal: string | null;
  zona: string | null;
  segmento: string | null;
  clienteId: string | null;
  approvedOnly: boolean;
  onlyActiveProducts: boolean;
  selectedForecastId: string | null;
  alertSeverity: DemandAnalysisAlertSeverity | 'TODAS';
}

export const DEFAULT_DEMAND_ANALYSIS_FILTERS: DemandAnalysisFilters = {
  fechaDesde: new Date().toISOString().slice(0, 10),
  fechaHasta: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10),
  skuIds: [],
  canal: null,
  zona: null,
  segmento: null,
  clienteId: null,
  approvedOnly: true,
  onlyActiveProducts: true,
  selectedForecastId: null,
  alertSeverity: 'TODAS',
};
