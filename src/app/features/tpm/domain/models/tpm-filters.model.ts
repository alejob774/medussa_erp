import { TpmAlertSeverity } from './tpm-alert.model';
import { TpmEquipmentState } from './tpm-asset.model';
import { TpmMaintenanceType } from './tpm-plan.model';
import { TpmWorkOrderState } from './tpm-work-order.model';

export interface TpmFilters {
  equipoId: string | null;
  tipoMantenimiento: TpmMaintenanceType | 'TODOS';
  estadoEquipo: TpmEquipmentState | 'TODOS';
  estadoOt: TpmWorkOrderState | 'TODOS';
  tecnico: string | null;
  ubicacion: string | null;
  severidadAlerta: TpmAlertSeverity | 'TODAS';
}

export const DEFAULT_TPM_FILTERS: TpmFilters = {
  equipoId: null,
  tipoMantenimiento: 'TODOS',
  estadoEquipo: 'TODOS',
  estadoOt: 'TODOS',
  tecnico: null,
  ubicacion: null,
  severidadAlerta: 'TODAS',
};
