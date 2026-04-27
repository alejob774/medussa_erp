import { BiBaseDateFilters, BiRankingItem } from './bi-filter-context.model';
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
  cumplimientoMetaPct: number;
}

export interface CommercialPerformanceResponse {
  filters: CommercialPerformanceFilters;
  ventasDia: number;
  ventasMes: number;
  cumplimientoMeta: number;
  ticketPromedio: number;
  conversionComercial: number;
  topVendedores: BiRankingItem[];
  ventasPorZona: SalesByZoneItem[];
  topClientes: BiRankingItem[];
  grafana?: BiDashboardEmbedConfig | null;
}
