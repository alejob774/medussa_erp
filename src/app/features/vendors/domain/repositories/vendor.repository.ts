import { Observable } from 'rxjs';
import { VendorFilters } from '../models/vendor-filters.model';
import { SaveVendorPayload } from '../models/vendor-form.model';
import {
  Vendor,
  VendorAssignableClient,
  VendorCatalogs,
  VendorStatus,
} from '../models/vendor.model';
import { VendorListResponse, VendorMutationResult } from '../models/vendor-response.model';

export interface VendorsRepository {
  getCatalogs(companyId: string): Observable<VendorCatalogs>;
  listVendors(companyId: string, filters: VendorFilters): Observable<VendorListResponse>;
  listAssignableClients(companyId: string, zone: string | null): Observable<VendorAssignableClient[]>;
  getVendor(companyId: string, vendorId: string): Observable<Vendor>;
  saveVendor(
    companyId: string,
    payload: SaveVendorPayload,
    vendorId?: string,
  ): Observable<VendorMutationResult>;
  deleteVendor(companyId: string, vendorId: string): Observable<VendorMutationResult>;
  updateVendorStatus(
    companyId: string,
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult>;
}