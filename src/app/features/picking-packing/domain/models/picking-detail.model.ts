export type PickingDetailState = 'PENDIENTE' | 'CONFIRMADO' | 'FALTANTE' | 'BLOQUEADO';

export interface PickingDetail {
  id: string;
  tareaId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  ubicacionId: string;
  ubicacionCodigo: string;
  loteId: string;
  lote: string;
  cantidadSolicitada: number;
  cantidadConfirmada: number;
  stockDisponible: number;
  tieneFaltante: boolean;
  observacion: string | null;
  estado: PickingDetailState;
}
