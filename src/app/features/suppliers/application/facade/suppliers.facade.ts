import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { SupplierFilters } from '../../domain/models/supplier-filters.model';
import { SaveSupplierPayload } from '../../domain/models/supplier-form.model';
import { Supplier, SupplierCatalogs, SupplierStatus } from '../../domain/models/supplier.model';
import { SupplierListResponse, SupplierMutationResult } from '../../domain/models/supplier-response.model';
import { SuppliersRepository } from '../../domain/repositories/supplier.repository';
import { SupplierApiRepository } from '../../infrastructure/repositories/supplier-api.repository';
import { SupplierMockRepository } from '../../infrastructure/repositories/supplier-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class SuppliersFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(SupplierMockRepository);
  private readonly apiRepository = inject(SupplierApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<SupplierCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listSuppliers(filters: SupplierFilters): Observable<SupplierListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listSuppliers(companyId, filters));
  }

  getSupplier(supplierId: string): Observable<Supplier> {
    return this.withActiveCompany((companyId) => this.repository.getSupplier(companyId, supplierId));
  }

  saveSupplier(payload: SaveSupplierPayload, supplierId?: string): Observable<SupplierMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveSupplier(companyId, payload, supplierId),
    );
  }

  deleteSupplier(supplierId: string): Observable<SupplierMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteSupplier(companyId, supplierId));
  }

  updateSupplierStatus(
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateSupplierStatus(companyId, supplierId, status),
    );
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

  private get repository(): SuppliersRepository {
    return environment.useSuppliersAdministrationMock ? this.mockRepository : this.apiRepository;
  }
}
