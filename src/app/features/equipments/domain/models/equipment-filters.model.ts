import { EquipmentStatus } from './equipment.model';

export type EquipmentListStatusFilter = EquipmentStatus | 'TODOS';

export interface EquipmentFilters {
  empresaId?: string | null;
  estado?: EquipmentListStatusFilter | null;
  search?: string | null;
  tipoEquipo?: string | null;
  empresaFabricante?: string | null;
  ubicacionOperativa?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_EQUIPMENT_FILTERS: Required<EquipmentFilters> = {
  empresaId: null,
  estado: 'TODOS',
  search: '',
  tipoEquipo: null,
  empresaFabricante: null,
  ubicacionOperativa: null,
  page: 0,
  pageSize: 10,
};
