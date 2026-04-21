import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { PackingType } from '../../domain/models/packing.model';
import { PickingFilters } from '../../domain/models/picking-filters.model';
import {
  ClosePickingPayload,
  ConfirmPickingLinePayload,
  PickingPackingRepository,
} from '../../domain/repositories/picking-packing.repository';
import {
  PickingPackingDashboard,
  PickingPackingMutationResult,
} from '../../domain/models/picking-packing-response.model';
import { PickingPackingApiRepository } from '../../infrastructure/repositories/picking-packing-api.repository';
import { PickingPackingMockRepository } from '../../infrastructure/repositories/picking-packing-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class PickingPackingFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(PickingPackingMockRepository);
  private readonly apiRepository = inject(PickingPackingApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: PickingFilters): Observable<PickingPackingDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  startPicking(taskId: string, operarioNombre: string): Observable<PickingPackingMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.startPicking(companyId, taskId, operarioNombre));
  }

  confirmLine(
    taskId: string,
    detailId: string,
    payload: ConfirmPickingLinePayload,
  ): Observable<PickingPackingMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.confirmLine(companyId, taskId, detailId, payload));
  }

  closePicking(taskId: string, payload: ClosePickingPayload): Observable<PickingPackingMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.closePicking(companyId, taskId, payload));
  }

  closePacking(
    taskId: string,
    payload: {
      tipoEmpaque: PackingType;
      pesoTotal: number;
      volumenTotal: number;
      usuarioCierre: string;
    },
  ): Observable<PickingPackingMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.closePacking(companyId, taskId, payload));
  }

  markReadyForDispatch(packingId: string, usuario: string): Observable<PickingPackingMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.markReadyForDispatch(companyId, packingId, usuario));
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

  private get repository(): PickingPackingRepository {
    return environment.usePickingPackingMock ? this.mockRepository : this.apiRepository;
  }
}
