import { BudgetManagementAlert, BudgetManagementAlertSeverity } from './budget-management-alert.model';
import { BudgetManagementExecution } from './budget-management-execution.model';
import { BudgetManagementHistory } from './budget-management-history.model';
import { BudgetManagementKpis } from './budget-management-kpi.model';
import { CostCenterCode, CostCenterOption } from './cost-center.model';

export type BudgetManagementCategory =
  | 'Materias primas'
  | 'Insumos'
  | 'Repuestos'
  | 'Etiquetas'
  | 'Empaques'
  | 'Embalajes';

export type BudgetSupplyType = 'MIR' | 'LOGISTICA';

export type BudgetManagementStatus =
  | 'CONTROLADO'
  | 'AJUSTADO'
  | 'EN_RIESGO'
  | 'SOBREGASTO';

export interface BudgetManagement {
  id: string;
  empresaId: string;
  empresaNombre: string;
  anio: number;
  mes: number;
  centroCosto: CostCenterCode;
  categoria: BudgetManagementCategory;
  tipoAbastecimiento: BudgetSupplyType;
  moneda: string;
  valorAprobado: number;
  valorAjustado: number;
  estado: BudgetManagementStatus;
  creadoEn: string;
  actualizadoEn: string;
}

export interface BudgetManagementAggregate {
  budget: BudgetManagement;
  execution: BudgetManagementExecution;
  alerts: BudgetManagementAlert[];
  history: BudgetManagementHistory[];
}

export interface BudgetManagementCatalogOption {
  value: string | number;
  label: string;
}

export interface BudgetManagementCatalogs {
  years: BudgetManagementCatalogOption[];
  months: BudgetManagementCatalogOption[];
  costCenters: CostCenterOption[];
  categories: Array<{ value: BudgetManagementCategory; label: string }>;
  supplyTypes: Array<{ value: BudgetSupplyType; label: string }>;
  statuses: Array<{ value: BudgetManagementStatus | 'TODOS'; label: string }>;
  severities: Array<{ value: BudgetManagementAlertSeverity | 'TODAS'; label: string }>;
}

export interface BudgetManagementComparisonPoint {
  label: string;
  plan: number;
  real: number;
  projected: number;
}

export interface BudgetManagementCharts {
  planVsRealByCenter: BudgetManagementComparisonPoint[];
  projectionByCategory: BudgetManagementComparisonPoint[];
}

export const BUDGET_MANAGEMENT_CATEGORIES: BudgetManagementCategory[] = [
  'Materias primas',
  'Insumos',
  'Repuestos',
  'Etiquetas',
  'Empaques',
  'Embalajes',
];

export const BUDGET_COST_CENTER_OPTIONS: CostCenterOption[] = [
  { value: 'PRODUCCION', label: 'Producción' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'LOGISTICA', label: 'Logística' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'CALIDAD', label: 'Calidad' },
];
