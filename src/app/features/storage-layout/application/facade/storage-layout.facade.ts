import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { StorageLayoutFilters } from '../../domain/models/storage-layout-filters.model';
import {
  SaveStorageAssignmentPayload,
  SaveStorageLocationPayload,
  SaveWarehousePayload,
  StorageLayoutRepository,
} from '../../domain/repositories/storage-layout.repository';
import {
  StorageLayoutDashboard,
  StorageLayoutMutationResult,
} from '../../domain/models/storage-layout-response.model';
import { StorageLayoutApiRepository } from '../../infrastructure/repositories/storage-layout-api.repository';
import { StorageLayoutMockRepository } from '../../infrastructure/repositories/storage-layout-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class StorageLayoutFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(StorageLayoutMockRepository);
  private readonly apiRepository = inject(StorageLayoutApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: StorageLayoutFilters): Observable<StorageLayoutDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveWarehouse(
    payload: SaveWarehousePayload,
    warehouseId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveWarehouse(companyId, payload, warehouseId));
  }

  saveLocation(
    payload: SaveStorageLocationPayload,
    locationId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveLocation(companyId, payload, locationId));
  }

  saveAssignment(
    payload: SaveStorageAssignmentPayload,
    assignmentId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveAssignment(companyId, payload, assignmentId));
  }

  recalculateOccupancy(usuario: string): Observable<StorageLayoutMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.recalculateOccupancy(companyId, usuario));
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

  private get repository(): StorageLayoutRepository {
    return environment.useStorageLayoutMock ? this.mockRepository : this.apiRepository;
  }
}
