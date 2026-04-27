import { BiBaseDateFilters, BiCurrency } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface ProfitabilityFilters extends BiBaseDateFilters {
  lineaProductoId?: string | null;
  productoId?: string | null;
  top?: number | null;
  moneda?: BiCurrency;
}

export interface ProductProfitabilityItem {
  productoId: string;
  sku: string;
  productoNombre: string;
  lineaProductoId?: string | null;
  lineaProductoNombre?: string | null;
  ventas: number;
  costoVentas: number;
  margenBruto: number;
  margenBrutoPct: number;
}

export interface ProfitabilityProductLineResponse {
  filters: ProfitabilityFilters;
  productoMasRentable: ProductProfitabilityItem | null;
  productoMenosRentable: ProductProfitabilityItem | null;
  margenBrutoPromedio: number;
  costosVariables: number;
  costosIndirectos: number;
  topRentables: ProductProfitabilityItem[];
  topNoRentables: ProductProfitabilityItem[];
  rankingProductos: ProductProfitabilityItem[];
  grafana?: BiDashboardEmbedConfig | null;
}
