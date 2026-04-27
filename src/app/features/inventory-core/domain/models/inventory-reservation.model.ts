export type InventoryReservationStatus = 'ACTIVA' | 'LIBERADA' | 'CONSUMIDA' | 'CANCELADA';

export interface InventoryReservation {
  id: string;
  empresaId: string;
  productoId: string;
  sku: string;
  bodegaId: string;
  loteId: string;
  lote: string;
  cantidad: number;
  origenTipo: string;
  origenId: string;
  estado: InventoryReservationStatus;
  fechaCrea: string;
}
