export interface ProductionOrderCost {
  id: string;
  empresaId: string;
  opId: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  materiaPrimaConsumida: number;
  manoObra: number;
  energia: number;
  indirectos: number;
  merma: number;
  costoTotal: number;
  costoUnitarioFinal: number;
  fechaCalculo: string;
}
