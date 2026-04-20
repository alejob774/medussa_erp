import { Observable } from 'rxjs';
import { BudgetManagementDashboard, BudgetManagementMutationResult } from '../models/budget-management-response.model';
import { BudgetManagementFilters } from '../models/budget-management-filters.model';
import { BudgetManagementCategory, BudgetSupplyType } from '../models/budget-management.model';
import { CostCenterCode } from '../models/cost-center.model';

export interface SaveBudgetManagementPayload {
  anio: number;
  mes: number;
  centroCosto: CostCenterCode;
  categoria: BudgetManagementCategory;
  tipoAbastecimiento: BudgetSupplyType;
  moneda: string;
  valorAprobado: number;
  valorAjustado: number;
  referencia: string | null;
  observaciones: string | null;
  usuario: string;
}

export interface AdjustBudgetManagementPayload {
  valorAprobado: number;
  valorAjustado: number;
  referencia: string;
  observaciones: string | null;
  usuario: string;
}

export interface BudgetManagementRepository {
  getDashboard(companyId: string, filters: BudgetManagementFilters): Observable<BudgetManagementDashboard>;
  saveBudget(
    companyId: string,
    payload: SaveBudgetManagementPayload,
    budgetId?: string,
  ): Observable<BudgetManagementMutationResult>;
  adjustBudget(
    companyId: string,
    budgetId: string,
    payload: AdjustBudgetManagementPayload,
  ): Observable<BudgetManagementMutationResult>;
}
