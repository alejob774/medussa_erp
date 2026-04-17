export type DemandTrend = 'CRECE' | 'CAE' | 'ESTABLE';

export interface DemandAnalysisDetail {
  id: string;
  analisisId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  canal: string;
  zona: string;
  segmento: string;
  clienteId?: string | null;
  clienteNombre?: string | null;
  periodo: string;
  forecast: number;
  ventaReal: number;
  desviacionAbs: number;
  desviacionPct: number;
  mape: number;
  sesgo: number;
  tendencia: DemandTrend;
  variabilidad: number;
  valorVenta: number;
  alertaPrincipal?: string | null;
}
