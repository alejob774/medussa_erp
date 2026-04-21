import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { MpsDashboard, MpsMutationResult } from '../../domain/models/mps-response.model';
import { MpsPlanFilters } from '../../domain/models/mps-plan-filters.model';
import {
  ApproveMpsPlanPayload,
  GenerateMpsPlanPayload,
  MpsRepository,
  SimulateMpsPlanPayload,
  UpdateMpsDetailPayload,
} from '../../domain/repositories/mps.repository';

@Injectable({
  providedIn: 'root',
})
export class MpsApiRepository implements MpsRepository {
  getDashboard(_companyId: string, _filters: MpsPlanFilters): Observable<MpsDashboard> {
    return throwError(() => new Error('MpsApiRepository no esta disponible en runtime mock.'));
  }

  generatePlan(_companyId: string, _payload: GenerateMpsPlanPayload): Observable<MpsMutationResult> {
    return throwError(() => new Error('MpsApiRepository no esta disponible en runtime mock.'));
  }

  updateDetail(
    _companyId: string,
    _planId: string,
    _detailId: string,
    _payload: UpdateMpsDetailPayload,
  ): Observable<MpsMutationResult> {
    return throwError(() => new Error('MpsApiRepository no esta disponible en runtime mock.'));
  }

  simulatePlan(
    _companyId: string,
    _planId: string,
    _payload: SimulateMpsPlanPayload,
  ): Observable<MpsMutationResult> {
    return throwError(() => new Error('MpsApiRepository no esta disponible en runtime mock.'));
  }

  approvePlan(
    _companyId: string,
    _planId: string,
    _payload: ApproveMpsPlanPayload,
  ): Observable<MpsMutationResult> {
    return throwError(() => new Error('MpsApiRepository no esta disponible en runtime mock.'));
  }
}
