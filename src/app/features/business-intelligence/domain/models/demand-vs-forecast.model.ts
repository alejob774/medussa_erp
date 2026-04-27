import { BiBaseDateFilters, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface DemandVsForecastFilters extends BiBaseDateFilters {
  productoId?: string | null;
  lineaId?: string | null;
  zonaId?: string | null;
}

export interface ForecastDeviationItem {
  productoId: string;
  sku: string;
  productoNombre: string;
  forecast: number;
  ventaReal: number;
  desviacion: number;
  errorForecastPct: number;
}

export interface DemandVsForecastResponse {
  filters: DemandVsForecastFilters;
  forecastTotal: number;
  ventaReal: number;
  desviacionAbsoluta: number;
  errorForecastPct: number;
  precisionPct: number;
  subestimados: ForecastDeviationItem[];
  sobrestimados: ForecastDeviationItem[];
  tendenciaForecastReal: BiTrendPoint[];
  grafana?: BiDashboardEmbedConfig | null;
}
