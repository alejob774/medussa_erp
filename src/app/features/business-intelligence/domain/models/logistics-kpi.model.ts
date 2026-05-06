import { BiBaseDateFilters } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface LogisticsKpiFilters extends BiBaseDateFilters {
  zonaId?: string | null;
  rutaId?: string | null;
  conductorId?: string | null;
}

export interface RoutePerformance {
  rutaId: string;
  rutaNombre: string;
  zonaId: string;
  zonaNombre: string;
  pedidos: number;
  costoTransporte: number;
  costoPorPedido: number;
  kmRecorridos: number;
  puntualidadEntregaPct: number;
}

export interface DriverPerformance {
  conductorId: string;
  conductorNombre: string;
  entregas: number;
  puntualidadEntregaPct: number;
  kmRecorridos: number;
  novedades: number;
}

export interface FleetUtilization {
  vehiculoId: string;
  placa: string;
  tipoVehiculo: string;
  utilizacionPct: number;
  kmRecorridos: number;
  estado: 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO';
}

export interface LogisticsKpiResponse {
  filters: LogisticsKpiFilters;
  costoTransporte: number;
  costoPorPedido: number;
  pedidosPorRuta: number;
  entregasPorConductor: number;
  utilizacionFlota: number;
  kmRecorridos: number;
  puntualidadEntrega: number;
  rankingRutas: RoutePerformance[];
  rankingConductores: DriverPerformance[];
  flota: FleetUtilization[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
