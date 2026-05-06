import { BiBaseDateFilters, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicPurchasingFilters extends BiBaseDateFilters {
  categoriaId?: string | null;
  proveedorId?: string | null;
  moneda?: 'COP' | 'USD';
}

export interface SupplierRanking {
  proveedorId: string;
  proveedorNombre: string;
  categoriaPrincipal: string;
  compras: number;
  ahorroPct: number;
  cumplimientoPct: number;
  leadTimeDias: number;
  score: number;
}

export interface PriceVariationItem extends BiTrendPoint {
  insumoId: string;
  insumoNombre: string;
  proveedorId?: string | null;
  variacionPct: number;
}

export interface SupplierComplianceItem {
  proveedorId: string;
  proveedorNombre: string;
  entregasATiempoPct: number;
  calidadRecepcionPct: number;
  ordenesCompletasPct: number;
  cumplimientoGlobalPct: number;
}

export interface StrategicPurchasingResponse {
  filters: StrategicPurchasingFilters;
  ahorrosCompras: number;
  proveedorMasCostoso: SupplierRanking | null;
  leadTimePromedioDias: number;
  comprasUrgentes: number;
  variacionPreciosPct: number;
  rankingProveedores: SupplierRanking[];
  tendenciaPrecios: PriceVariationItem[];
  cumplimientoProveedores: SupplierComplianceItem[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
