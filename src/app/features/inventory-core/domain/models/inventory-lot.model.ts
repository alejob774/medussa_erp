export type InventoryLotStatus =
  | 'LIBERADO'
  | 'RETENIDO'
  | 'BLOQUEADO'
  | 'CUARENTENA'
  | 'RECHAZADO';

export interface InventoryLot {
  id: string;
  empresaId: string;
  productoId: string;
  sku: string;
  numeroLote: string;
  fechaFabricacion: string | null;
  fechaVencimiento: string | null;
  estado: InventoryLotStatus;
  proveedorId: string | null;
  ordenProduccionId: string | null;
}
