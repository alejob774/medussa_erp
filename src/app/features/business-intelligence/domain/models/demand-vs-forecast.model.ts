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
  lineaId: string;
  lineaNombre: string;
  zonaId: string;
  zonaNombre: string;
  forecast: number;
  ventaReal: number;
  desviacion: number;
  errorForecastPct: number;
  impactoEstimado: number;
}

export type ForecastAccuracyStatus = 'ALTA' | 'MEDIA' | 'BAJA';

export interface ForecastAccuracySegmentItem {
  segmentoId: string;
  segmentoNombre: string;
  tipoSegmento: 'ZONA' | 'LINEA';
  forecast: number;
  ventaReal: number;
  precisionPct: number;
  estado: ForecastAccuracyStatus;
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
  precisionSegmentos: ForecastAccuracySegmentItem[];
  lecturaEjecutiva: string;
  tendenciaForecastReal: BiTrendPoint[];
  grafana?: BiDashboardEmbedConfig | null;
}
