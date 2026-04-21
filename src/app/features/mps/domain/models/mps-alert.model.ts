export type MpsAlertType =
  | 'CAPACIDAD_INSUFICIENTE'
  | 'RIESGO_FALTANTE'
  | 'RIESGO_VENCIMIENTO'
  | 'MATERIA_PRIMA_INSUFICIENTE'
  | 'STOCK_SEGURIDAD_COMPROMETIDO';

export type MpsAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface MpsAlert {
  id: string;
  planId: string;
  skuId: string | null;
  tipoAlerta: MpsAlertType;
  severidad: MpsAlertSeverity;
  descripcion: string;
}
