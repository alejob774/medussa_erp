export type PurchaseAnalysisAlertType =
  | 'PROVEEDOR_UNICO'
  | 'DEPENDENCIA_ALTA'
  | 'INCUMPLIMIENTO_RECURRENTE'
  | 'ALZA_PRECIO'
  | 'CALIDAD_BAJA';

export type PurchaseAnalysisAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface PurchaseAnalysisAlert {
  id: string;
  analisisId: string;
  proveedorId?: string | null;
  categoria: string;
  tipo: PurchaseAnalysisAlertType;
  severidad: PurchaseAnalysisAlertSeverity;
  descripcion: string;
}
