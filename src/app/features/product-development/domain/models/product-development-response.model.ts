import {
  DEFAULT_PRODUCT_DEVELOPMENT_FILTERS,
  ProductDevelopmentFilters,
} from './product-development-filters.model';
import {
  ProductDevelopmentDashboard,
  ProductDevelopmentProjectAggregate,
} from './product-development-project.model';

export type ProductDevelopmentAuditAction =
  | 'create'
  | 'update'
  | 'evaluate'
  | 'approve'
  | 'reject'
  | 'launch';

export interface ProductDevelopmentAuditDraft {
  module: 'desarrollo-productos';
  action: ProductDevelopmentAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface ProductDevelopmentMutationResult {
  action: 'created' | 'updated' | 'evaluated' | 'approved' | 'rejected' | 'launched';
  project: ProductDevelopmentProjectAggregate;
  message: string;
  auditDraft: ProductDevelopmentAuditDraft;
}

export interface ProductDevelopmentStore {
  projects: ProductDevelopmentProjectAggregate[];
  auditTrail: ProductDevelopmentAuditDraft[];
}

export const EMPTY_PRODUCT_DEVELOPMENT_DASHBOARD: ProductDevelopmentDashboard = {
  filters: { ...DEFAULT_PRODUCT_DEVELOPMENT_FILTERS },
  catalogs: {
    categories: [],
    targetMarkets: [],
    responsables: [],
    units: [],
    suppliers: [],
    statuses: [],
    viabilities: [],
    riskLevels: [],
  },
  kpis: {
    activeProjects: 0,
    evaluatingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    blockedByHighRisk: 0,
    upcomingLaunches: 0,
  },
  projects: [],
  selectedProject: null,
};
