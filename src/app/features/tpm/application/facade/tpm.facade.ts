import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { TpmFilters } from '../../domain/models/tpm-filters.model';
import { TpmDashboard, TpmMutationResult } from '../../domain/models/tpm-response.model';
import {
  CloseTpmWorkOrderPayload,
  SaveTpmAssetPayload,
  SaveTpmPlanPayload,
  SaveTpmWorkOrderPayload,
  TpmRepository,
} from '../../domain/repositories/tpm.repository';
import { TpmApiRepository } from '../../infrastructure/repositories/tpm-api.repository';
import { TpmMockRepository } from '../../infrastructure/repositories/tpm-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class TpmFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(TpmMockRepository);
  private readonly apiRepository = inject(TpmApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: TpmFilters): Observable<TpmDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveAsset(payload: SaveTpmAssetPayload, assetId?: string): Observable<TpmMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveAsset(companyId, payload, assetId));
  }

  savePlan(payload: SaveTpmPlanPayload, planId?: string): Observable<TpmMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.savePlan(companyId, payload, planId));
  }

  saveWorkOrder(payload: SaveTpmWorkOrderPayload, workOrderId?: string): Observable<TpmMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveWorkOrder(companyId, payload, workOrderId));
  }

  closeWorkOrder(workOrderId: string, payload: CloseTpmWorkOrderPayload): Observable<TpmMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.closeWorkOrder(companyId, workOrderId, payload));
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

  private get repository(): TpmRepository {
    return environment.useTpmMock ? this.mockRepository : this.apiRepository;
  }
}
