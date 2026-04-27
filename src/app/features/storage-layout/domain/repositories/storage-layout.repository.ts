import { Observable } from 'rxjs';
import { StorageLayoutFilters } from '../models/storage-layout-filters.model';
import {
  StorageLayoutDashboard,
  StorageLayoutMutationResult,
} from '../models/storage-layout-response.model';
import { WarehouseStatus, WarehouseType } from '../models/warehouse.model';
import {
  SanitaryRestriction,
  StorageLocationStatus,
  StorageType,
} from '../models/storage-location.model';
import {
  AbcCategory,
  StorageLocationAssignment,
  StorageRotationLevel,
} from '../models/storage-location-assignment.model';

export interface SaveWarehousePayload {
  codigo: string;
  nombre: string;
  tipo: WarehouseType;
  estado: WarehouseStatus;
  usuario: string;
}

export interface SaveStorageLocationPayload {
  bodegaId: string;
  zona: string;
  pasillo: string;
  rack: string;
  nivel: string;
  posicion: string;
  capacidad: number;
  tipoAlmacenamiento: StorageType;
  restriccionSanitaria: SanitaryRestriction;
  estado: StorageLocationStatus;
  usuario: string;
}

export interface SaveStorageAssignmentPayload {
  ubicacionId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  prioridad: StorageLocationAssignment['prioridad'];
  categoriaABC: AbcCategory;
  rotacion: StorageRotationLevel;
  usuario: string;
}

export interface TransferStorageLayoutStockPayload {
  loteId: string;
  destinoBodegaId: string;
  destinoUbicacionId: string;
  cantidad: number;
  usuario: string;
  observacion?: string | null;
}

export abstract class StorageLayoutRepository {
  abstract getDashboard(
    companyId: string,
    filters: StorageLayoutFilters,
  ): Observable<StorageLayoutDashboard>;

  abstract saveWarehouse(
    companyId: string,
    payload: SaveWarehousePayload,
    warehouseId?: string,
  ): Observable<StorageLayoutMutationResult>;

  abstract saveLocation(
    companyId: string,
    payload: SaveStorageLocationPayload,
    locationId?: string,
  ): Observable<StorageLayoutMutationResult>;

  abstract saveAssignment(
    companyId: string,
    payload: SaveStorageAssignmentPayload,
    assignmentId?: string,
  ): Observable<StorageLayoutMutationResult>;

  abstract recalculateOccupancy(
    companyId: string,
    usuario: string,
  ): Observable<StorageLayoutMutationResult>;

  abstract transferStock(
    companyId: string,
    payload: TransferStorageLayoutStockPayload,
  ): Observable<StorageLayoutMutationResult>;
}
