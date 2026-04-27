export type InventoryMovementType =
  | 'COMPRA_RECEPCION'
  | 'AJUSTE_POS'
  | 'AJUSTE_NEG'
  | 'DESPACHO_VENTA'
  | 'CONSUMO_MP'
  | 'INGRESO_PT'
  | 'BLOQUEO_CALIDAD'
  | 'LIBERACION_CALIDAD'
  | 'RECHAZO_CALIDAD'
  | 'MERMA_CALIDAD'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RESERVA_STOCK'
  | 'LIBERACION_RESERVA'
  | 'CONSUMO_REPUESTO_TPM'
  | 'DEVOLUCION';

export type InventoryMovementSign = 1 | -1 | 0;

export interface InventoryMovement {
  id: string;
  empresaId: string;
  fechaMovimiento: string;
  tipoMovimiento: InventoryMovementType;
  documentoOrigen: string | null;
  moduloOrigen: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  bodegaId: string;
  ubicacionId: string;
  loteId: string | null;
  lote: string | null;
  cantidad: number;
  signo: InventoryMovementSign;
  costoUnitario: number;
  costoTotal: number;
  saldoResultante: number;
  usuarioId: string;
  observacion: string | null;
}
