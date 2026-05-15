import { Observable } from 'rxjs';
import {
  DeliveryCatalogs,
  DeliveryConfirmationPayload,
  DeliveryFilters,
  DeliveryOrder,
  DeliveryTrace,
} from '../models/delivery.model';

export abstract class DeliveryRepository {
  abstract getCatalogs(companyId: string): Observable<DeliveryCatalogs>;
  abstract listInRouteOrders(companyId: string, filters?: DeliveryFilters): Observable<DeliveryOrder[]>;
  abstract getOrder(companyId: string, orderId: string): Observable<DeliveryOrder>;
  abstract confirmDelivery(
    companyId: string,
    payload: DeliveryConfirmationPayload,
  ): Observable<DeliveryOrder>;
  abstract getTrace(companyId: string, orderId: string): Observable<DeliveryTrace[]>;
}
