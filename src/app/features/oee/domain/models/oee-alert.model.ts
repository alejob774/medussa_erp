export type OeeAlertType =
  | 'OEE_BAJO'
  | 'DISPONIBILIDAD_BAJA'
  | 'RENDIMIENTO_BAJO'
  | 'CALIDAD_BAJA'
  | 'PARO_CRITICO';

export type OeeAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface OeeAlert {
  id: string;
  registroId: string;
  tipo: OeeAlertType;
  severidad: OeeAlertSeverity;
  descripcion: string;
}
