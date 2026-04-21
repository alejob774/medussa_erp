export type InventoryCycleAlertType =
  | 'DIFERENCIA_CRITICA'
  | 'RECURRENCIA_UBICACION'
  | 'RECURRENCIA_SKU'
  | 'LOTE_VENCIDO'
  | 'BAJA_EXACTITUD';

export type InventoryCycleAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface InventoryCycleAlert {
  id: string;
  empresaId: string;
  skuId: string;
  ubicacionId: string;
  tipoAlerta: InventoryCycleAlertType;
  severidad: InventoryCycleAlertSeverity;
  descripcion: string;
  conteoId: string | null;
}
