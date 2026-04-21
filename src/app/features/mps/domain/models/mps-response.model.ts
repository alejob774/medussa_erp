import { DEFAULT_MPS_PLAN_FILTERS, MpsPlanFilters } from './mps-plan-filters.model';
import { MpsPlan } from './mps-plan.model';
import { MpsPlanDetail } from './mps-plan-detail.model';
import { MpsAlert, MpsAlertSeverity } from './mps-alert.model';
import { MpsSimulationLog } from './mps-simulation-log.model';
import { MpsCapacitySummary, ProductionLine } from './production-line.model';

export interface MpsCatalogs {
  plants: Array<{ value: string; label: string }>;
  families: Array<{ value: string; label: string }>;
  skus: Array<{ value: string; label: string; skuId: string; sku: string; productName: string }>;
  lines: Array<{ value: string; label: string; planta: string }>;
  severities: Array<{ value: MpsAlertSeverity | 'TODAS'; label: string }>;
}

export interface MpsPlanAggregate {
  plan: MpsPlan;
  details: MpsPlanDetail[];
  alerts: MpsAlert[];
  simulationLogs: MpsSimulationLog[];
  capacitySummary: MpsCapacitySummary[];
}

export interface MpsDashboard {
  filters: MpsPlanFilters;
  catalogs: MpsCatalogs;
  plans: MpsPlanAggregate[];
  selectedPlan: MpsPlanAggregate | null;
  productionLines: ProductionLine[];
}

export interface MpsAuditDraft {
  module: 'mps';
  action: 'seed' | 'generate' | 'edit' | 'simulate' | 'approve';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface MpsMutationResult {
  action: 'generated' | 'updated' | 'simulated' | 'approved';
  plan: MpsPlanAggregate;
  message: string;
  auditDraft: MpsAuditDraft;
}

export interface MpsStore {
  plans: MpsPlanAggregate[];
  productionLines: ProductionLine[];
  auditTrail: MpsAuditDraft[];
}

export const EMPTY_MPS_DASHBOARD: MpsDashboard = {
  filters: { ...DEFAULT_MPS_PLAN_FILTERS },
  catalogs: {
    plants: [],
    families: [],
    skus: [],
    lines: [],
    severities: [],
  },
  plans: [],
  selectedPlan: null,
  productionLines: [],
};
