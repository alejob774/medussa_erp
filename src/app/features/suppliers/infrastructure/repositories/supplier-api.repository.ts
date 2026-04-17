import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { SupplierFilters } from '../../domain/models/supplier-filters.model';
import { SaveSupplierPayload } from '../../domain/models/supplier-form.model';
import { Supplier, SupplierCatalogs, SupplierStatus } from '../../domain/models/supplier.model';
import { SupplierListResponse, SupplierMutationResult } from '../../domain/models/supplier-response.model';
import { SuppliersRepository } from '../../domain/repositories/supplier.repository';
import { SupplierMockRepository } from './supplier-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class SupplierApiRepository implements SuppliersRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(SupplierMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/proveedores`;

  getCatalogs(companyId: string): Observable<SupplierCatalogs> {
    void this.http;
    void this.authSessionService;
    void this.baseUrl;
    return this.mockRepository.getCatalogs(companyId);
  }

  listSuppliers(companyId: string, filters: SupplierFilters): Observable<SupplierListResponse> {
    return this.mockRepository.listSuppliers(companyId, filters);
  }

  getSupplier(companyId: string, supplierId: string): Observable<Supplier> {
    return this.mockRepository.getSupplier(companyId, supplierId);
  }

  saveSupplier(
    companyId: string,
    payload: SaveSupplierPayload,
    supplierId?: string,
  ): Observable<SupplierMutationResult> {
    return this.mockRepository.saveSupplier(companyId, payload, supplierId);
  }

  deleteSupplier(companyId: string, supplierId: string): Observable<SupplierMutationResult> {
    return this.mockRepository.deleteSupplier(companyId, supplierId);
  }

  updateSupplierStatus(
    companyId: string,
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult> {
    return this.mockRepository.updateSupplierStatus(companyId, supplierId, status);
  }
}
