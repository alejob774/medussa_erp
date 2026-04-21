import { TpmAlert, TpmAlertSeverity } from './tpm-alert.model';
import { TpmAsset, TpmEquipmentState } from './tpm-asset.model';
import { DEFAULT_TPM_FILTERS, TpmFilters } from './tpm-filters.model';
import { TpmHistory } from './tpm-history.model';
import { TpmKpis } from './tpm-kpi.model';
import { TpmMaintenanceType, TpmPlan } from './tpm-plan.model';
import { TpmSparePartCatalogItem } from './tpm-spare-part.model';
import { TpmWorkOrder, TpmWorkOrderState } from './tpm-work-order.model';

export interface TpmAssetAggregate {
  asset: TpmAsset;
  plans: TpmPlan[];
  workOrders: TpmWorkOrder[];
  alerts: TpmAlert[];
  history: TpmHistory[];
}

export interface TpmCatalogs {
  maintenanceTypes: Array<{ value: TpmMaintenanceType; label: string }>;
  equipmentStates: Array<{ value: TpmEquipmentState | 'TODOS'; label: string }>;
  workOrderStates: Array<{ value: TpmWorkOrderState | 'TODOS'; label: string }>;
  assets: Array<{ value: string; label: string; codigoEquipo: string; ubicacion: string }>;
  technicians: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
  severities: Array<{ value: TpmAlertSeverity | 'TODAS'; label: string }>;
  spareParts: TpmSparePartCatalogItem[];
}

export interface TpmAuditDraft {
  module: 'tpm';
  action:
    | 'seed'
    | 'asset-create'
    | 'asset-edit'
    | 'plan-create'
    | 'plan-edit'
    | 'work-order-create'
    | 'work-order-edit'
    | 'work-order-close';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface TpmDashboard {
  filters: TpmFilters;
  catalogs: TpmCatalogs;
  kpis: TpmKpis;
  assets: TpmAssetAggregate[];
  plans: TpmPlan[];
  workOrders: TpmWorkOrder[];
  alerts: TpmAlert[];
  histories: TpmHistory[];
  selectedAsset: TpmAssetAggregate | null;
  selectedWorkOrder: TpmWorkOrder | null;
}

export interface TpmMutationResult {
  action:
    | 'asset-created'
    | 'asset-updated'
    | 'plan-created'
    | 'plan-updated'
    | 'work-order-created'
    | 'work-order-updated'
    | 'work-order-closed';
  asset: TpmAssetAggregate | null;
  workOrder: TpmWorkOrder | null;
  message: string;
  auditDraft: TpmAuditDraft;
}

export interface TpmStore {
  assets: TpmAsset[];
  plans: TpmPlan[];
  workOrders: TpmWorkOrder[];
  alerts: TpmAlert[];
  histories: TpmHistory[];
  auditTrail: TpmAuditDraft[];
}

export const EMPTY_TPM_DASHBOARD: TpmDashboard = {
  filters: { ...DEFAULT_TPM_FILTERS },
  catalogs: {
    maintenanceTypes: [],
    equipmentStates: [],
    workOrderStates: [],
    assets: [],
    technicians: [],
    locations: [],
    severities: [],
    spareParts: [],
  },
  kpis: {
    equiposOperativos: 0,
    equiposBloqueados: 0,
    otsAbiertas: 0,
    mantenimientosVencidos: 0,
    calibracionesVencidas: 0,
    sanitariosPendientes: 0,
  },
  assets: [],
  plans: [],
  workOrders: [],
  alerts: [],
  histories: [],
  selectedAsset: null,
  selectedWorkOrder: null,
};
