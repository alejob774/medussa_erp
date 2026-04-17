import { DemandAlertSeverity } from './demand-alert.model';
import { DemandHorizon } from './demand-horizon.model';

export interface DemandForecastFilters {
  horizonte: DemandHorizon;
  fechaInicio: string;
  fechaFin: string;
  skuIds: string[];
  canal: string | null;
  zona: string | null;
  segmento: string | null;
  clienteId: string | null;
  onlyActiveProducts: boolean;
  approvedOnly: boolean;
  selectedForecastId: string | null;
  alertSeverity: DemandAlertSeverity | 'TODAS';
}

export const DEFAULT_DEMAND_FORECAST_FILTERS: DemandForecastFilters = {
  horizonte: 'MENSUAL',
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0)
    .toISOString()
    .slice(0, 10),
  skuIds: [],
  canal: null,
  zona: null,
  segmento: null,
  clienteId: null,
  onlyActiveProducts: true,
  approvedOnly: false,
  selectedForecastId: null,
  alertSeverity: 'TODAS',
};
