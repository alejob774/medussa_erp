export type DemandAnalysisAlertType =
  | 'DESVIACION_ALTA'
  | 'CAIDA_DEMANDA'
  | 'CRECIMIENTO_ATIPICO'
  | 'ALTA_VARIABILIDAD';

export type DemandAnalysisAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface DemandAnalysisAlert {
  id: string;
  analisisId: string;
  skuId?: string | null;
  sku?: string | null;
  tipo: DemandAnalysisAlertType;
  severidad: DemandAnalysisAlertSeverity;
  descripcion: string;
  zona?: string | null;
  canal?: string | null;
}
