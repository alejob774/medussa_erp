export type BiCurrency = 'COP' | 'USD';
export type BiTrafficLightStatus = 'ROJO' | 'AMARILLO' | 'VERDE';
export type BiTrendDirection = 'SUBE' | 'BAJA' | 'ESTABLE';
export type BiAlertSeverity = 'ROJA' | 'AMARILLA' | 'VERDE';
export type BiAlertStatus = 'ABIERTA' | 'EN_GESTION' | 'CERRADA';

export interface BiBaseDateFilters {
  empresaId?: string | null;
  fechaDesde: string;
  fechaHasta: string;
}

export interface BiFilterContext extends BiBaseDateFilters {
  sedeId?: string | null;
  moneda?: BiCurrency;
}

export interface BiMetricValue {
  valor: number;
  unidad?: string | null;
  variacionPct?: number | null;
  estado?: BiTrafficLightStatus | null;
}

export interface BiTrendPoint {
  fecha: string;
  valor: number;
  comparativo?: number | null;
}

export interface BiRankingItem {
  id: string;
  nombre: string;
  valor: number;
  variacionPct?: number | null;
}
