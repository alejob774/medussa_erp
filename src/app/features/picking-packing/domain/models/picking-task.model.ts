export type PickingTaskPriority = 'ALTA' | 'MEDIA' | 'BAJA';
export type PickingTaskState =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'CON_FALTANTE'
  | 'ALISTADO'
  | 'CERRADO';

export interface PickingTask {
  id: string;
  empresaId: string;
  pedidoId: string;
  clienteId: string;
  clienteNombre: string;
  rutaId: string;
  rutaNombre: string;
  conductorId: string | null;
  conductorNombre: string | null;
  zona: string;
  operarioNombre: string | null;
  prioridad: PickingTaskPriority;
  estado: PickingTaskState;
  fechaAsignacion: string;
  fechaCompromiso: string;
  fechaInicio: string | null;
  fechaCierre: string | null;
  lineasTotales: number;
  lineasConfirmadas: number;
  lineasConFaltante: number;
}
