import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { InventoryCycleFilters } from '../../domain/models/inventory-cycle-filters.model';
import {
  ApproveInventoryAdjustmentPayload,
  InventoryCycleRepository,
  SaveInventoryCycleCountPayload,
} from '../../domain/repositories/inventory-cycle.repository';
import {
  InventoryCycleDashboard,
  InventoryCycleMutationResult,
} from '../../domain/models/inventory-cycle-response.model';
import { InventoryCycleApiRepository } from '../../infrastructure/repositories/inventory-cycle-api.repository';
import { InventoryCycleMockRepository } from '../../infrastructure/repositories/inventory-cycle-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class InventoryCycleFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(InventoryCycleMockRepository);
  private readonly apiRepository = inject(InventoryCycleApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: InventoryCycleFilters): Observable<InventoryCycleDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveCount(
    payload: SaveInventoryCycleCountPayload,
    countId?: string,
  ): Observable<InventoryCycleMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveCount(companyId, payload, countId));
  }

  approveAdjustment(
    countId: string,
    payload: ApproveInventoryAdjustmentPayload,
  ): Observable<InventoryCycleMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.approveAdjustment(companyId, countId, payload));
  }

  closeCount(
    countId: string,
    usuario: string,
    observacion: string | null,
  ): Observable<InventoryCycleMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.closeCount(companyId, countId, usuario, observacion));
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

  private get repository(): InventoryCycleRepository {
    return environment.useInventoryCycleMock ? this.mockRepository : this.apiRepository;
  }
}
