import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { OeeFilters } from '../../domain/models/oee-filters.model';
import { OeeDashboard, OeeMutationResult } from '../../domain/models/oee-response.model';
import {
  OeeRepository,
  RegisterOeeDowntimePayload,
  SaveOeeRecordPayload,
} from '../../domain/repositories/oee.repository';

@Injectable({
  providedIn: 'root',
})
export class OeeApiRepository implements OeeRepository {
  getDashboard(_companyId: string, _filters: OeeFilters): Observable<OeeDashboard> {
    return throwError(() => new Error('OEE API no disponible en runtime frontend-only.'));
  }

  saveRecord(
    _companyId: string,
    _payload: SaveOeeRecordPayload,
    _recordId?: string,
  ): Observable<OeeMutationResult> {
    return throwError(() => new Error('OEE API no disponible en runtime frontend-only.'));
  }

  registerDowntime(
    _companyId: string,
    _recordId: string,
    _payload: RegisterOeeDowntimePayload,
  ): Observable<OeeMutationResult> {
    return throwError(() => new Error('OEE API no disponible en runtime frontend-only.'));
  }
}
