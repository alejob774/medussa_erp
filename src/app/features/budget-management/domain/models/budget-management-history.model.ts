export type BudgetManagementMovementType =
  | 'RESERVA'
  | 'CONSUMO'
  | 'LIBERACION'
  | 'AJUSTE';

export interface BudgetManagementHistory {
  id: string;
  presupuestoId: string;
  tipoMovimiento: BudgetManagementMovementType;
  referencia: string;
  valor: number;
  fecha: string;
  usuario: string;
}
