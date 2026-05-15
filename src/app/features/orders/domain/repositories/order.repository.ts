import { Observable } from 'rxjs';
import {
  CustomerCommercialStatus,
  Order,
  OrderCatalogs,
  OrderInventoryAvailability,
  OrderListFilters,
  OrderSyncResult,
  SaveOrderPayload,
} from '../models/order.model';

export abstract class OrderRepository {
  abstract getCatalogs(companyId: string): Observable<OrderCatalogs>;
  abstract listOrders(companyId: string, filters?: OrderListFilters): Observable<Order[]>;
  abstract getInventoryAvailability(companyId: string): Observable<OrderInventoryAvailability[]>;
  abstract getCustomerStatus(
    companyId: string,
    customerId: string,
  ): Observable<{ status: CustomerCommercialStatus; reason?: string | null }>;
  abstract saveOrder(companyId: string, payload: SaveOrderPayload): Observable<Order>;
  abstract sendOrder(companyId: string, localUuid: string): Observable<Order>;
  abstract sendPendingConsolidated(companyId: string): Observable<OrderSyncResult>;
}
