import { DEFAULT_PICKING_FILTERS, PickingFilters } from './picking-filters.model';
import { Packing, PackingType } from './packing.model';
import { PickingAlert, PickingAlertSeverity } from './picking-alert.model';
import { PickingDetail } from './picking-detail.model';
import { PickingPackingKpis } from './picking-packing-kpi.model';
import { PickingProductivity } from './picking-productivity.model';
import { PickingTask } from './picking-task.model';

export interface PickingPackingCatalogs {
  routes: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  priorities: Array<{ value: PickingTask['prioridad'] | 'TODAS'; label: string }>;
  states: Array<{ value: PickingTask['estado'] | 'TODOS'; label: string }>;
  operators: Array<{ value: string; label: string }>;
  zones: Array<{ value: string; label: string }>;
  packageTypes: Array<{ value: PackingType; label: string }>;
  severities: Array<{ value: PickingAlertSeverity | 'TODAS'; label: string }>;
}

export interface PickingPackingDashboard {
  filters: PickingFilters;
  catalogs: PickingPackingCatalogs;
  tasks: PickingTask[];
  details: PickingDetail[];
  alerts: PickingAlert[];
  packings: Packing[];
  productivity: PickingProductivity[];
  kpis: PickingPackingKpis;
  selectedTask: PickingTask | null;
}

export interface PickingPackingAuditDraft {
  module: 'picking-packing';
  action:
    | 'seed'
    | 'pick-start'
    | 'line-confirm'
    | 'pick-close'
    | 'pack-close'
    | 'dispatch-ready';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface PickingPackingMutationResult {
  action:
    | 'task-started'
    | 'line-confirmed'
    | 'picking-closed'
    | 'packing-closed'
    | 'dispatch-ready';
  task: PickingTask | null;
  packing: Packing | null;
  message: string;
  auditDraft: PickingPackingAuditDraft;
}

export interface PickingPackingStore {
  tasks: PickingTask[];
  details: PickingDetail[];
  packings: Packing[];
  alerts: PickingAlert[];
  productivity: PickingProductivity[];
  auditTrail: PickingPackingAuditDraft[];
}

export const EMPTY_PICKING_PACKING_DASHBOARD: PickingPackingDashboard = {
  filters: { ...DEFAULT_PICKING_FILTERS },
  catalogs: {
    routes: [],
    clients: [],
    priorities: [],
    states: [],
    operators: [],
    zones: [],
    packageTypes: [],
    severities: [],
  },
  tasks: [],
  details: [],
  alerts: [],
  packings: [],
  productivity: [],
  kpis: {
    pendingOrders: 0,
    readyOrders: 0,
    shortageOrders: 0,
    otifPreparationPct: 0,
    topOperatorName: 'Sin datos',
    topOperatorLinesPerHour: 0,
    averagePreparationMinutes: 0,
  },
  selectedTask: null,
};
