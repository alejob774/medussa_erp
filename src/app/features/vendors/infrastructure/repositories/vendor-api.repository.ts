import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { VendorFilters } from '../../domain/models/vendor-filters.model';
import { SaveVendorPayload } from '../../domain/models/vendor-form.model';
import {
  Vendor,
  VendorAssignableClient,
  VendorCatalogs,
  VendorStatus,
} from '../../domain/models/vendor.model';
import { VendorListResponse, VendorMutationResult } from '../../domain/models/vendor-response.model';
import { VendorsRepository } from '../../domain/repositories/vendor.repository';
import { VendorMockRepository } from './vendor-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class VendorApiRepository implements VendorsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(VendorMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/vendedores`;

  getCatalogs(companyId: string): Observable<VendorCatalogs> {
    void this.http;
    void this.authSessionService;
    void this.baseUrl;
    return this.mockRepository.getCatalogs(companyId);
  }

  listVendors(companyId: string, filters: VendorFilters): Observable<VendorListResponse> {
    return this.mockRepository.listVendors(companyId, filters);
  }

  listAssignableClients(companyId: string, zone: string | null): Observable<VendorAssignableClient[]> {
    return this.mockRepository.listAssignableClients(companyId, zone);
  }

  getVendor(companyId: string, vendorId: string): Observable<Vendor> {
    return this.mockRepository.getVendor(companyId, vendorId);
  }

  saveVendor(
    companyId: string,
    payload: SaveVendorPayload,
    vendorId?: string,
  ): Observable<VendorMutationResult> {
    return this.mockRepository.saveVendor(companyId, payload, vendorId);
  }

  deleteVendor(companyId: string, vendorId: string): Observable<VendorMutationResult> {
    return this.mockRepository.deleteVendor(companyId, vendorId);
  }

  updateVendorStatus(
    companyId: string,
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult> {
    return this.mockRepository.updateVendorStatus(companyId, vendorId, status);
  }
}