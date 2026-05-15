import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { extractArrayPayload, withApiFallback } from '../../../../core/http/master-api.utils';
import {
  DeliveryCatalogs,
  DeliveryConfirmationPayload,
  DeliveryFilters,
  DeliveryOrder,
  DeliveryTrace,
} from '../../domain/models/delivery.model';
import { DeliveryRepository } from '../../domain/repositories/delivery.repository';
import { DeliveryMockRepository } from './delivery-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DeliveryApiRepository extends DeliveryRepository {
  private readonly http = inject(HttpClient);
  private readonly mockRepository = inject(DeliveryMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/logistica/ordenes`;

  getCatalogs(companyId: string): Observable<DeliveryCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listInRouteOrders(companyId: string, filters: DeliveryFilters = {}): Observable<DeliveryOrder[]> {
    return withApiFallback(
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/en-ruta`, { params: this.buildParams(companyId, filters) })
          .pipe(map((response) => extractArrayPayload<DeliveryOrder>(response))),
      () => this.mockRepository.listInRouteOrders(companyId, filters),
      {
        fallbackEnabled: environment.enableDeliveriesFallback,
        context: 'ordenes en ruta',
        permissionMessage: 'No tienes permisos para consultar entregas.',
      },
    );
  }

  getOrder(companyId: string, orderId: string): Observable<DeliveryOrder> {
    return withApiFallback(
      () =>
        this.http.get<DeliveryOrder>(`${this.baseUrl}/${encodeURIComponent(orderId)}`, {
          params: this.buildParams(companyId),
        }),
      () => this.mockRepository.getOrder(companyId, orderId),
      {
        fallbackEnabled: environment.enableDeliveriesFallback,
        context: 'detalle de entrega',
        permissionMessage: 'No tienes permisos para consultar el detalle de entrega.',
      },
    );
  }

  confirmDelivery(
    companyId: string,
    payload: DeliveryConfirmationPayload,
  ): Observable<DeliveryOrder> {
    return withApiFallback(
      () =>
        this.http.post<DeliveryOrder>(`${this.baseUrl}/entregar`, {
          empresa_id: companyId,
          orderId: payload.orderId,
          pedido_id: payload.orderId,
          entregado_por_usuario_id: payload.deliveredByUserId,
          comentarios: payload.comments,
          firma_base64: payload.signatureBase64,
          foto_base64: payload.photoBase64,
          gps_latitude: payload.gpsLatitude,
          gps_longitude: payload.gpsLongitude,
          detalles: payload.details.map((detail) => ({
            producto_id: detail.productId,
            cantidad_entregada: detail.deliveredQuantity,
          })),
          movimiento_inventario_tipo: 'DESPACHO_CLIENTE',
        }),
      () => this.mockRepository.confirmDelivery(companyId, payload),
      {
        fallbackEnabled: environment.enableDeliveriesFallback,
        context: 'confirmacion de entrega',
        permissionMessage: 'No tienes permisos para confirmar entregas.',
      },
    );
  }

  getTrace(companyId: string, orderId: string): Observable<DeliveryTrace[]> {
    return withApiFallback(
      () =>
        this.http
          .get<unknown>(`${this.baseUrl}/${encodeURIComponent(orderId)}/trazabilidad`, {
            params: this.buildParams(companyId),
          })
          .pipe(map((response) => extractArrayPayload<DeliveryTrace>(response))),
      () => this.mockRepository.getTrace(companyId, orderId),
      {
        fallbackEnabled: environment.enableDeliveriesFallback,
        context: 'trazabilidad de entrega',
        permissionMessage: 'No tienes permisos para consultar trazabilidad de entregas.',
      },
    );
  }

  private buildParams(companyId: string, filters: DeliveryFilters = {}): HttpParams {
    let params = new HttpParams()
      .set('empresa_id', companyId)
      .set('companyId', companyId);

    if (filters.routeId) {
      params = params.set('ruta_id', filters.routeId);
    }

    if (filters.driverId) {
      params = params.set('conductor_id', filters.driverId);
    }

    if (filters.status && filters.status !== 'TODOS') {
      params = params.set('estado', filters.status);
    }

    if (filters.date) {
      params = params.set('fecha', filters.date);
    }

    return params;
  }
}
