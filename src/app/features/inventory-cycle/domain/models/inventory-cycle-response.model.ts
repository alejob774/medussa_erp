import { DEFAULT_INVENTORY_CYCLE_FILTERS, InventoryCycleFilters } from './inventory-cycle-filters.model';
import { InventoryCycleKpis } from './inventory-cycle-kpi.model';
import { InventoryCycleAdjustment } from './inventory-cycle-adjustment.model';
import { InventoryCycleAlert, InventoryCycleAlertSeverity } from './inventory-cycle-alert.model';
import { InventoryCycleCount } from './inventory-cycle-count.model';
import { InventoryCycleHistory } from './inventory-cycle-history.model';
import { InventoryAccuracy } from './inventory-accuracy.model';

export interface InventoryCycleCatalogs {
  warehouses: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string; warehouseId: string }>;
  skus: Array<{ value: string; label: string; skuId: string; sku: string; productName: string }>;
  lots: Array<{ value: string; label: string; lotId: string; ubicacionId: string; sku: string }>;
  states: Array<{ value: InventoryCycleCount['estado'] | 'TODOS'; label: string }>;
  severities: Array<{ value: InventoryCycleAlertSeverity | 'TODAS'; label: string }>;
}

export interface InventoryCycleRecurrenceItem {
  label: string;
  count: number;
  severity: InventoryCycleAlertSeverity;
}

export interface InventoryCycleDashboard {
  filters: InventoryCycleFilters;
  catalogs: InventoryCycleCatalogs;
  counts: InventoryCycleCount[];
  adjustments: InventoryCycleAdjustment[];
  accuracies: InventoryAccuracy[];
  alerts: InventoryCycleAlert[];
  histories: InventoryCycleHistory[];
  selectedCount: InventoryCycleCount | null;
  kpis: InventoryCycleKpis;
  pendingAdjustments: InventoryCycleAdjustment[];
  recurrentLocations: InventoryCycleRecurrenceItem[];
  recurrentSkus: InventoryCycleRecurrenceItem[];
}

export type InventoryCycleAuditAction =
  | 'seed'
  | 'count-create'
  | 'count-edit'
  | 'adjust-approve'
  | 'count-close';

export interface InventoryCycleAuditDraft {
  module: 'ciclo-inventarios';
  action: InventoryCycleAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface InventoryCycleMutationResult {
  action: 'count-created' | 'count-updated' | 'adjustment-approved' | 'count-closed';
  count: InventoryCycleCount;
  adjustment: InventoryCycleAdjustment | null;
  message: string;
  auditDraft: InventoryCycleAuditDraft;
}

export interface InventoryCycleStore {
  counts: InventoryCycleCount[];
  adjustments: InventoryCycleAdjustment[];
  accuracies: InventoryAccuracy[];
  alerts: InventoryCycleAlert[];
  histories: InventoryCycleHistory[];
  auditTrail: InventoryCycleAuditDraft[];
}

export const EMPTY_INVENTORY_CYCLE_DASHBOARD: InventoryCycleDashboard = {
  filters: { ...DEFAULT_INVENTORY_CYCLE_FILTERS },
  catalogs: {
    warehouses: [],
    locations: [],
    skus: [],
    lots: [],
    states: [],
    severities: [],
  },
  counts: [],
  adjustments: [],
  accuracies: [],
  alerts: [],
  histories: [],
  selectedCount: null,
  kpis: {
    totalCounts: 0,
    averageAccuracyPct: 0,
    criticalDifferences: 0,
    pendingAdjustments: 0,
    recurrentLocations: 0,
    recurrentSkus: 0,
  },
  pendingAdjustments: [],
  recurrentLocations: [],
  recurrentSkus: [],
};
