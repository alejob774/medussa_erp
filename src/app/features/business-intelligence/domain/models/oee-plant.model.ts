import { BiBaseDateFilters, BiTrafficLightStatus, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface OeePlantFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  lineaId?: string | null;
  turnoId?: string | null;
}

export interface OeeByLine {
  lineaId: string;
  lineaNombre: string;
  oee: number;
  disponibilidad: number;
  rendimiento: number;
  calidad: number;
  estado: BiTrafficLightStatus;
}

export interface OeeByShift {
  turnoId: string;
  turnoNombre: string;
  oee: number;
  disponibilidad: number;
  rendimiento: number;
  calidad: number;
}

export interface OeeTrendPoint extends BiTrendPoint {
  disponibilidad?: number | null;
  rendimiento?: number | null;
  calidad?: number | null;
}

export interface OeePlantResponse {
  filters: OeePlantFilters;
  oeeTotal: number;
  disponibilidad: number;
  rendimiento: number;
  calidad: number;
  oeePorLinea: OeeByLine[];
  oeePorTurno: OeeByShift[];
  tendenciaHistorica: OeeTrendPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
