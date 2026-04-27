export interface InventoryBalance {
  id: string;
  empresaId: string;
  productoId: string;
  sku: string;
  bodegaId: string;
  ubicacionId: string;
  loteId: string | null;
  lote: string | null;
  cantidadDisponible: number;
  cantidadReservada: number;
  cantidadTransito: number;
  costoUnitario: number;
  fechaUltimoMovimiento: string;
}
