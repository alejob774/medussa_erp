import { DowntimeCause } from './downtime-cause.model';
import { OeeAlert, OeeAlertSeverity } from './oee-alert.model';
import { DEFAULT_OEE_FILTERS, OeeFilters } from './oee-filters.model';
import { OeeHistory } from './oee-history.model';
import { OeeKpis } from './oee-kpi.model';
import { OeeRecord } from './oee-record.model';
import { OeeShift } from './oee-shift.model';

export interface OeeRecordAggregate {
  record: OeeRecord;
  alerts: OeeAlert[];
  history: OeeHistory[];
}

export interface OeeCatalogs {
  plants: Array<{ value: string; label: string }>;
  lines: Array<{ value: string; label: string; planta: string }>;
  machines: Array<{
    value: string;
    label: string;
    machineCode: string;
    machineName: string;
    planta: string;
    lineaProduccion: string;
  }>;
  shifts: OeeShift[];
  downtimeCauses: DowntimeCause[];
  operators: Array<{ value: string; label: string }>;
  supervisors: Array<{ value: string; label: string }>;
  productionOrders: Array<{
    value: string;
    label: string;
    planta: string;
    lineaProduccion: string;
    machineId: string | null;
  }>;
  severities: Array<{ value: OeeAlertSeverity | 'TODAS'; label: string }>;
  oeeTarget: number;
}

export interface OeeAuditDraft {
  module: 'oee';
  action: 'seed' | 'record-create' | 'record-edit' | 'downtime-register';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface OeeDashboard {
  filters: OeeFilters;
  catalogs: OeeCatalogs;
  kpis: OeeKpis;
  records: OeeRecordAggregate[];
  alerts: OeeAlert[];
  histories: OeeHistory[];
  selectedRecord: OeeRecordAggregate | null;
}

export interface OeeMutationResult {
  action: 'record-created' | 'record-updated' | 'downtime-registered';
  record: OeeRecordAggregate;
  message: string;
  auditDraft: OeeAuditDraft;
}

export interface OeeStore {
  records: OeeRecord[];
  alerts: OeeAlert[];
  histories: OeeHistory[];
  auditTrail: OeeAuditDraft[];
}

export const EMPTY_OEE_DASHBOARD: OeeDashboard = {
  filters: { ...DEFAULT_OEE_FILTERS },
  catalogs: {
    plants: [],
    lines: [],
    machines: [],
    shifts: [],
    downtimeCauses: [],
    operators: [],
    supervisors: [],
    productionOrders: [],
    severities: [],
    oeeTarget: 0.85,
  },
  kpis: {
    registrosPeriodo: 0,
    oeePromedio: 0,
    disponibilidadPromedio: 0,
    rendimientoPromedio: 0,
    calidadPromedio: 0,
    maquinasBajoMeta: 0,
  },
  records: [],
  alerts: [],
  histories: [],
  selectedRecord: null,
};
