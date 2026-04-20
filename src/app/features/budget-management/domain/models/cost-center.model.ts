export type CostCenterCode =
  | 'PRODUCCION'
  | 'COMPRAS'
  | 'LOGISTICA'
  | 'BODEGA'
  | 'MANTENIMIENTO'
  | 'CALIDAD';

export interface CostCenterOption {
  value: CostCenterCode;
  label: string;
}
