import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
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
import { VendorApiRepository } from '../../infrastructure/repositories/vendor-api.repository';
import { VendorMockRepository } from '../../infrastructure/repositories/vendor-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class VendorsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(VendorMockRepository);
  private readonly apiRepository = inject(VendorApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<VendorCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listVendors(filters: VendorFilters): Observable<VendorListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listVendors(companyId, filters));
  }

  listAssignableClients(zone: string | null): Observable<VendorAssignableClient[]> {
    return this.withActiveCompany((companyId) => this.repository.listAssignableClients(companyId, zone));
  }

  getVendor(vendorId: string): Observable<Vendor> {
    return this.withActiveCompany((companyId) => this.repository.getVendor(companyId, vendorId));
  }

  saveVendor(payload: SaveVendorPayload, vendorId?: string): Observable<VendorMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveVendor(companyId, payload, vendorId));
  }

  deleteVendor(vendorId: string): Observable<VendorMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteVendor(companyId, vendorId));
  }

  updateVendorStatus(
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.updateVendorStatus(companyId, vendorId, status));
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): VendorsRepository {
    return environment.useVendorsAdministrationMock ? this.mockRepository : this.apiRepository;
  }
}