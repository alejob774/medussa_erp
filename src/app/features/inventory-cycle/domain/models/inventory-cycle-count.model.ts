export type InventoryCycleCountStatus =
  | 'REGISTRADO'
  | 'CON_DIFERENCIA'
  | 'PENDIENTE_APROBACION'
  | 'AJUSTADO'
  | 'CERRADO';

export interface InventoryCycleCount {
  id: string;
  empresaId: string;
  bodegaId: string;
  ubicacionId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  loteId: string;
  lote: string;
  stockSistema: number;
  conteoFisico: number;
  diferencia: number;
  usuarioConteo: string;
  fechaConteo: string;
  estado: InventoryCycleCountStatus;
}
