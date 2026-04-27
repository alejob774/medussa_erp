export type CostingMethod = 'FIFO' | 'PROMEDIO' | 'ESTANDAR';

export interface ProductCost {
  id: string;
  empresaId: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  metodoCosto: CostingMethod;
  costoActual: number;
  fechaActualizacion: string;
  fuenteUltimoCosto: string;
}
