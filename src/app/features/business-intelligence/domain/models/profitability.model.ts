import { BiBaseDateFilters, BiCurrency } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface ProfitabilityFilters extends BiBaseDateFilters {
  lineaProductoId?: string | null;
  productoId?: string | null;
  top?: number | null;
  moneda?: BiCurrency;
}

export type ProfitabilityClassification =
  | 'ALTA_RENTABILIDAD'
  | 'RENTABLE'
  | 'MARGEN_BAJO'
  | 'PERDIDA'
  | 'REVISAR_COSTO';

export interface ProductProfitabilityItem {
  productoId: string;
  sku: string;
  productoNombre: string;
  lineaProductoId?: string | null;
  lineaProductoNombre?: string | null;
  ventas: number;
  costoVariable: number;
  costoIndirecto: number;
  costoVentas: number;
  utilidad: number;
  margenBruto: number;
  margenBrutoPct: number;
  clasificacion: ProfitabilityClassification;
  causaSugerida?: string | null;
}

export interface ProductLineProfitabilityItem {
  lineaProductoId: string;
  lineaProductoNombre: string;
  ventas: number;
  costoTotal: number;
  utilidad: number;
  margenPromedioPct: number;
  participacionVentasPct: number;
}

export interface ProfitabilityExecutiveInsight {
  titulo: string;
  descripcion: string;
  severidad: 'POSITIVA' | 'SEGUIMIENTO' | 'CRITICA';
}

export interface ProfitabilityProductLineResponse {
  filters: ProfitabilityFilters;
  productoMasRentable: ProductProfitabilityItem | null;
  productoMenosRentable: ProductProfitabilityItem | null;
  margenBrutoPromedio: number;
  costosVariables: number;
  costosIndirectos: number;
  utilidadEstimadaTotal: number;
  topRentables: ProductProfitabilityItem[];
  topNoRentables: ProductProfitabilityItem[];
  rentabilidadLineas: ProductLineProfitabilityItem[];
  rankingProductos: ProductProfitabilityItem[];
  lecturaEjecutiva: ProfitabilityExecutiveInsight[];
  grafana?: BiDashboardEmbedConfig | null;
}
