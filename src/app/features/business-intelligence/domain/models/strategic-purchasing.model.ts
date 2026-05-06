import { BiBaseDateFilters, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface StrategicPurchasingFilters extends BiBaseDateFilters {
  categoriaId?: string | null;
  proveedorId?: string | null;
  compradorId?: string | null;
  moneda?: 'COP' | 'USD';
}

export interface SupplierRanking {
  proveedorId: string;
  proveedorNombre: string;
  categoriaId?: string | null;
  categoriaPrincipal: string;
  compras: number;
  precioPromedio?: number | null;
  comprasUrgentes?: number | null;
  ahorroPct: number;
  cumplimientoPct: number;
  leadTimeDias: number;
  score: number;
}

export interface PriceVariationItem extends BiTrendPoint {
  insumoId: string;
  insumoNombre: string;
  categoriaId?: string | null;
  categoriaNombre?: string | null;
  proveedorId?: string | null;
  precioAnterior?: number | null;
  precioActual?: number | null;
  impactoEstimado?: number | null;
  variacionPct: number;
  tendencia?: 'SUBE' | 'BAJA' | 'ESTABLE' | null;
}

export interface SupplierComplianceItem {
  proveedorId: string;
  proveedorNombre: string;
  entregasATiempoPct: number;
  leadTimeDias?: number | null;
  calidadRecepcionPct: number;
  ordenesCompletasPct: number;
  cumplimientoGlobalPct: number;
  observacion?: string | null;
}

export interface UrgentPurchaseOpportunity {
  id: string;
  causa: 'QUIEBRE_STOCK' | 'MALA_PLANEACION' | 'VENTA_INESPERADA' | 'PROVEEDOR_INCUMPLIDO' | 'LEAD_TIME_SUBESTIMADO';
  proveedorId: string;
  proveedorNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  valor: number;
  recomendacion: string;
}

export interface PurchasingOpportunity {
  id: string;
  tipo: 'CONSOLIDAR_PROVEEDOR' | 'RENEGOCIAR_PRECIO' | 'AMPLIAR_LEAD_TIME' | 'SUSTITUIR_INSUMO' | 'REVISAR_PRESUPUESTO';
  proveedorId?: string | null;
  proveedorNombre?: string | null;
  categoriaNombre: string;
  impactoEstimado: number;
  recomendacion: string;
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
  comprasUrgentesDetalle?: UrgentPurchaseOpportunity[];
  oportunidades?: PurchasingOpportunity[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
