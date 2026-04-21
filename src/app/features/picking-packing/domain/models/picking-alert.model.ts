export type PickingAlertType =
  | 'SKU_SIN_STOCK'
  | 'PICKING_INCOMPLETO'
  | 'UBICACION_INVALIDA'
  | 'PEDIDO_BLOQUEADO'
  | 'PACKING_PENDIENTE';

export type PickingAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface PickingAlert {
  id: string;
  empresaId: string;
  pedidoId: string;
  tipo: PickingAlertType;
  severidad: PickingAlertSeverity;
  descripcion: string;
}
