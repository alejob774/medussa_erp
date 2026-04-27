import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { InventoryBalance } from '../../domain/models/inventory-balance.model';
import { InventoryMovement } from '../../domain/models/inventory-movement.model';
import { InventoryReservation } from '../../domain/models/inventory-reservation.model';
import {
  InventoryCoreRepository,
  InventoryLotCommandPayload,
  InventoryMovementFilters,
  InventoryReleaseReservationPayload,
  InventoryReservationPayload,
  InventoryStockCommandPayload,
  InventoryStockFilters,
  InventoryTransferPayload,
} from '../../domain/repositories/inventory-core.repository';
import { InventoryCoreApiRepository } from '../../infrastructure/repositories/inventory-core-api.repository';
import { InventoryCoreMockRepository } from '../../infrastructure/repositories/inventory-core-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class InventoryCoreFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(InventoryCoreMockRepository);
  private readonly apiRepository = inject(InventoryCoreApiRepository);

  getStock(filters: InventoryStockFilters = {}): Observable<InventoryBalance[]> {
    return this.withActiveCompany((companyId) => this.repository.getStock(companyId, filters));
  }

  getMovements(filters: InventoryMovementFilters = {}): Observable<InventoryMovement[]> {
    return this.withActiveCompany((companyId) => this.repository.getMovements(companyId, filters));
  }

  adjustStock(payload: InventoryStockCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.adjustStock(companyId, payload));
  }

  issueStock(payload: InventoryStockCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.issueStock(companyId, payload));
  }

  reserveStock(payload: InventoryReservationPayload): Observable<InventoryReservation> {
    return this.withActiveCompany((companyId) => this.repository.reserveStock(companyId, payload));
  }

  releaseReservation(payload: InventoryReleaseReservationPayload): Observable<InventoryReservation> {
    return this.withActiveCompany((companyId) => this.repository.releaseReservation(companyId, payload));
  }

  blockLot(payload: InventoryLotCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.blockLot(companyId, payload));
  }

  releaseLot(payload: InventoryLotCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.releaseLot(companyId, payload));
  }

  rejectLot(payload: InventoryLotCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.rejectLot(companyId, payload));
  }

  transferStock(payload: InventoryTransferPayload): Observable<InventoryMovement[]> {
    return this.withActiveCompany((companyId) => this.repository.transferStock(companyId, payload));
  }

  consumeSparePart(payload: InventoryStockCommandPayload): Observable<InventoryMovement> {
    return this.withActiveCompany((companyId) => this.repository.consumeSparePart(companyId, payload));
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

  private get repository(): InventoryCoreRepository {
    return environment.useInventoryCoreMock ? this.mockRepository : this.apiRepository;
  }
}
