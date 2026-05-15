import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { extractArrayPayload, withApiFallback } from '../../../../core/http/master-api.utils';
import {
  CustomerCommercialStatus,
  Order,
  OrderCatalogs,
  OrderInventoryAvailability,
  OrderListFilters,
  OrderSyncResult,
  SaveOrderPayload,
} from '../../domain/models/order.model';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderMockRepository } from './order-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class OrderApiRepository extends OrderRepository {
  private readonly http = inject(HttpClient);
  private readonly mockRepository = inject(OrderMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/pedidos`;
  private readonly inventoryAvailabilityUrl = `${environment.apiUrl}/inventarios/disponibilidad`;
  private readonly inventoryReservationsUrl = `${environment.apiUrl}/inventarios/reservas`;
  private readonly customerStatusUrl = `${environment.apiUrl}/clientes/estado`;

  getCatalogs(companyId: string): Observable<OrderCatalogs> {
    return withApiFallback(
      () => this.mockRepository.getCatalogs(companyId),
      () => this.mockRepository.getCatalogs(companyId),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'catalogos de toma de pedidos',
        permissionMessage: 'No tienes permisos para consultar catalogos de pedidos.',
      },
    );
  }

  listOrders(companyId: string, filters: OrderListFilters = {}): Observable<Order[]> {
    const params = this.buildCompanyParams(companyId)
      .set('estado', filters.status && filters.status !== 'TODOS' ? filters.status : '')
      .set('cliente_id', filters.customerId ?? '');

    return withApiFallback(
      () =>
        this.http
          .get<unknown>(this.baseUrl, { params })
          .pipe(map((response) => extractArrayPayload<Order>(response))),
      () => this.mockRepository.listOrders(companyId, filters),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'ordenes de pedido',
        permissionMessage: 'No tienes permisos para consultar pedidos.',
      },
    );
  }

  getInventoryAvailability(companyId: string): Observable<OrderInventoryAvailability[]> {
    return withApiFallback(
      () =>
        this.http
          .get<unknown>(this.inventoryAvailabilityUrl, {
            params: this.buildCompanyParams(companyId),
          })
          .pipe(map((response) => extractArrayPayload<OrderInventoryAvailability>(response))),
      () => this.mockRepository.getInventoryAvailability(companyId),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'disponibilidad de inventarios',
        permissionMessage: 'No tienes permisos para consultar disponibilidad de inventarios.',
      },
    );
  }

  getCustomerStatus(
    companyId: string,
    customerId: string,
  ): Observable<{ status: CustomerCommercialStatus; reason?: string | null }> {
    const params = this.buildCompanyParams(companyId).set('cliente_id', customerId);

    return withApiFallback(
      () =>
        this.http.get<{ status: CustomerCommercialStatus; reason?: string | null }>(
          this.customerStatusUrl,
          { params },
        ),
      () => this.mockRepository.getCustomerStatus(companyId, customerId),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'estado comercial de cliente',
        permissionMessage: 'No tienes permisos para consultar estado comercial de clientes.',
      },
    );
  }

  saveOrder(companyId: string, payload: SaveOrderPayload): Observable<Order> {
    return withApiFallback(
      () =>
        this.http
          .post<Order>(this.baseUrl, this.toBackendPayload(companyId, payload)),
      () => this.mockRepository.saveOrder(companyId, payload),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'creacion de pedidos',
        permissionMessage: 'No tienes permisos para crear pedidos.',
      },
    );
  }

  sendOrder(companyId: string, localUuid: string): Observable<Order> {
    return withApiFallback(
      () =>
        this.http.post<Order>(this.inventoryReservationsUrl, {
          empresa_id: companyId,
          localUuid,
          tipo: 'RESERVA_PEDIDO',
        }),
      () => this.mockRepository.sendOrder(companyId, localUuid),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'envio y reserva de pedido',
        permissionMessage: 'No tienes permisos para enviar pedidos.',
      },
    );
  }

  sendPendingConsolidated(companyId: string): Observable<OrderSyncResult> {
    return withApiFallback(
      () =>
        this.http.post<OrderSyncResult>(`${this.baseUrl}/consolidado`, {
          empresa_id: companyId,
        }),
      () => this.mockRepository.sendPendingConsolidated(companyId),
      {
        fallbackEnabled: environment.enableOrdersFallback,
        context: 'envio consolidado de pedidos',
        permissionMessage: 'No tienes permisos para enviar pedidos consolidados.',
      },
    );
  }

  private buildCompanyParams(companyId: string): HttpParams {
    return new HttpParams()
      .set('empresa_id', companyId)
      .set('companyId', companyId);
  }

  private toBackendPayload(companyId: string, payload: SaveOrderPayload): Record<string, unknown> {
    return {
      empresa_id: companyId,
      cliente_id: payload.customerId,
      vendedor_id: payload.sellerId,
      fecha_pedido: payload.orderDate,
      fecha_entrega_solicitada: payload.requestedDeliveryDate,
      tipo_pedido: payload.orderType,
      canal_venta: payload.salesChannel,
      prioridad: payload.priority,
      condicion_pago: payload.paymentCondition,
      reservar_inventario: payload.reserveInventory,
      localUuid: crypto.randomUUID(),
      detalles: payload.details.map((detail) => ({
        producto_id: detail.productId,
        sku: detail.sku,
        nombre_producto: detail.productName,
        presentacion: detail.presentation,
        unidad: detail.unit,
        cantidad: detail.quantity,
        stock_disponible: detail.availableStock,
        precio_unitario: detail.unitPrice,
        total_linea: detail.lineTotal,
        estado_stock: detail.stockStatus,
        prometido_posterior: detail.promisedLater,
      })),
    };
  }
}
