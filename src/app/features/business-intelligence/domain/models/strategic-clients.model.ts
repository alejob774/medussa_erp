import { BiBaseDateFilters } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicClientsFilters extends BiBaseDateFilters {
  vendedorId?: string | null;
  zonaId?: string | null;
  clienteId?: string | null;
}

export type StrategicClientClassification = 'CLAVE' | 'CRECIMIENTO' | 'RIESGO' | 'INACTIVO' | 'OPORTUNIDAD';
export type StrategicClientTrend = 'CRECE' | 'CAE' | 'ESTABLE';
export type StrategicClientConcentrationRisk = 'BAJO' | 'MEDIO' | 'ALTO';

export interface StrategicClientRankingItem {
  clienteId: string;
  clienteNombre: string;
  zonaId: string;
  zonaNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  ventas: number;
  pedidos: number;
  ticketPromedio: number;
  frecuenciaCompra: number;
  participacionPct: number;
  clasificacion: StrategicClientClassification;
}

export interface InactiveClientItem {
  clienteId: string;
  clienteNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  zonaId: string;
  zonaNombre: string;
  diasInactivo: number;
  ultimaCompra: string | null;
  ventasUltimoPeriodo: number;
  ventasHistoricas: number;
  accionSugerida: string;
}

export interface StrategicClientGrowthItem {
  clienteId: string;
  clienteNombre: string;
  ventasPeriodoActual: number;
  ventasPeriodoAnterior: number;
  crecimientoPct: number;
  tendencia: StrategicClientTrend;
  oportunidadSugerida: string;
}

export interface SalesConcentrationSummary {
  top5Pct: number;
  top10Pct: number;
  nivelRiesgo: StrategicClientConcentrationRisk;
  lecturaEjecutiva: string;
}

export interface StrategicClientsResponse {
  filters: StrategicClientsFilters;
  topClientes: StrategicClientRankingItem[];
  clientesInactivos: InactiveClientItem[];
  crecimientoClientes: StrategicClientGrowthItem[];
  concentracionVentasTop5: number;
  concentracionVentasTop10: number;
  ticketPromedioCliente: number;
  frecuenciaCompra: number;
  concentracion: SalesConcentrationSummary;
  grafana?: BiDashboardEmbedConfig | null;
}
