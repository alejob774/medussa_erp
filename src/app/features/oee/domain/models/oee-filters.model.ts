import { OeeAlertSeverity } from './oee-alert.model';
import { OeeShiftCode } from './oee-shift.model';

export interface OeeFilters {
  fechaOperacion: string | null;
  planta: string | null;
  lineaProduccion: string | null;
  maquinaId: string | null;
  turno: OeeShiftCode | null;
  operario: string | null;
  severidadAlerta: OeeAlertSeverity | 'TODAS';
}

export const DEFAULT_OEE_FILTERS: OeeFilters = {
  fechaOperacion: null,
  planta: null,
  lineaProduccion: null,
  maquinaId: null,
  turno: null,
  operario: null,
  severidadAlerta: 'TODAS',
};
