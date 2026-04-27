import { BiBaseDateFilters, BiRankingItem } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicClientsFilters extends BiBaseDateFilters {
  vendedorId?: string | null;
  zonaId?: string | null;
  clienteId?: string | null;
}

export interface InactiveClientItem {
  clienteId: string;
  clienteNombre: string;
  diasInactivo: number;
  ultimaCompra: string | null;
  ventasUltimoPeriodo: number;
}

export interface ClientGrowthPoint {
  fecha: string;
  clientesNuevos: number;
  clientesActivos: number;
  clientesPerdidos: number;
}

export interface StrategicClientsResponse {
  filters: StrategicClientsFilters;
  topClientes: BiRankingItem[];
  clientesInactivos: InactiveClientItem[];
  crecimientoClientes: ClientGrowthPoint[];
  concentracionVentasTop5: number;
  concentracionVentasTop10: number;
  ticketPromedioCliente: number;
  frecuenciaCompra: number;
  grafana?: BiDashboardEmbedConfig | null;
}
