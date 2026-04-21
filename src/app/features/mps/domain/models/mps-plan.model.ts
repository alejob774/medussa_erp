export type MpsPlanStatus = 'BORRADOR' | 'GENERADO' | 'AJUSTADO' | 'APROBADO' | 'OBSOLETO';

export interface MpsPlanSummary {
  skuPlanificados: number;
  totalAProducir: number;
  lineasSaturadas: number;
  alertasCriticas: number;
  riesgoFaltante: number;
  comprasRequeridas: number;
}

export interface MpsPlan {
  id: string;
  empresaId: string;
  empresaNombre: string;
  planta: string;
  fechaInicio: string;
  fechaFin: string;
  familia: string | null;
  considerarFEFO: boolean;
  considerarPedidosUrgentes: boolean;
  estado: MpsPlanStatus;
  usuarioCrea: string;
  fechaCreacion: string;
  usuarioAprueba: string | null;
  fechaAprobacion: string | null;
  resumenKpis: MpsPlanSummary;
  observaciones: string | null;
}
