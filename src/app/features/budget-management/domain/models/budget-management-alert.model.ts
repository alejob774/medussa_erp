export type BudgetManagementAlertType =
  | 'SOBREGASTO'
  | 'RIESGO_DESVIACION'
  | 'PROYECCION_EXCESO'
  | 'CONSUMO_CRITICO';

export type BudgetManagementAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface BudgetManagementAlert {
  id: string;
  presupuestoId: string;
  tipo: BudgetManagementAlertType;
  severidad: BudgetManagementAlertSeverity;
  descripcion: string;
  centroCosto: string;
  categoria: string;
  tipoAbastecimiento: 'MIR' | 'LOGISTICA';
}
