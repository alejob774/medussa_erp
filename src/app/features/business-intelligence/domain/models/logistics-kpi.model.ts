import { BiBaseDateFilters } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface LogisticsKpiFilters extends BiBaseDateFilters {
  zonaId?: string | null;
  rutaId?: string | null;
  conductorId?: string | null;
  vehiculoId?: string | null;
}

export interface RoutePerformance {
  rutaId: string;
  rutaNombre: string;
  zonaId: string;
  zonaNombre: string;
  pedidos: number;
  entregas?: number | null;
  costoTransporte: number;
  costoPorPedido: number;
  kmRecorridos: number;
  puntualidadEntregaPct: number;
  observacion?: string | null;
}

export interface DriverPerformance {
  conductorId: string;
  conductorNombre: string;
  rutaPrincipalId?: string | null;
  rutaPrincipalNombre?: string | null;
  entregas: number;
  puntualidadEntregaPct: number;
  kmRecorridos: number;
  costoAsociado?: number | null;
  productividad?: number | null;
  novedades: number;
  observacion?: string | null;
}

export interface FleetUtilization {
  vehiculoId: string;
  placa: string;
  tipoVehiculo: string;
  conductorId?: string | null;
  conductorNombre?: string | null;
  capacidadKg?: number | null;
  cargaUtilizadaKg?: number | null;
  utilizacionPct: number;
  kmRecorridos: number;
  estado: 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO';
  accionSugerida?: string | null;
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
  entregasTardias?: number;
  reentregas?: number;
  rankingRutas: RoutePerformance[];
  rankingConductores: DriverPerformance[];
  flota: FleetUtilization[];
  tendenciaCostos?: Array<{ fecha: string; costoTransporte: number; costoPorPedido: number; puntualidadEntregaPct: number }>;
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
