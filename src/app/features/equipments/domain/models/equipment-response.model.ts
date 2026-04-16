import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from './equipment-filters.model';
import { Equipment } from './equipment.model';

export type EquipmentAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type EquipmentMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface EquipmentAuditDraft {
  module: 'equipos';
  action: EquipmentAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface EquipmentListResponse {
  items: Equipment[];
  total: number;
  page: number;
  pageSize: number;
  filters: EquipmentFilters;
}

export interface EquipmentMutationResult {
  action: EquipmentMutationAction;
  equipment: Equipment | null;
  message: string;
  auditDraft: EquipmentAuditDraft;
}

export interface EquipmentStore {
  equipments: Equipment[];
  auditTrail: EquipmentAuditDraft[];
}

export const EMPTY_EQUIPMENT_LIST_RESPONSE: EquipmentListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_EQUIPMENT_FILTERS.page,
  pageSize: DEFAULT_EQUIPMENT_FILTERS.pageSize,
  filters: { ...DEFAULT_EQUIPMENT_FILTERS },
};
