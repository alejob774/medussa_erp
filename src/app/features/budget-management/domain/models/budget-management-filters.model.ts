import { BudgetManagementAlertSeverity } from './budget-management-alert.model';
import { BudgetManagementCategory, BudgetManagementStatus, BudgetSupplyType } from './budget-management.model';
import { CostCenterCode } from './cost-center.model';

const today = new Date();

export interface BudgetManagementFilters {
  anio: number;
  mes: number;
  centroCosto: CostCenterCode | null;
  categoria: BudgetManagementCategory | null;
  tipoAbastecimiento: BudgetSupplyType | null;
  estado: BudgetManagementStatus | 'TODOS';
  severidad: BudgetManagementAlertSeverity | 'TODAS';
}

export const DEFAULT_BUDGET_MANAGEMENT_FILTERS: BudgetManagementFilters = {
  anio: today.getFullYear(),
  mes: today.getMonth() + 1,
  centroCosto: null,
  categoria: null,
  tipoAbastecimiento: null,
  estado: 'TODOS',
  severidad: 'TODAS',
};
