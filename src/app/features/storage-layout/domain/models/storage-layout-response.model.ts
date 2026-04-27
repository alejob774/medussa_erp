import { DEFAULT_STORAGE_LAYOUT_FILTERS, StorageLayoutFilters } from './storage-layout-filters.model';
import { StorageLayoutKpis } from './storage-layout-kpi.model';
import { Warehouse, WarehouseStatus, WarehouseType } from './warehouse.model';
import {
  SanitaryRestriction,
  StorageLocation,
  StorageLocationStatus,
  StorageType,
} from './storage-location.model';
import {
  AbcCategory,
  StorageLocationAssignment,
  StorageRotationLevel,
} from './storage-location-assignment.model';
import { StorageLayoutOccupancy } from './storage-layout-occupancy.model';
import { StorageLayoutAlert, StorageLayoutAlertSeverity } from './storage-layout-alert.model';
import { AbcClassification } from './abc-classification.model';

export interface StorageLayoutCatalogOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export interface StorageLayoutCatalogs {
  warehouses: Array<{ value: string; label: string }>;
  zones: Array<{ value: string; label: string }>;
  storageTypes: Array<{ value: StorageType; label: string }>;
  sanitaryRestrictions: Array<{ value: SanitaryRestriction; label: string }>;
  occupancyStates: Array<{ value: StorageLayoutFilters['ocupacion']; label: string }>;
  skus: Array<{ value: string; label: string; skuId: string; sku: string; productName: string }>;
  abcCategories: Array<{ value: AbcCategory | 'TODAS'; label: string }>;
  warehouseTypes: Array<{ value: WarehouseType; label: string }>;
  warehouseStatuses: Array<{ value: WarehouseStatus; label: string }>;
  locationStatuses: Array<{ value: StorageLocationStatus; label: string }>;
  priorities: Array<{ value: StorageLocationAssignment['prioridad']; label: string }>;
}

export interface StorageLayoutZoneMapCell {
  locationId: string;
  code: string;
  occupancyPct: number;
  status: StorageLocationStatus;
  sku: string | null;
}

export interface StorageLayoutZoneSummary {
  warehouseId: string;
  warehouseName: string;
  zone: string;
  occupancyPct: number;
  saturated: boolean;
  idle: boolean;
  cells: StorageLayoutZoneMapCell[];
}

export interface StorageRelocationSuggestion {
  id: string;
  empresaId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  origenUbicacionId: string;
  origenCodigo: string;
  destinoUbicacionId: string;
  destinoCodigo: string;
  motivo: string;
  impacto: string;
}

export type StorageLotStatus = 'ACTIVO' | 'PROXIMO_VENCER' | 'VENCIDO';

export interface StorageLayoutLot {
  id: string;
  empresaId: string;
  bodegaId: string;
  ubicacionId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  lote: string;
  fechaIngreso: string;
  fechaVencimiento: string | null;
  stockSistema: number;
  estado: StorageLotStatus;
}

export interface StorageLayoutDashboard {
  filters: StorageLayoutFilters;
  catalogs: StorageLayoutCatalogs;
  warehouses: Warehouse[];
  locations: StorageLocation[];
  assignments: StorageLocationAssignment[];
  occupancies: StorageLayoutOccupancy[];
  alerts: StorageLayoutAlert[];
  abc: AbcClassification[];
  suggestions: StorageRelocationSuggestion[];
  lots: StorageLayoutLot[];
  map: StorageLayoutZoneSummary[];
  kpis: StorageLayoutKpis;
  selectedLocation: StorageLocation | null;
}

export type StorageLayoutMutationAction =
  | 'warehouse-created'
  | 'warehouse-updated'
  | 'location-created'
  | 'location-updated'
  | 'assignment-created'
  | 'assignment-updated'
  | 'occupancy-recalculated'
  | 'stock-transferred';

export interface StorageLayoutAuditDraft {
  module: 'layout-almacenamiento';
  action:
    | 'seed'
    | 'warehouse-create'
    | 'warehouse-edit'
    | 'location-create'
    | 'location-edit'
    | 'assignment-create'
    | 'assignment-edit'
    | 'recalculate'
    | 'stock-transfer';
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface StorageLayoutMutationResult {
  action: StorageLayoutMutationAction;
  warehouse: Warehouse | null;
  location: StorageLocation | null;
  assignment: StorageLocationAssignment | null;
  message: string;
  auditDraft: StorageLayoutAuditDraft;
}

export interface StorageLayoutStore {
  warehouses: Warehouse[];
  locations: StorageLocation[];
  assignments: StorageLocationAssignment[];
  occupancies: StorageLayoutOccupancy[];
  alerts: StorageLayoutAlert[];
  abc: AbcClassification[];
  suggestions: StorageRelocationSuggestion[];
  lots: StorageLayoutLot[];
  auditTrail: StorageLayoutAuditDraft[];
}

export const EMPTY_STORAGE_LAYOUT_DASHBOARD: StorageLayoutDashboard = {
  filters: { ...DEFAULT_STORAGE_LAYOUT_FILTERS },
  catalogs: {
    warehouses: [],
    zones: [],
    storageTypes: [],
    sanitaryRestrictions: [],
    occupancyStates: [],
    skus: [],
    abcCategories: [],
    warehouseTypes: [],
    warehouseStatuses: [],
    locationStatuses: [],
    priorities: [],
  },
  warehouses: [],
  locations: [],
  assignments: [],
  occupancies: [],
  alerts: [],
  abc: [],
  suggestions: [],
  lots: [],
  map: [],
  kpis: {
    activeWarehouses: 0,
    totalLocations: 0,
    averageOccupancyPct: 0,
    saturatedZones: 0,
    idleZones: 0,
    skuClassA: 0,
  },
  selectedLocation: null,
};
