import { BiBaseDateFilters } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface CommercialPerformanceFilters extends BiBaseDateFilters {
  zonaId?: string | null;
  vendedorId?: string | null;
  clienteId?: string | null;
}

export interface SalesByZoneItem {
  zonaId: string;
  zonaNombre: string;
  ventas: number;
  meta: number;
  cumplimientoMetaPct: number;
  pedidos: number;
}

export interface CommercialSellerRankingItem {
  vendedorId: string;
  vendedorNombre: string;
  zonaId: string;
  zonaNombre: string;
  ventas: number;
  meta: number;
  cumplimientoMetaPct: number;
  pedidos: number;
  ticketPromedio: number;
}

export interface CommercialTopClientItem {
  clienteId: string;
  clienteNombre: string;
  zonaId: string;
  zonaNombre: string;
  vendedorId: string;
  vendedorNombre: string;
  ventas: number;
  pedidos: number;
  ticketPromedio: number;
}

export interface CommercialPerformanceResponse {
  filters: CommercialPerformanceFilters;
  ventasDia: number;
  ventasMes: number;
  cumplimientoMeta: number;
  ticketPromedio: number;
  conversionComercial: number;
  topVendedores: CommercialSellerRankingItem[];
  ventasPorZona: SalesByZoneItem[];
  topClientes: CommercialTopClientItem[];
  grafana?: BiDashboardEmbedConfig | null;
}
