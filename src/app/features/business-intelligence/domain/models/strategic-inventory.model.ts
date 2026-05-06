import { BiBaseDateFilters, BiTrafficLightStatus } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicInventoryFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  bodegaId?: string | null;
  lineaId?: string | null;
  clasificacionAbc?: 'A' | 'B' | 'C' | null;
}

export interface CriticalSku {
  productoId: string;
  sku: string;
  productoNombre: string;
  bodegaId: string;
  bodegaNombre: string;
  stockActual: number;
  stockMinimo: number;
  coberturaDias: number;
  riesgo: 'QUIEBRE' | 'SOBREINVENTARIO' | 'LENTO_MOVIMIENTO';
  valorInventario: number;
}

export interface InventoryAgingItem {
  rangoDias: string;
  unidades: number;
  valorInventario: number;
  participacionPct: number;
}

export interface InventoryWarehouseSummary {
  bodegaId: string;
  bodegaNombre: string;
  stockActual: number;
  valorInventario: number;
  coberturaDias: number;
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
