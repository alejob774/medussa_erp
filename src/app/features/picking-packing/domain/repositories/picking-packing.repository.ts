import { Observable } from 'rxjs';
import { PackingType } from '../models/packing.model';
import { PickingFilters } from '../models/picking-filters.model';
import {
  PickingPackingDashboard,
  PickingPackingMutationResult,
} from '../models/picking-packing-response.model';

export interface ConfirmPickingLinePayload {
  cantidadConfirmada: number;
  observacion: string | null;
}

export interface ClosePickingPayload {
  usuario: string;
  observacion: string | null;
}

export interface ClosePackingPayload {
  tipoEmpaque: PackingType;
  pesoTotal: number;
  volumenTotal: number;
  usuarioCierre: string;
}

export interface PickingPackingRepository {
  getDashboard(companyId: string, filters: PickingFilters): Observable<PickingPackingDashboard>;
  startPicking(
    companyId: string,
    taskId: string,
    operarioNombre: string,
  ): Observable<PickingPackingMutationResult>;
  confirmLine(
    companyId: string,
    taskId: string,
    detailId: string,
    payload: ConfirmPickingLinePayload,
  ): Observable<PickingPackingMutationResult>;
  closePicking(
    companyId: string,
    taskId: string,
    payload: ClosePickingPayload,
  ): Observable<PickingPackingMutationResult>;
  closePacking(
    companyId: string,
    taskId: string,
    payload: ClosePackingPayload,
  ): Observable<PickingPackingMutationResult>;
  markReadyForDispatch(
    companyId: string,
    packingId: string,
    usuario: string,
  ): Observable<PickingPackingMutationResult>;
}
