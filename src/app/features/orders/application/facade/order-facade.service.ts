import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import {
  Order,
  OrderCatalogs,
  OrderInventoryAvailability,
  OrderListFilters,
  OrderSyncResult,
  SaveOrderPayload,
} from '../../domain/models/order.model';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderApiRepository } from '../../infrastructure/repositories/order-api.repository';
import { OrderMockRepository } from '../../infrastructure/repositories/order-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class OrderFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(OrderMockRepository);
  private readonly apiRepository = inject(OrderApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<OrderCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listOrders(filters: OrderListFilters = {}): Observable<Order[]> {
    return this.withActiveCompany((companyId) => this.repository.listOrders(companyId, filters));
  }

  syncInventory(): Observable<OrderInventoryAvailability[]> {
    return this.withActiveCompany((companyId) =>
      this.repository.getInventoryAvailability(companyId),
    );
  }

  getCustomerStatus(customerId: string) {
    return this.withActiveCompany((companyId) =>
      this.repository.getCustomerStatus(companyId, customerId),
    );
  }

  saveOrder(payload: SaveOrderPayload): Observable<Order> {
    return this.withActiveCompany((companyId) => this.repository.saveOrder(companyId, payload));
  }

  sendOrder(localUuid: string): Observable<Order> {
    return this.withActiveCompany((companyId) => this.repository.sendOrder(companyId, localUuid));
  }

  sendPendingConsolidated(): Observable<OrderSyncResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.sendPendingConsolidated(companyId),
    );
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

  private get repository(): OrderRepository {
    return environment.useOrdersMock ? this.mockRepository : this.apiRepository;
  }
}
