import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { MpsDashboard, MpsMutationResult } from '../../domain/models/mps-response.model';
import { MpsPlanFilters } from '../../domain/models/mps-plan-filters.model';
import {
  ApproveMpsPlanPayload,
  GenerateMpsPlanPayload,
  MpsRepository,
  SimulateMpsPlanPayload,
  UpdateMpsDetailPayload,
} from '../../domain/repositories/mps.repository';
import { MpsApiRepository } from '../../infrastructure/repositories/mps-api.repository';
import { MpsMockRepository } from '../../infrastructure/repositories/mps-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class MpsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(MpsMockRepository);
  private readonly apiRepository = inject(MpsApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: MpsPlanFilters): Observable<MpsDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  generatePlan(payload: GenerateMpsPlanPayload): Observable<MpsMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.generatePlan(companyId, payload));
  }

  updateDetail(
    planId: string,
    detailId: string,
    payload: UpdateMpsDetailPayload,
  ): Observable<MpsMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateDetail(companyId, planId, detailId, payload),
    );
  }

  simulatePlan(planId: string, payload: SimulateMpsPlanPayload): Observable<MpsMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.simulatePlan(companyId, planId, payload));
  }

  approvePlan(planId: string, payload: ApproveMpsPlanPayload): Observable<MpsMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.approvePlan(companyId, planId, payload));
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.companyContextService.getActiveCompany()?.id ?? null;

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): MpsRepository {
    return environment.useMpsMock ? this.mockRepository : this.apiRepository;
  }
}
