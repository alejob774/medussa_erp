import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { QualityControlDashboard, QualityControlMutationResult } from '../../domain/models/quality-control-response.model';
import { QualityInspectionFilters } from '../../domain/models/quality-inspection-filters.model';
import {
  CloseQualityNonConformityPayload,
  QualityControlRepository,
  QualityLotDecisionPayload,
  SaveQualityInspectionPayload,
  SaveQualityNonConformityPayload,
} from '../../domain/repositories/quality-control.repository';

@Injectable({
  providedIn: 'root',
})
export class QualityControlApiRepository implements QualityControlRepository {
  getDashboard(_companyId: string, _filters: QualityInspectionFilters): Observable<QualityControlDashboard> {
    return throwError(() => new Error('QualityControlApiRepository no esta disponible en runtime mock.'));
  }

  saveInspection(
    _companyId: string,
    _payload: SaveQualityInspectionPayload,
    _inspectionId?: string,
  ): Observable<QualityControlMutationResult> {
    return throwError(() => new Error('QualityControlApiRepository no esta disponible en runtime mock.'));
  }

  takeLotDecision(
    _companyId: string,
    _inspectionId: string,
    _payload: QualityLotDecisionPayload,
  ): Observable<QualityControlMutationResult> {
    return throwError(() => new Error('QualityControlApiRepository no esta disponible en runtime mock.'));
  }

  saveNonConformity(
    _companyId: string,
    _inspectionId: string,
    _payload: SaveQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    return throwError(() => new Error('QualityControlApiRepository no esta disponible en runtime mock.'));
  }

  closeNonConformity(
    _companyId: string,
    _nonConformityId: string,
    _payload: CloseQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    return throwError(() => new Error('QualityControlApiRepository no esta disponible en runtime mock.'));
  }
}
