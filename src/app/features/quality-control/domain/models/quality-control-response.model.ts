import {
  DEFAULT_QUALITY_INSPECTION_FILTERS,
  QualityInspectionFilters,
} from './quality-inspection-filters.model';
import {
  QualityInspectionAggregate,
  QualityInspectionEvaluation,
} from './quality-inspection.model';
import { QualityLotHistory } from './quality-lot-history.model';
import { QualityNonConformity } from './quality-nonconformity.model';
import { QualityControlKpis } from './quality-control-kpi.model';
import {
  QualityControlType,
  QualityDecisionAction,
  QualityLotStatus,
  QualityNonConformityStatus,
} from './quality-status.model';

export interface QualityParameterTemplate {
  id: string;
  parametro: string;
  unidadMedida: string;
  rangoMin: number;
  rangoMax: number;
  esCritico: boolean;
  tiposControl: QualityControlType[];
  equipoSugerido: string | null;
}

export interface QualityControlCatalogs {
  controlTypes: Array<{ value: QualityControlType; label: string }>;
  lotStatuses: Array<{ value: QualityLotStatus | 'TODOS'; label: string }>;
  lots: Array<{
    value: string;
    label: string;
    lotCode: string;
    productId: string;
    productName: string;
    supplierId: string | null;
    supplierName: string | null;
  }>;
  products: Array<{ value: string; label: string; productCode: string; productName: string }>;
  suppliers: Array<{ value: string; label: string }>;
  analysts: Array<{ value: string; label: string }>;
  equipments: Array<{ value: string; label: string }>;
  releasers: Array<{ value: string; label: string }>;
  actionOptions: Array<{ value: QualityDecisionAction; label: string }>;
  nonConformityStatuses: Array<{ value: QualityNonConformityStatus; label: string }>;
  parameterTemplates: QualityParameterTemplate[];
  orderProductionOptions: Array<{ value: string; label: string; productId: string; lotId: string }>;
}

export interface QualityControlAuditDraft {
  module: 'control-calidad';
  action:
    | 'seed'
    | 'inspection-create'
    | 'inspection-edit'
    | 'lot-approve'
    | 'lot-reject'
    | 'lot-quarantine'
    | 'nc-create'
    | 'nc-close';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface QualityControlDashboard {
  filters: QualityInspectionFilters;
  catalogs: QualityControlCatalogs;
  kpis: QualityControlKpis;
  inspections: QualityInspectionAggregate[];
  nonConformities: QualityNonConformity[];
  histories: QualityLotHistory[];
  selectedInspection: QualityInspectionAggregate | null;
}

export interface QualityControlMutationResult {
  action:
    | 'inspection-created'
    | 'inspection-updated'
    | 'lot-approved'
    | 'lot-rejected'
    | 'lot-quarantine'
    | 'nc-created'
    | 'nc-closed';
  inspection: QualityInspectionAggregate | null;
  nonConformity: QualityNonConformity | null;
  message: string;
  auditDraft: QualityControlAuditDraft;
}

export interface QualityControlStore {
  inspections: QualityInspectionAggregate[];
  nonConformities: QualityNonConformity[];
  histories: QualityLotHistory[];
  auditTrail: QualityControlAuditDraft[];
}

export const EMPTY_QUALITY_EVALUATION: QualityInspectionEvaluation = {
  totalParametros: 0,
  conformes: 0,
  noConformes: 0,
  criticosFueraDeRango: 0,
  sugerenciaEstado: 'PENDIENTE',
  accionSugerida: 'REINSPECCION',
  inspeccionConforme: false,
};

export const EMPTY_QUALITY_CONTROL_DASHBOARD: QualityControlDashboard = {
  filters: { ...DEFAULT_QUALITY_INSPECTION_FILTERS },
  catalogs: {
    controlTypes: [],
    lotStatuses: [],
    lots: [],
    products: [],
    suppliers: [],
    analysts: [],
    equipments: [],
    releasers: [],
    actionOptions: [],
    nonConformityStatuses: [],
    parameterTemplates: [],
    orderProductionOptions: [],
  },
  kpis: {
    totalInspections: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    quarantineCount: 0,
    openNonConformities: 0,
  },
  inspections: [],
  nonConformities: [],
  histories: [],
  selectedInspection: null,
};
