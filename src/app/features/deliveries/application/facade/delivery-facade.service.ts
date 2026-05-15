import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import {
  DeliveryCatalogs,
  DeliveryConfirmationPayload,
  DeliveryFilters,
  DeliveryOrder,
  DeliveryTrace,
} from '../../domain/models/delivery.model';
import { DeliveryRepository } from '../../domain/repositories/delivery.repository';
import { DeliveryApiRepository } from '../../infrastructure/repositories/delivery-api.repository';
import { DeliveryMockRepository } from '../../infrastructure/repositories/delivery-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DeliveryFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(DeliveryMockRepository);
  private readonly apiRepository = inject(DeliveryApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<DeliveryCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listInRouteOrders(filters: DeliveryFilters = {}): Observable<DeliveryOrder[]> {
    return this.withActiveCompany((companyId) =>
      this.repository.listInRouteOrders(companyId, filters),
    );
  }

  getOrder(orderId: string): Observable<DeliveryOrder> {
    return this.withActiveCompany((companyId) => this.repository.getOrder(companyId, orderId));
  }

  confirmDelivery(payload: DeliveryConfirmationPayload): Observable<DeliveryOrder> {
    return this.withActiveCompany((companyId) =>
      this.repository.confirmDelivery(companyId, payload),
    );
  }

  getTrace(orderId: string): Observable<DeliveryTrace[]> {
    return this.withActiveCompany((companyId) => this.repository.getTrace(companyId, orderId));
  }

  getActiveUserId(): string {
    return 'mock-logistica';
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

  private get repository(): DeliveryRepository {
    return environment.useDeliveriesMock ? this.mockRepository : this.apiRepository;
  }
}
