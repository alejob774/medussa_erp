import { DEFAULT_BUDGET_MANAGEMENT_FILTERS, BudgetManagementFilters } from './budget-management-filters.model';
import { BudgetManagementAlert } from './budget-management-alert.model';
import { BudgetManagementKpis } from './budget-management-kpi.model';
import {
  BudgetManagementAggregate,
  BudgetManagementCatalogs,
  BudgetManagementCharts,
} from './budget-management.model';

export type BudgetManagementAuditAction = 'seed' | 'create' | 'edit' | 'adjust';

export interface BudgetManagementAuditDraft {
  module: 'gestion-presupuesto';
  action: BudgetManagementAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface BudgetManagementDashboard {
  filters: BudgetManagementFilters;
  catalogs: BudgetManagementCatalogs;
  budgets: BudgetManagementAggregate[];
  selectedBudget: BudgetManagementAggregate | null;
  kpis: BudgetManagementKpis;
  charts: BudgetManagementCharts;
  alerts: BudgetManagementAlert[];
}

export interface BudgetManagementMutationResult {
  action: 'created' | 'updated' | 'adjusted';
  budget: BudgetManagementAggregate;
  message: string;
  auditDraft: BudgetManagementAuditDraft;
}

export interface BudgetManagementStore {
  budgets: BudgetManagementAggregate[];
  auditTrail: BudgetManagementAuditDraft[];
}

export const EMPTY_BUDGET_MANAGEMENT_DASHBOARD: BudgetManagementDashboard = {
  filters: { ...DEFAULT_BUDGET_MANAGEMENT_FILTERS },
  catalogs: {
    years: [],
    months: [],
    costCenters: [],
    categories: [],
    supplyTypes: [],
    statuses: [],
    severities: [],
  },
  budgets: [],
  selectedBudget: null,
  kpis: {
    totalApproved: 0,
    totalConsumed: 0,
    totalAvailable: 0,
    riskCategories: 0,
    overspendActive: 0,
    projectedCloseTotal: 0,
  },
  charts: {
    planVsRealByCenter: [],
    projectionByCategory: [],
  },
  alerts: [],
};
