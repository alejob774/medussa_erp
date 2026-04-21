import { TpmMaintenanceType } from './tpm-plan.model';
import { TpmSparePart } from './tpm-spare-part.model';

export type TpmWorkOrderState = 'PROGRAMADA' | 'EN_PROCESO' | 'CERRADA' | 'VENCIDA' | 'CANCELADA';

export interface TpmWorkOrder {
  id: string;
  empresaId: string;
  equipoId: string;
  planId: string | null;
  tipo: TpmMaintenanceType;
  fechaProgramada: string;
  fechaInicio: string | null;
  fechaCierre: string | null;
  tecnico: string;
  estado: TpmWorkOrderState;
  tiempoReparacion: number;
  costo: number;
  causaRaiz: string | null;
  observaciones: string | null;
  repuestosUsados: TpmSparePart[];
  generaBloqueo: boolean;
  impactoOee: string | null;
}
