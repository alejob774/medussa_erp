import { Observable } from 'rxjs';
import { SaveSupplierPayload } from '../models/supplier-form.model';
import { SupplierFilters } from '../models/supplier-filters.model';
import { Supplier, SupplierCatalogs, SupplierStatus } from '../models/supplier.model';
import { SupplierListResponse, SupplierMutationResult } from '../models/supplier-response.model';

export interface SuppliersRepository {
  getCatalogs(companyId: string): Observable<SupplierCatalogs>;
  listSuppliers(companyId: string, filters: SupplierFilters): Observable<SupplierListResponse>;
  getSupplier(companyId: string, supplierId: string): Observable<Supplier>;
  saveSupplier(
    companyId: string,
    payload: SaveSupplierPayload,
    supplierId?: string,
  ): Observable<SupplierMutationResult>;
  deleteSupplier(companyId: string, supplierId: string): Observable<SupplierMutationResult>;
  updateSupplierStatus(
    companyId: string,
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult>;
}
