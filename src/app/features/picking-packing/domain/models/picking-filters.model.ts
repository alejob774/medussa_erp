import { PickingAlertSeverity } from './picking-alert.model';
import { PickingTaskPriority, PickingTaskState } from './picking-task.model';

export interface PickingFilters {
  rutaId: string | null;
  clienteId: string | null;
  prioridad: PickingTaskPriority | 'TODAS';
  estado: PickingTaskState | 'TODOS';
  fecha: string | null;
  operarioNombre: string | null;
  zona: string | null;
  severidad: PickingAlertSeverity | 'TODAS';
}

export const DEFAULT_PICKING_FILTERS: PickingFilters = {
  rutaId: null,
  clienteId: null,
  prioridad: 'TODAS',
  estado: 'TODOS',
  fecha: null,
  operarioNombre: null,
  zona: null,
  severidad: 'TODAS',
};
