import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
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

@Injectable({
  providedIn: 'root',
})
export class InventoryCoreApiRepository implements InventoryCoreRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory-core`;

  getStock(
    companyId: string,
    filters: InventoryStockFilters,
  ): Observable<InventoryBalance[]> {
    return this.http.get<InventoryBalance[]>(`${this.baseUrl}/${companyId}/stock`, {
      params: this.cleanParams(filters),
    });
  }

  getMovements(
    companyId: string,
    filters: InventoryMovementFilters,
  ): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(`${this.baseUrl}/${companyId}/movements`, {
      params: this.cleanParams(filters),
    });
  }

  adjustStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/adjustments`, payload);
  }

  issueStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/issues`, payload);
  }

  reserveStock(
    companyId: string,
    payload: InventoryReservationPayload,
  ): Observable<InventoryReservation> {
    return this.http.post<InventoryReservation>(`${this.baseUrl}/${companyId}/reservations`, payload);
  }

  releaseReservation(
    companyId: string,
    payload: InventoryReleaseReservationPayload,
  ): Observable<InventoryReservation> {
    return this.http.post<InventoryReservation>(
      `${this.baseUrl}/${companyId}/reservations/${payload.reservationId}/release`,
      payload,
    );
  }

  blockLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/lots/${payload.loteId}/block`, payload);
  }

  releaseLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/lots/${payload.loteId}/release`, payload);
  }

  rejectLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/lots/${payload.loteId}/reject`, payload);
  }

  qualityWaste(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/quality/waste`, payload);
  }

  transferStock(
    companyId: string,
    payload: InventoryTransferPayload,
  ): Observable<InventoryMovement[]> {
    return this.http.post<InventoryMovement[]>(`${this.baseUrl}/${companyId}/transfers`, payload);
  }

  consumeSparePart(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.baseUrl}/${companyId}/spare-parts/consume`, payload);
  }

  private cleanParams(filters: object): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {});
  }
}
