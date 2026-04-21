import { Observable } from 'rxjs';
import { InventoryCycleFilters } from '../models/inventory-cycle-filters.model';
import {
  InventoryCycleDashboard,
  InventoryCycleMutationResult,
} from '../models/inventory-cycle-response.model';

export interface SaveInventoryCycleCountPayload {
  bodegaId: string;
  ubicacionId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  loteId: string;
  lote: string;
  conteoFisico: number;
  usuarioConteo: string;
  observacion: string | null;
}

export interface ApproveInventoryAdjustmentPayload {
  motivo: string;
  aprobadoPor: string;
  observacion: string | null;
}

export abstract class InventoryCycleRepository {
  abstract getDashboard(
    companyId: string,
    filters: InventoryCycleFilters,
  ): Observable<InventoryCycleDashboard>;

  abstract saveCount(
    companyId: string,
    payload: SaveInventoryCycleCountPayload,
    countId?: string,
  ): Observable<InventoryCycleMutationResult>;

  abstract approveAdjustment(
    companyId: string,
    countId: string,
    payload: ApproveInventoryAdjustmentPayload,
  ): Observable<InventoryCycleMutationResult>;

  abstract closeCount(
    companyId: string,
    countId: string,
    usuario: string,
    observacion: string | null,
  ): Observable<InventoryCycleMutationResult>;
}
