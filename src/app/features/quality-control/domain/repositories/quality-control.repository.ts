import { Observable } from 'rxjs';
import { QualityControlDashboard, QualityControlMutationResult } from '../models/quality-control-response.model';
import { QualityInspectionFilters } from '../models/quality-inspection-filters.model';
import { QualityControlType, QualityDecisionAction, QualityNonConformityStatus } from '../models/quality-status.model';

export interface SaveQualityInspectionParameterPayload {
  templateId?: string | null;
  parametro: string;
  resultado: number;
  unidadMedida: string;
  rangoMin: number;
  rangoMax: number;
  esCritico: boolean;
}

export interface SaveQualityInspectionPayload {
  tipoControl: QualityControlType;
  loteId: string;
  productoId: string;
  proveedorId: string | null;
  ordenProduccion: string | null;
  fechaMuestra: string;
  analista: string;
  equipoUtilizado: string;
  observaciones: string | null;
  usuarioCrea: string;
  parametros: SaveQualityInspectionParameterPayload[];
}

export interface QualityLotDecisionPayload {
  accion: Extract<QualityDecisionAction, 'APROBAR' | 'RECHAZAR' | 'CUARENTENA'>;
  usuario: string;
  responsableLiberacion?: string | null;
  observacion: string | null;
}

export interface SaveQualityNonConformityPayload {
  motivo: string;
  accionCorrectiva: string;
  responsable: string;
  usuario: string;
  estado?: Exclude<QualityNonConformityStatus, 'CERRADA'>;
}

export interface CloseQualityNonConformityPayload {
  usuario: string;
  responsable: string;
  observacion: string | null;
}

export interface QualityControlRepository {
  getDashboard(companyId: string, filters: QualityInspectionFilters): Observable<QualityControlDashboard>;
  saveInspection(
    companyId: string,
    payload: SaveQualityInspectionPayload,
    inspectionId?: string,
  ): Observable<QualityControlMutationResult>;
  takeLotDecision(
    companyId: string,
    inspectionId: string,
    payload: QualityLotDecisionPayload,
  ): Observable<QualityControlMutationResult>;
  saveNonConformity(
    companyId: string,
    inspectionId: string,
    payload: SaveQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult>;
  closeNonConformity(
    companyId: string,
    nonConformityId: string,
    payload: CloseQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult>;
}
