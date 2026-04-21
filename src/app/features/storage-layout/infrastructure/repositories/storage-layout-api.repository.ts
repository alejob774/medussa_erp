import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  SaveStorageAssignmentPayload,
  SaveStorageLocationPayload,
  SaveWarehousePayload,
  StorageLayoutRepository,
} from '../../domain/repositories/storage-layout.repository';
import { StorageLayoutFilters } from '../../domain/models/storage-layout-filters.model';
import {
  StorageLayoutDashboard,
  StorageLayoutMutationResult,
} from '../../domain/models/storage-layout-response.model';

@Injectable({
  providedIn: 'root',
})
export class StorageLayoutApiRepository implements StorageLayoutRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scm/storage-layout`;

  getDashboard(
    companyId: string,
    filters: StorageLayoutFilters,
  ): Observable<StorageLayoutDashboard> {
    return this.http.get<StorageLayoutDashboard>(`${this.baseUrl}/${companyId}`, {
      params: {
        ...(filters.bodegaId ? { bodegaId: filters.bodegaId } : {}),
        ...(filters.zona ? { zona: filters.zona } : {}),
        ...(filters.tipoAlmacenamiento ? { tipoAlmacenamiento: filters.tipoAlmacenamiento } : {}),
        ...(filters.restriccionSanitaria ? { restriccionSanitaria: filters.restriccionSanitaria } : {}),
        ...(filters.sku ? { sku: filters.sku } : {}),
        ocupacion: filters.ocupacion,
        categoriaABC: filters.categoriaABC,
      },
    });
  }

  saveWarehouse(
    companyId: string,
    payload: SaveWarehousePayload,
    warehouseId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return warehouseId
      ? this.http.put<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/warehouses/${warehouseId}`, payload)
      : this.http.post<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/warehouses`, payload);
  }

  saveLocation(
    companyId: string,
    payload: SaveStorageLocationPayload,
    locationId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return locationId
      ? this.http.put<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/locations/${locationId}`, payload)
      : this.http.post<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/locations`, payload);
  }

  saveAssignment(
    companyId: string,
    payload: SaveStorageAssignmentPayload,
    assignmentId?: string,
  ): Observable<StorageLayoutMutationResult> {
    return assignmentId
      ? this.http.put<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/assignments/${assignmentId}`, payload)
      : this.http.post<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/assignments`, payload);
  }

  recalculateOccupancy(
    companyId: string,
    usuario: string,
  ): Observable<StorageLayoutMutationResult> {
    return this.http.post<StorageLayoutMutationResult>(`${this.baseUrl}/${companyId}/recalculate`, {
      usuario,
    });
  }
}
