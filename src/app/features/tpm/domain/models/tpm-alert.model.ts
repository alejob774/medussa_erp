export type TpmAlertType =
  | 'MANTENIMIENTO_VENCIDO'
  | 'CALIBRACION_VENCIDA'
  | 'SANITARIO_PENDIENTE'
  | 'EQUIPO_BLOQUEADO'
  | 'REPUESTO_CRITICO'
  | 'CORRECTIVO_ABIERTO';

export type TpmAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface TpmAlert {
  id: string;
  equipoId: string;
  otId: string | null;
  tipo: TpmAlertType;
  severidad: TpmAlertSeverity;
  descripcion: string;
}
