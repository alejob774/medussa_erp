import { BiBaseDateFilters, BiTrafficLightStatus, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface ProductionRealtimeFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  lineaId?: string | null;
  turnoId?: string | null;
}

export interface ProductionLineStatus {
  lineaId: string;
  lineaNombre: string;
  productoActual: string;
  ordenProduccionId: string;
  unidadesPlan: number;
  unidadesProducidas: number;
  cumplimientoPlanPct: number;
  eficienciaPct: number;
  estado: BiTrafficLightStatus;
}

export interface ActiveDowntime {
  id: string;
  lineaId: string;
  lineaNombre: string;
  causa: string;
  inicio: string;
  duracionMin: number;
  responsable: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface ProductionHourlyPoint extends BiTrendPoint {
  lineaId?: string | null;
  plan?: number | null;
}

export interface ProductionRealtimeResponse {
  filters: ProductionRealtimeFilters;
  produccionHoy: number;
  ordenesAbiertas: number;
  cumplimientoPlanPct: number;
  unidadesPorLinea: ProductionLineStatus[];
  paradasActivas: ActiveDowntime[];
  tiempoDetenidoMin: number;
  eficienciaPorLinea: ProductionLineStatus[];
  produccionHora: ProductionHourlyPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
