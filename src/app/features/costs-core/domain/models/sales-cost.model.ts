export interface SalesCost {
  id: string;
  empresaId: string;
  facturaId: string | null;
  pedidoId: string | null;
  productoId: string;
  sku: string;
  productoNombre: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  precioVenta: number;
  margen: number;
  margenPct: number;
  fecha: string;
}

export interface ProductMargin {
  empresaId: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  cantidadVendida: number;
  ventas: number;
  costoVentas: number;
  margen: number;
  margenPct: number;
}
