import { DemandAlertSeverity, DemandAlertSummary } from './demand-alert.model';
import { DemandForecastDetail } from './demand-forecast-detail.model';
import { DemandForecastEvent } from './demand-forecast-event.model';
import { DemandHorizon, DemandHorizonOption } from './demand-horizon.model';

export type DemandForecastStatus = 'BORRADOR' | 'GENERADO' | 'AJUSTADO' | 'APROBADO';

export interface DemandForecastMetricsSummary {
  totalSku: number;
  totalForecast: number;
  adjustedVsSystemPct: number;
  averageCoverageDays: number;
  confidenceAverage: number;
}

export interface DemandForecast {
  id: string;
  empresaId: string;
  empresaNombre: string;
  version: number;
  nombreForecast: string;
  horizonte: DemandHorizon;
  fechaInicio: string;
  fechaFin: string;
  estado: DemandForecastStatus;
  isOfficialVersion: boolean;
  canal: string | null;
  zona: string | null;
  segmento: string | null;
  clienteId: string | null;
  clienteNombre?: string | null;
  skuFiltro: string[];
  periodos: string[];
  usuarioCrea: string;
  usuarioAprueba?: string | null;
  fechaCreacion: string;
  fechaAprobacion?: string | null;
  observaciones?: string | null;
  alertasResumen: DemandAlertSummary;
  metricasResumen: DemandForecastMetricsSummary;
}

export interface DemandForecastAggregate {
  forecast: DemandForecast;
  details: DemandForecastDetail[];
  events: DemandForecastEvent[];
  alerts: import('./demand-alert.model').DemandAlert[];
}

export interface DemandForecastCatalogOption {
  value: string;
  label: string;
}

export interface DemandClientOption {
  value: string;
  label: string;
  zone: string;
  segment: string;
}

export interface DemandForecastCatalogs {
  horizons: DemandHorizonOption[];
  channels: DemandForecastCatalogOption[];
  zones: DemandForecastCatalogOption[];
  segments: DemandForecastCatalogOption[];
  products: DemandForecastCatalogOption[];
  clients: DemandClientOption[];
  severities: Array<{ value: DemandAlertSeverity | 'TODAS'; label: string }>;
}

export interface DemandForecastKpis {
  totalSkus: number;
  totalForecast: number;
  shortageAlerts: number;
  overstockAlerts: number;
  adjustedVsSystemPct: number;
  averageCoverageDays: number;
}

export interface DemandForecastTrendPoint {
  label: string;
  historical: number;
  system: number;
  final: number;
}

export interface DemandDistributionPoint {
  label: string;
  value: number;
}

export interface DemandRiskPoint {
  label: string;
  value: number;
  type: 'FALTANTE' | 'SOBRESTOCK';
}

export interface DemandForecastCharts {
  trend: DemandForecastTrendPoint[];
  zoneDistribution: DemandDistributionPoint[];
  channelDistribution: DemandDistributionPoint[];
  topRiskSkus: DemandRiskPoint[];
}

export interface GenerateDemandForecastPayload {
  nombreForecast?: string | null;
  horizonte: DemandHorizon;
  fechaInicio: string;
  fechaFin: string;
  skuIds: string[];
  canal: string | null;
  zona: string | null;
  segmento: string | null;
  clienteId: string | null;
  includeOnlyActiveProducts: boolean;
  usuario: string;
  observaciones?: string | null;
}

export interface ApplyDemandForecastAdjustmentPayload {
  tipoEvento: string;
  descripcion: string;
  impactoPorcentaje: number;
  fechaInicio: string;
  fechaFin: string;
  skuId?: string | null;
  canal?: string | null;
  zona?: string | null;
  segmento?: string | null;
  periodo?: string | null;
  observacion?: string | null;
  usuario: string;
}

export interface ApproveDemandForecastPayload {
  usuario: string;
  observaciones?: string | null;
}
