import { BudgetManagementAlertSeverity } from './budget-management-alert.model';

export interface BudgetManagementExecution {
  id: string;
  presupuestoId: string;
  valorConsumido: number;
  saldoDisponible: number;
  desviacionPct: number;
  proyeccionCierre: number;
  riesgoPrincipal: string;
  severidad: BudgetManagementAlertSeverity;
}
