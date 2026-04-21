export type MpsPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface MpsPlanDetail {
  id: string;
  planId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  fechaProduccion: string;
  lineaProduccion: string;
  cantidadPlanificada: number;
  horasRequeridas: number;
  prioridad: MpsPriority;
  riesgoFaltante: boolean;
  riesgoVencimiento: boolean;
  requiereCompra: boolean;
  materialDisponible: boolean;
  capacidadDisponible: boolean;
  editable: boolean;
  inventarioDisponible: number;
  stockSeguridad: number;
  demandaBase: number;
  pedidosUrgentes: number;
  capacidadHorasDisponibles: number;
  bomVersion: string | null;
}
