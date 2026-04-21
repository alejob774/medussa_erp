import { OeeAlertSeverity } from './oee-alert.model';

export type DowntimeCauseCode =
  | 'FALTA_MATERIAL'
  | 'LIMPIEZA'
  | 'CAMBIO_FORMATO'
  | 'FALLA_MECANICA'
  | 'AJUSTE_CALIDAD'
  | 'ESPERA_OPERARIO'
  | 'MANTENIMIENTO_NO_PROGRAMADO';

export interface DowntimeCause {
  code: DowntimeCauseCode;
  label: string;
  critical: boolean;
  suggestedSeverity: OeeAlertSeverity;
}
