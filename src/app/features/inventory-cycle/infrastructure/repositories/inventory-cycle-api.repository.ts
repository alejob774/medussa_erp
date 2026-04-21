import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ApproveInventoryAdjustmentPayload,
  InventoryCycleRepository,
  SaveInventoryCycleCountPayload,
} from '../../domain/repositories/inventory-cycle.repository';
import { InventoryCycleFilters } from '../../domain/models/inventory-cycle-filters.model';
import {
  InventoryCycleDashboard,
  InventoryCycleMutationResult,
} from '../../domain/models/inventory-cycle-response.model';

@Injectable({
  providedIn: 'root',
})
export class InventoryCycleApiRepository implements InventoryCycleRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scm/inventory-cycle`;

  getDashboard(
    companyId: string,
    filters: InventoryCycleFilters,
  ): Observable<InventoryCycleDashboard> {
    return this.http.get<InventoryCycleDashboard>(`${this.baseUrl}/${companyId}`, {
      params: {
        ...(filters.bodegaId ? { bodegaId: filters.bodegaId } : {}),
        ...(filters.ubicacionId ? { ubicacionId: filters.ubicacionId } : {}),
        ...(filters.sku ? { sku: filters.sku } : {}),
        ...(filters.loteId ? { loteId: filters.loteId } : {}),
        estado: filters.estado,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
        severidad: filters.severidad,
      },
    });
  }

  saveCount(
    companyId: string,
    payload: SaveInventoryCycleCountPayload,
    countId?: string,
  ): Observable<InventoryCycleMutationResult> {
    return countId
      ? this.http.put<InventoryCycleMutationResult>(`${this.baseUrl}/${companyId}/counts/${countId}`, payload)
      : this.http.post<InventoryCycleMutationResult>(`${this.baseUrl}/${companyId}/counts`, payload);
  }

  approveAdjustment(
    companyId: string,
    countId: string,
    payload: ApproveInventoryAdjustmentPayload,
  ): Observable<InventoryCycleMutationResult> {
    return this.http.post<InventoryCycleMutationResult>(`${this.baseUrl}/${companyId}/counts/${countId}/approve`, payload);
  }

  closeCount(
    companyId: string,
    countId: string,
    usuario: string,
    observacion: string | null,
  ): Observable<InventoryCycleMutationResult> {
    return this.http.post<InventoryCycleMutationResult>(`${this.baseUrl}/${companyId}/counts/${countId}/close`, {
      usuario,
      observacion,
    });
  }
}
