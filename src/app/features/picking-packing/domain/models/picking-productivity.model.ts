export interface PickingProductivity {
  id: string;
  empresaId: string;
  operario: string;
  fechaOperacion: string;
  pedidosPreparados: number;
  lineasPreparadas: number;
  tiempoTotal: number;
  otifInterno: number;
  lineasPorHora: number;
}
