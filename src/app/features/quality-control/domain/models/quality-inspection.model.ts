import { QualityInspectionDetail } from './quality-inspection-detail.model';
import { QualityControlType, QualityDecisionAction, QualityLotStatus } from './quality-status.model';

export interface QualityInspection {
  id: string;
  empresaId: string;
  empresaNombre: string;
  tipoControl: QualityControlType;
  loteId: string;
  loteCodigo: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  proveedorId: string | null;
  proveedorNombre: string | null;
  ordenProduccion: string | null;
  fechaMuestra: string;
  analista: string;
  equipoUtilizado: string;
  estadoLote: QualityLotStatus;
  liberado: boolean;
  observaciones: string | null;
  usuarioCrea: string;
  fechaCrea: string;
  responsableLiberacion: string | null;
  fechaLiberacion: string | null;
}

export interface QualityInspectionEvaluation {
  totalParametros: number;
  conformes: number;
  noConformes: number;
  criticosFueraDeRango: number;
  sugerenciaEstado: QualityLotStatus;
  accionSugerida: QualityDecisionAction;
  inspeccionConforme: boolean;
}

export interface QualityInspectionAggregate {
  inspection: QualityInspection;
  parameters: QualityInspectionDetail[];
  evaluation: QualityInspectionEvaluation;
}
