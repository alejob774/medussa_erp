import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  ClosePackingPayload,
  ClosePickingPayload,
  ConfirmPickingLinePayload,
  PickingPackingRepository,
} from '../../domain/repositories/picking-packing.repository';
import {
  PickingPackingDashboard,
  PickingPackingMutationResult,
} from '../../domain/models/picking-packing-response.model';
import { PickingFilters } from '../../domain/models/picking-filters.model';

@Injectable({
  providedIn: 'root',
})
export class PickingPackingApiRepository implements PickingPackingRepository {
  getDashboard(_companyId: string, _filters: PickingFilters): Observable<PickingPackingDashboard> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }

  startPicking(_companyId: string, _taskId: string, _operarioNombre: string): Observable<PickingPackingMutationResult> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }

  confirmLine(
    _companyId: string,
    _taskId: string,
    _detailId: string,
    _payload: ConfirmPickingLinePayload,
  ): Observable<PickingPackingMutationResult> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }

  closePicking(
    _companyId: string,
    _taskId: string,
    _payload: ClosePickingPayload,
  ): Observable<PickingPackingMutationResult> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }

  closePacking(
    _companyId: string,
    _taskId: string,
    _payload: ClosePackingPayload,
  ): Observable<PickingPackingMutationResult> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }

  markReadyForDispatch(
    _companyId: string,
    _packingId: string,
    _usuario: string,
  ): Observable<PickingPackingMutationResult> {
    return throwError(() => new Error('Picking y Packing API no disponible en runtime frontend-only.'));
  }
}
