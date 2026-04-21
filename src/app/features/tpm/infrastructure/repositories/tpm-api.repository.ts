import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { TpmFilters } from '../../domain/models/tpm-filters.model';
import { TpmDashboard, TpmMutationResult } from '../../domain/models/tpm-response.model';
import {
  CloseTpmWorkOrderPayload,
  SaveTpmAssetPayload,
  SaveTpmPlanPayload,
  SaveTpmWorkOrderPayload,
  TpmRepository,
} from '../../domain/repositories/tpm.repository';

@Injectable({
  providedIn: 'root',
})
export class TpmApiRepository implements TpmRepository {
  getDashboard(_companyId: string, _filters: TpmFilters): Observable<TpmDashboard> {
    return throwError(() => new Error('TPM API no disponible en runtime frontend-only.'));
  }

  saveAsset(
    _companyId: string,
    _payload: SaveTpmAssetPayload,
    _assetId?: string,
  ): Observable<TpmMutationResult> {
    return throwError(() => new Error('TPM API no disponible en runtime frontend-only.'));
  }

  savePlan(
    _companyId: string,
    _payload: SaveTpmPlanPayload,
    _planId?: string,
  ): Observable<TpmMutationResult> {
    return throwError(() => new Error('TPM API no disponible en runtime frontend-only.'));
  }

  saveWorkOrder(
    _companyId: string,
    _payload: SaveTpmWorkOrderPayload,
    _workOrderId?: string,
  ): Observable<TpmMutationResult> {
    return throwError(() => new Error('TPM API no disponible en runtime frontend-only.'));
  }

  closeWorkOrder(
    _companyId: string,
    _workOrderId: string,
    _payload: CloseTpmWorkOrderPayload,
  ): Observable<TpmMutationResult> {
    return throwError(() => new Error('TPM API no disponible en runtime frontend-only.'));
  }
}
