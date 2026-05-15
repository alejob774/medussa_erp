import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  DeliveryCatalogs,
  DeliveryConfirmationPayload,
  DeliveryFilters,
  DeliveryOrder,
  DELIVERY_STORAGE_KEY,
  DeliveryTrace,
} from '../../domain/models/delivery.model';
import { DeliveryRepository } from '../../domain/repositories/delivery.repository';
import {
  DELIVERY_CATALOGS,
  DeliveryMockStore,
  INITIAL_DELIVERY_STORE,
} from '../data/deliveries.mock';

@Injectable({
  providedIn: 'root',
})
export class DeliveryMockRepository extends DeliveryRepository {
  getCatalogs(companyId: string): Observable<DeliveryCatalogs> {
    return of(structuredClone(DELIVERY_CATALOGS)).pipe(delay(100));
  }

  listInRouteOrders(companyId: string, filters: DeliveryFilters = {}): Observable<DeliveryOrder[]> {
    const deliveries = this.readStore().deliveries
      .filter((delivery) => delivery.companyId === companyId)
      .filter((delivery) => !filters.routeId || delivery.routeId === filters.routeId)
      .filter((delivery) => !filters.driverId || delivery.driverId === filters.driverId)
      .filter((delivery) => !filters.status || filters.status === 'TODOS' || delivery.orderStatus === filters.status)
      .filter((delivery) => !filters.date || delivery.deliveryDate === filters.date)
      .sort((left, right) => left.customerName.localeCompare(right.customerName, 'es-CO'))
      .map((delivery) => this.cloneDelivery(delivery));

    return of(deliveries).pipe(delay(180));
  }

  getOrder(companyId: string, orderId: string): Observable<DeliveryOrder> {
    const delivery = this.readStore().deliveries.find(
      (item) => item.companyId === companyId && item.orderId === orderId,
    );

    if (!delivery) {
      return throwError(() => new Error('No se encontro la orden de entrega.'));
    }

    return of(this.cloneDelivery(delivery)).pipe(delay(140));
  }

  confirmDelivery(
    companyId: string,
    payload: DeliveryConfirmationPayload,
  ): Observable<DeliveryOrder> {
    const validationError = this.validatePayload(payload);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const store = this.readStore();
    const current = store.deliveries.find(
      (delivery) => delivery.companyId === companyId && delivery.orderId === payload.orderId,
    );

    if (!current) {
      return throwError(() => new Error('No se encontro la orden de entrega.'));
    }

    if (!['EN_RUTA', 'LISTA_PARA_DESPACHO'].includes(current.orderStatus)) {
      return throwError(() => new Error('La orden ya esta cerrada o no esta disponible para entrega.'));
    }

    const deliveredByProduct = new Map(
      payload.details.map((detail) => [detail.productId, detail.deliveredQuantity]),
    );
    const invalidDetail = current.details.find((detail) => {
      const deliveredQuantity = deliveredByProduct.get(detail.productId) ?? 0;
      return deliveredQuantity > detail.pendingQuantity;
    });

    if (invalidDetail) {
      return throwError(
        () => new Error(`La cantidad entregada de ${invalidDetail.productName} supera el pendiente.`),
      );
    }

    const nextDetails = current.details.map((detail) => {
      const deliveredQuantity = deliveredByProduct.get(detail.productId) ?? 0;
      return {
        ...detail,
        deliveredQuantity,
      };
    });
    const allDelivered = nextDetails.every(
      (detail) => detail.deliveredQuantity === detail.pendingQuantity,
    );
    const hasAnyDelivered = nextDetails.some((detail) => detail.deliveredQuantity > 0);

    if (!hasAnyDelivered) {
      return throwError(() => new Error('Registra al menos una cantidad entregada.'));
    }

    const nextStatus = allDelivered ? 'ENTREGADA' : 'PARCIALMENTE_SURTIDA';
    const now = new Date().toISOString();
    const nextDelivery: DeliveryOrder = {
      ...current,
      orderStatus: nextStatus,
      deliveredAt: now,
      comments: payload.comments ?? null,
      signatureBase64: payload.signatureBase64,
      photoBase64: payload.photoBase64 ?? null,
      gpsLatitude: payload.gpsLatitude ?? current.gpsLatitude ?? null,
      gpsLongitude: payload.gpsLongitude ?? current.gpsLongitude ?? null,
      deliveredByUserId: payload.deliveredByUserId,
      details: nextDetails,
      trace: [
        {
          status: nextStatus,
          description: allDelivered
            ? 'Entrega total registrada. El despacho real debe consumirse por API Central de Inventarios.'
            : 'Entrega parcial registrada. Pendientes quedan trazados para gestion posterior.',
          occurredAt: now,
          user: payload.deliveredByUserId,
        },
        ...current.trace,
      ],
    };

    this.writeStore({
      ...store,
      deliveries: store.deliveries.map((delivery) =>
        delivery.orderId === payload.orderId ? nextDelivery : delivery,
      ),
    });

    return of(this.cloneDelivery(nextDelivery)).pipe(delay(320));
  }

  getTrace(companyId: string, orderId: string): Observable<DeliveryTrace[]> {
    const delivery = this.readStore().deliveries.find(
      (item) => item.companyId === companyId && item.orderId === orderId,
    );

    if (!delivery) {
      return throwError(() => new Error('No se encontro trazabilidad de la orden.'));
    }

    return of(delivery.trace.map((trace) => ({ ...trace }))).pipe(delay(120));
  }

  private validatePayload(payload: DeliveryConfirmationPayload): string | null {
    if (!payload.signatureBase64) {
      return 'La firma es obligatoria para cerrar la entrega.';
    }

    if (payload.details.some((detail) => detail.deliveredQuantity < 0)) {
      return 'Las cantidades entregadas no pueden ser negativas.';
    }

    return null;
  }

  private readStore(): DeliveryMockStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_DELIVERY_STORE);
    }

    const raw = localStorage.getItem(DELIVERY_STORAGE_KEY);

    if (!raw) {
      const initialStore = structuredClone(INITIAL_DELIVERY_STORE);
      this.writeStore(initialStore);
      return initialStore;
    }

    try {
      return normalizeStore(JSON.parse(raw) as DeliveryMockStore);
    } catch {
      const initialStore = structuredClone(INITIAL_DELIVERY_STORE);
      this.writeStore(initialStore);
      return initialStore;
    }
  }

  private writeStore(store: DeliveryMockStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(normalizeStore(store)));
  }

  private cloneDelivery(delivery: DeliveryOrder): DeliveryOrder {
    return {
      ...delivery,
      details: delivery.details.map((detail) => ({ ...detail })),
      trace: delivery.trace.map((trace) => ({ ...trace })),
    };
  }
}

function normalizeStore(store: DeliveryMockStore): DeliveryMockStore {
  return {
    deliveries: (store.deliveries ?? []).map((delivery) => ({
      ...delivery,
      details: delivery.details ?? [],
      trace: delivery.trace ?? [],
    })),
  };
}
