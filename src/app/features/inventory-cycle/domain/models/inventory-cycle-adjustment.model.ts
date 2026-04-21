export type InventoryAdjustmentType = 'ENTRADA' | 'SALIDA';

export interface InventoryCycleAdjustment {
  id: string;
  empresaId: string;
  conteoId: string;
  tipoAjuste: InventoryAdjustmentType;
  cantidad: number;
  motivo: string;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
}
