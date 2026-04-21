export interface MpsSimulationLog {
  id: string;
  planId: string;
  tipoEvento: string;
  usuario: string;
  fecha: string;
  observacion: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}
