import { BiBaseDateFilters, BiTrafficLightStatus } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicInventoryFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  bodegaId?: string | null;
  categoriaId?: string | null;
  proveedorId?: string | null;
  fechaCorte?: string | null;
  lineaId?: string | null;
  clasificacionAbc?: 'A' | 'B' | 'C' | null;
}

export type StrategicInventoryRisk =
  | 'QUIEBRE'
  | 'SOBREINVENTARIO'
  | 'LENTO_MOVIMIENTO'
  | 'VENCIMIENTO'
  | 'CAPITAL_INMOVILIZADO';

export interface CriticalSku {
  productoId: string;
  sku: string;
  productoNombre: string;
  categoriaId?: string | null;
  categoriaNombre?: string | null;
  proveedorId?: string | null;
  proveedorNombre?: string | null;
  bodegaId: string;
  bodegaNombre: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo?: number | null;
  coberturaDias: number;
  riesgo: StrategicInventoryRisk;
  valorInventario: number;
}

export interface InventoryAgingItem {
  rangoDias: string;
  productoId?: string | null;
  sku?: string | null;
  productoNombre?: string | null;
  bodegaId?: string | null;
  bodegaNombre?: string | null;
  diasSinMovimiento?: number | null;
  unidades: number;
  valorInventario: number;
  participacionPct: number;
  riesgo?: StrategicInventoryRisk | null;
}

export interface InventoryWarehouseSummary {
  bodegaId: string;
  bodegaNombre: string;
  stockActual: number;
  valorInventario: number;
  coberturaDias: number;
  skuQuiebre?: number | null;
  skuSobrestock?: number | null;
  ocupacionPct?: number | null;
  observacion?: string | null;
  estado: BiTrafficLightStatus;
}

export interface StrategicInventoryResponse {
  filters: StrategicInventoryFilters;
  stockActual: number;
  rotacionPromedio: number;
  inventarioLento: number;
  sobreinventario: number;
  quiebres: number;
  valorInventario: number;
  coberturaDias: number;
  topSkuCriticos: CriticalSku[];
  agingInventario: InventoryAgingItem[];
  inventarioPorBodega: InventoryWarehouseSummary[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
