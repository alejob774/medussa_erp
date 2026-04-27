import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Product } from '../../../products/domain/models/product.model';
import { PurchaseAnalysisStore } from '../../../purchase-analysis/domain/models/purchase-analysis-response.model';
import { PurchaseAnalysisAggregate } from '../../../purchase-analysis/domain/models/purchase-analysis.model';
import { AbcClassification } from '../../domain/models/abc-classification.model';
import {
  AbcCategory,
  StorageLocationAssignment,
  StorageRotationLevel,
} from '../../domain/models/storage-location-assignment.model';
import {
  StorageLayoutAlert,
  StorageLayoutAlertSeverity,
} from '../../domain/models/storage-layout-alert.model';
import { StorageLayoutFilters } from '../../domain/models/storage-layout-filters.model';
import { StorageLayoutKpis } from '../../domain/models/storage-layout-kpi.model';
import { StorageLayoutOccupancy } from '../../domain/models/storage-layout-occupancy.model';
import {
  StorageLayoutAuditDraft,
  StorageLayoutCatalogs,
  StorageLayoutDashboard,
  StorageLayoutLot,
  StorageLayoutMutationResult,
  StorageLayoutStore,
  StorageLayoutZoneSummary,
  StorageRelocationSuggestion,
} from '../../domain/models/storage-layout-response.model';
import {
  SanitaryRestriction,
  StorageLocation,
  StorageLocationStatus,
  StorageType,
} from '../../domain/models/storage-location.model';
import { Warehouse } from '../../domain/models/warehouse.model';
import {
  projectStorageLayoutLotWithInventoryCore,
  registerInventoryMovementFromStorageLayout,
  resolveInventoryProjectedStockForLayoutLot,
  StorageLayoutStockMovementContext,
} from '../../../inventory-core/infrastructure/repositories/inventory-core-store.utils';

export const STORAGE_LAYOUT_STORAGE_KEY = 'medussa.erp.mock.storage-layout';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const PURCHASE_ANALYSIS_STORAGE_KEY = 'medussa.erp.mock.purchase-analysis';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

interface SeedLocationInput {
  warehouseId: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  capacity: number;
  storageType: StorageType;
  restriction: SanitaryRestriction;
  status?: StorageLocationStatus;
}

interface SeedLotInput {
  locationCode: string;
  skuId: string;
  quantity: number;
  lot: string;
  ingreso: string;
  vencimiento: string | null;
}

function cloneStore(store: StorageLayoutStore): StorageLayoutStore {
  return {
    warehouses: store.warehouses.map((item) => ({ ...item })),
    locations: store.locations.map((item) => ({ ...item })),
    assignments: store.assignments.map((item) => ({ ...item })),
    occupancies: store.occupancies.map((item) => ({ ...item })),
    alerts: store.alerts.map((item) => ({ ...item })),
    abc: store.abc.map((item) => ({ ...item })),
    suggestions: store.suggestions.map((item) => ({ ...item })),
    lots: store.lots.map((item) => ({ ...item })),
    auditTrail: store.auditTrail.map((item) => ({ ...item })),
  };
}

export function readStorageLayoutStore(): StorageLayoutStore {
  if (typeof window === 'undefined') {
    return {
      warehouses: [],
      locations: [],
      assignments: [],
      occupancies: [],
      alerts: [],
      abc: [],
      suggestions: [],
      lots: [],
      auditTrail: [],
    };
  }

  const raw = localStorage.getItem(STORAGE_LAYOUT_STORAGE_KEY);

  if (!raw) {
    const emptyStore = {
      warehouses: [],
      locations: [],
      assignments: [],
      occupancies: [],
      alerts: [],
      abc: [],
      suggestions: [],
      lots: [],
      auditTrail: [],
    } satisfies StorageLayoutStore;
    writeStorageLayoutStore(emptyStore);
    return emptyStore;
  }

  try {
    const parsed = JSON.parse(raw) as StorageLayoutStore;
    return {
      warehouses: parsed.warehouses ?? [],
      locations: parsed.locations ?? [],
      assignments: parsed.assignments ?? [],
      occupancies: parsed.occupancies ?? [],
      alerts: parsed.alerts ?? [],
      abc: parsed.abc ?? [],
      suggestions: parsed.suggestions ?? [],
      lots: parsed.lots ?? [],
      auditTrail: parsed.auditTrail ?? [],
    };
  } catch {
    const emptyStore = {
      warehouses: [],
      locations: [],
      assignments: [],
      occupancies: [],
      alerts: [],
      abc: [],
      suggestions: [],
      lots: [],
      auditTrail: [],
    } satisfies StorageLayoutStore;
    writeStorageLayoutStore(emptyStore);
    return emptyStore;
  }
}

export function writeStorageLayoutStore(store: StorageLayoutStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_LAYOUT_STORAGE_KEY, JSON.stringify(store));
}

export function ensureStorageLayoutBaseline(companyId: string): StorageLayoutStore {
  const currentStore = readStorageLayoutStore();
  const hasCompanyData = currentStore.warehouses.some((item) => item.empresaId === companyId);

  if (hasCompanyData) {
    const recalculated = recalculateStorageLayoutCompany(currentStore, companyId);
    writeStorageLayoutStore(recalculated);
    return recalculated;
  }

  const seededStore = seedCompanyLayout(currentStore, companyId);
  const recalculated = recalculateStorageLayoutCompany(seededStore, companyId);
  writeStorageLayoutStore(recalculated);
  return recalculated;
}

export function recalculateStorageLayoutCompany(
  store: StorageLayoutStore,
  companyId: string,
): StorageLayoutStore {
  const nextStore = cloneStore(store);
  const companyLocations = nextStore.locations.filter((item) => item.empresaId === companyId);
  const companyAssignments = nextStore.assignments.filter((item) => item.empresaId === companyId);
  const companyLots = nextStore.lots
    .filter((item) => item.empresaId === companyId)
    .map((item) => projectStorageLayoutLotWithInventoryCore(item));
  const products = readCompanyProducts(companyId);

  const occupancies = companyLocations.map((location) =>
    buildOccupancy(location, companyLots.filter((lot) => lot.ubicacionId === location.id), products),
  );
  const occupanciesByLocation = new Map(occupancies.map((item) => [item.ubicacionId, item]));
  const abc = buildAbcClassification(companyId, companyAssignments, products);
  const abcBySku = new Map(abc.map((item) => [item.skuId, item]));
  const alerts = buildLayoutAlerts(companyId, companyLocations, companyAssignments, occupanciesByLocation, products);
  const suggestions = buildRelocationSuggestions(
    companyId,
    companyLocations,
    companyAssignments,
    occupanciesByLocation,
    abcBySku,
  );

  nextStore.occupancies = [
    ...nextStore.occupancies.filter((item) => item.empresaId !== companyId),
    ...occupancies,
  ];
  nextStore.lots = [
    ...nextStore.lots.filter((item) => item.empresaId !== companyId),
    ...companyLots,
  ];
  nextStore.alerts = [
    ...nextStore.alerts.filter((item) => item.empresaId !== companyId),
    ...alerts,
  ];
  nextStore.abc = [...nextStore.abc.filter((item) => item.empresaId !== companyId), ...abc];
  nextStore.suggestions = [
    ...nextStore.suggestions.filter((item) => item.empresaId !== companyId),
    ...suggestions,
  ];

  return nextStore;
}

export function updateStorageLayoutLotStock(
  companyId: string,
  lotId: string,
  nextStock: number,
  context?: StorageLayoutStockMovementContext,
): StorageLayoutStore {
  const store = ensureStorageLayoutBaseline(companyId);
  const currentLot = store.lots.find((lot) => lot.empresaId === companyId && lot.id === lotId) ?? null;
  const normalizedNextStock = Math.max(0, Math.round(nextStock));

  if (currentLot) {
    registerInventoryMovementFromStorageLayout({
      companyId,
      lot: {
        ...currentLot,
        stockSistema: normalizedNextStock,
        estado: resolveLotStatus(currentLot.fechaVencimiento),
      },
      previousStock: currentLot.stockSistema,
      nextStock: normalizedNextStock,
      context,
    });
  }

  const updatedStore: StorageLayoutStore = {
    ...store,
    lots: store.lots.map((lot) =>
      lot.empresaId === companyId && lot.id === lotId
        ? {
            ...lot,
            stockSistema: normalizedNextStock,
            estado: resolveLotStatus(lot.fechaVencimiento),
          }
        : { ...lot },
    ),
  };

  const recalculated = recalculateStorageLayoutCompany(updatedStore, companyId);
  writeStorageLayoutStore(recalculated);

  return recalculated;
}

export function buildStorageLayoutDashboard(
  store: StorageLayoutStore,
  companyId: string,
  filters: StorageLayoutFilters,
): StorageLayoutDashboard {
  const companyWarehouses = store.warehouses.filter((item) => item.empresaId === companyId);
  const companyLocations = store.locations
    .filter((item) => item.empresaId === companyId)
    .filter((item) => matchesLayoutFilters(item, store, filters));
  const visibleLocationIds = new Set(companyLocations.map((item) => item.id));
  const assignments = store.assignments
    .filter((item) => item.empresaId === companyId && visibleLocationIds.has(item.ubicacionId))
    .map((item) => ({ ...item }));
  const occupancies = store.occupancies
    .filter((item) => item.empresaId === companyId && visibleLocationIds.has(item.ubicacionId))
    .map((item) => ({ ...item }));
  const alerts = store.alerts
    .filter((item) => item.empresaId === companyId && visibleLocationIds.has(item.ubicacionId))
    .sort((left, right) => compareSeverity(right.severidad, left.severidad));
  const lots = store.lots
    .filter((item) => item.empresaId === companyId && visibleLocationIds.has(item.ubicacionId))
    .map((item) => projectStorageLayoutLotWithInventoryCore(item));
  const assignmentsByLocation = new Map<string, StorageLocationAssignment[]>();

  assignments.forEach((assignment) => {
    assignmentsByLocation.set(assignment.ubicacionId, [
      ...(assignmentsByLocation.get(assignment.ubicacionId) ?? []),
      assignment,
    ]);
  });

  const visibleSkuIds = new Set(assignments.map((item) => item.skuId));
  const abc = store.abc
    .filter((item) => item.empresaId === companyId && visibleSkuIds.has(item.skuId))
    .sort((left, right) => right.participacionPct - left.participacionPct);
  const suggestions = store.suggestions
    .filter(
      (item) =>
        item.empresaId === companyId &&
        visibleLocationIds.has(item.origenUbicacionId) &&
        visibleLocationIds.has(item.destinoUbicacionId),
    )
    .slice(0, 8);
  const map = buildZoneMap(companyWarehouses, companyLocations, occupancies, assignmentsByLocation);

  return {
    filters: { ...filters },
    catalogs: buildCatalogs(store, companyId),
    warehouses: companyWarehouses.map((item) => ({ ...item })),
    locations: companyLocations.map((item) => ({ ...item })),
    assignments,
    occupancies,
    alerts,
    abc,
    suggestions,
    lots,
    map,
    kpis: buildKpis(companyWarehouses, companyLocations, occupancies, abc, map),
    selectedLocation: companyLocations[0] ?? null,
  };
}

export function buildStorageLayoutAuditDraft(
  action: StorageLayoutAuditDraft['action'],
  companyId: string,
  entityId: string,
  entityName: string,
  summary: string,
  beforePayload: Record<string, unknown> | null,
  afterPayload: Record<string, unknown> | null,
): StorageLayoutAuditDraft {
  return {
    module: 'layout-almacenamiento',
    action,
    companyId,
    companyName: resolveCompanyName(companyId),
    entityId,
    entityName,
    summary,
    occurredAt: new Date().toISOString(),
    beforePayload,
    afterPayload,
  };
}

function seedCompanyLayout(
  store: StorageLayoutStore,
  companyId: string,
): StorageLayoutStore {
  const companyName = resolveCompanyName(companyId);
  const companyProducts = readCompanyProducts(companyId);
  const productsById = new Map(companyProducts.map((product) => [product.id, product]));
  const warehouses = buildSeedWarehouses(companyId);
  const locations = buildSeedLocations(companyId, warehouses);
  const locationsByCode = new Map(locations.map((item) => [item.codigo, item]));
  const selectedProducts = selectSeedProducts(companyProducts);
  const assignments = buildSeedAssignments(companyId, selectedProducts, locationsByCode);
  const lots = buildSeedLots(companyId, selectedProducts, locationsByCode, productsById);
  const auditDraft = buildStorageLayoutAuditDraft(
    'seed',
    companyId,
    `layout-${companyId}`,
    `Layout ${companyName}`,
    `Seed inicial de layout y almacenamiento para ${companyName}.`,
    null,
    {
      warehouses: warehouses.length,
      locations: locations.length,
      assignments: assignments.length,
      lots: lots.length,
    },
  );

  return {
    ...store,
    warehouses: [...store.warehouses.filter((item) => item.empresaId !== companyId), ...warehouses],
    locations: [...store.locations.filter((item) => item.empresaId !== companyId), ...locations],
    assignments: [...store.assignments.filter((item) => item.empresaId !== companyId), ...assignments],
    lots: [...store.lots.filter((item) => item.empresaId !== companyId), ...lots],
    auditTrail: [auditDraft, ...store.auditTrail],
  };
}

function buildSeedWarehouses(companyId: string): Warehouse[] {
  if (companyId === 'medussa-holding') {
    return [
      {
        id: `${companyId}-warehouse-main`,
        empresaId: companyId,
        codigo: 'ARB-BP',
        nombre: 'Bodega principal',
        tipo: 'PRINCIPAL',
        estado: 'ACTIVA',
      },
      {
        id: `${companyId}-warehouse-packaging`,
        empresaId: companyId,
        codigo: 'ARB-BE',
        nombre: 'Bodega de empaque',
        tipo: 'EMPAQUE',
        estado: 'ACTIVA',
      },
      {
        id: `${companyId}-warehouse-cold`,
        empresaId: companyId,
        codigo: 'ARB-CF',
        nombre: 'Cuarto frio',
        tipo: 'FRIO',
        estado: 'ACTIVA',
      },
    ];
  }

  return [
    {
      id: `${companyId}-warehouse-main`,
      empresaId: companyId,
      codigo: `${companyId.toUpperCase().slice(0, 3)}-01`,
      nombre: 'Bodega operativa',
      tipo: 'PRINCIPAL',
      estado: 'ACTIVA',
    },
    {
      id: `${companyId}-warehouse-secondary`,
      empresaId: companyId,
      codigo: `${companyId.toUpperCase().slice(0, 3)}-02`,
      nombre: 'Bodega secundaria',
      tipo: 'SATELITE',
      estado: 'ACTIVA',
    },
  ];
}

function buildSeedLocations(companyId: string, warehouses: Warehouse[]): StorageLocation[] {
  if (companyId !== 'medussa-holding') {
    return [
      buildLocation(companyId, warehouses[0].id, {
        warehouseId: warehouses[0].id,
        code: `${warehouses[0].codigo}-REC-A1-N1-P01`,
        zone: 'Recepcion',
        aisle: 'A1',
        rack: 'R1',
        level: 'N1',
        position: 'P01',
        capacity: 120,
        storageType: 'Seco',
        restriction: 'Sin restriccion',
      }),
      buildLocation(companyId, warehouses[0].id, {
        warehouseId: warehouses[0].id,
        code: `${warehouses[0].codigo}-PIC-A1-N2-P01`,
        zone: 'Picking',
        aisle: 'A1',
        rack: 'R1',
        level: 'N2',
        position: 'P01',
        capacity: 90,
        storageType: 'Seco',
        restriction: 'Producto terminado',
      }),
      buildLocation(companyId, warehouses[1].id, {
        warehouseId: warehouses[1].id,
        code: `${warehouses[1].codigo}-RES-B1-N1-P01`,
        zone: 'Reserva',
        aisle: 'B1',
        rack: 'R2',
        level: 'N1',
        position: 'P01',
        capacity: 140,
        storageType: 'Seco',
        restriction: 'Sin restriccion',
      }),
      buildLocation(companyId, warehouses[1].id, {
        warehouseId: warehouses[1].id,
        code: `${warehouses[1].codigo}-QUA-B2-N1-P01`,
        zone: 'Cuarentena',
        aisle: 'B2',
        rack: 'R3',
        level: 'N1',
        position: 'P01',
        capacity: 70,
        storageType: 'Cuarentena',
        restriction: 'No alimentos abiertos',
        status: 'BLOQUEADA',
      }),
    ];
  }

  const [main, packaging, cold] = warehouses;

  return [
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-REC-A1-N1-P01',
      zone: 'Recepcion',
      aisle: 'A1',
      rack: 'R1',
      level: 'N1',
      position: 'P01',
      capacity: 180,
      storageType: 'Seco',
      restriction: 'Sin restriccion',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-PIC-A1-N1-P01',
      zone: 'Picking',
      aisle: 'A1',
      rack: 'R1',
      level: 'N1',
      position: 'P01',
      capacity: 80,
      storageType: 'Seco',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-PIC-A1-N2-P01',
      zone: 'Picking',
      aisle: 'A1',
      rack: 'R1',
      level: 'N2',
      position: 'P01',
      capacity: 95,
      storageType: 'Seco',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-RES-B1-N1-P01',
      zone: 'Reserva',
      aisle: 'B1',
      rack: 'R3',
      level: 'N1',
      position: 'P01',
      capacity: 240,
      storageType: 'Seco',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-RES-B1-N2-P01',
      zone: 'Reserva',
      aisle: 'B1',
      rack: 'R3',
      level: 'N2',
      position: 'P01',
      capacity: 210,
      storageType: 'Seco',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-RES-B2-N1-P01',
      zone: 'Reserva',
      aisle: 'B2',
      rack: 'R4',
      level: 'N1',
      position: 'P01',
      capacity: 190,
      storageType: 'Seco',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-DSP-C1-N1-P01',
      zone: 'Despacho',
      aisle: 'C1',
      rack: 'R5',
      level: 'N1',
      position: 'P01',
      capacity: 125,
      storageType: 'Seco',
      restriction: 'Sin restriccion',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-QUA-C2-N1-P01',
      zone: 'Cuarentena',
      aisle: 'C2',
      rack: 'R6',
      level: 'N1',
      position: 'P01',
      capacity: 110,
      storageType: 'Cuarentena',
      restriction: 'No alimentos abiertos',
    }),
    buildLocation(companyId, main.id, {
      warehouseId: main.id,
      code: 'ARB-BP-RET-D1-N1-P01',
      zone: 'Retornos',
      aisle: 'D1',
      rack: 'R7',
      level: 'N1',
      position: 'P01',
      capacity: 105,
      storageType: 'Seco',
      restriction: 'Sin restriccion',
      status: 'MANTENIMIENTO',
    }),
    buildLocation(companyId, packaging.id, {
      warehouseId: packaging.id,
      code: 'ARB-BE-PIC-A1-N1-P01',
      zone: 'Picking',
      aisle: 'A1',
      rack: 'R1',
      level: 'N1',
      position: 'P01',
      capacity: 300,
      storageType: 'Material empaque',
      restriction: 'Sin restriccion',
    }),
    buildLocation(companyId, packaging.id, {
      warehouseId: packaging.id,
      code: 'ARB-BE-RES-A2-N1-P01',
      zone: 'Reserva',
      aisle: 'A2',
      rack: 'R2',
      level: 'N1',
      position: 'P01',
      capacity: 340,
      storageType: 'Material empaque',
      restriction: 'Sin restriccion',
    }),
    buildLocation(companyId, packaging.id, {
      warehouseId: packaging.id,
      code: 'ARB-BE-RES-A2-N2-P01',
      zone: 'Reserva',
      aisle: 'A2',
      rack: 'R2',
      level: 'N2',
      position: 'P01',
      capacity: 320,
      storageType: 'Material empaque',
      restriction: 'Sin restriccion',
    }),
    buildLocation(companyId, packaging.id, {
      warehouseId: packaging.id,
      code: 'ARB-BE-QUI-B1-N1-P01',
      zone: 'Soporte',
      aisle: 'B1',
      rack: 'R3',
      level: 'N1',
      position: 'P01',
      capacity: 85,
      storageType: 'Seco',
      restriction: 'Material quimico separado',
      status: 'ACTIVA',
    }),
    buildLocation(companyId, cold.id, {
      warehouseId: cold.id,
      code: 'ARB-CF-PIC-A1-N1-P01',
      zone: 'Picking',
      aisle: 'A1',
      rack: 'R1',
      level: 'N1',
      position: 'P01',
      capacity: 115,
      storageType: 'Refrigerado',
      restriction: 'Solo refrigerado',
    }),
    buildLocation(companyId, cold.id, {
      warehouseId: cold.id,
      code: 'ARB-CF-RES-A1-N2-P01',
      zone: 'Reserva',
      aisle: 'A1',
      rack: 'R1',
      level: 'N2',
      position: 'P01',
      capacity: 150,
      storageType: 'Refrigerado',
      restriction: 'Solo refrigerado',
    }),
    buildLocation(companyId, cold.id, {
      warehouseId: cold.id,
      code: 'ARB-CF-RES-B1-N1-P01',
      zone: 'Reserva',
      aisle: 'B1',
      rack: 'R2',
      level: 'N1',
      position: 'P01',
      capacity: 170,
      storageType: 'Refrigerado',
      restriction: 'Producto terminado',
    }),
    buildLocation(companyId, cold.id, {
      warehouseId: cold.id,
      code: 'ARB-CF-CUA-B2-N1-P01',
      zone: 'Cuarentena',
      aisle: 'B2',
      rack: 'R3',
      level: 'N1',
      position: 'P01',
      capacity: 90,
      storageType: 'Cuarentena',
      restriction: 'Solo refrigerado',
      status: 'BLOQUEADA',
    }),
    buildLocation(companyId, cold.id, {
      warehouseId: cold.id,
      code: 'ARB-CF-DSP-C1-N1-P01',
      zone: 'Pre-despacho',
      aisle: 'C1',
      rack: 'R4',
      level: 'N1',
      position: 'P01',
      capacity: 130,
      storageType: 'Refrigerado',
      restriction: 'Producto terminado',
    }),
  ];
}

function buildLocation(
  companyId: string,
  warehouseId: string,
  input: SeedLocationInput,
): StorageLocation {
  return {
    id: `loc-${companyId}-${slugify(input.code)}`,
    empresaId: companyId,
    bodegaId: warehouseId,
    codigo: input.code,
    zona: input.zone,
    pasillo: input.aisle,
    rack: input.rack,
    nivel: input.level,
    posicion: input.position,
    capacidad: input.capacity,
    tipoAlmacenamiento: input.storageType,
    restriccionSanitaria: input.restriction,
    estado: input.status ?? 'ACTIVA',
  };
}

function selectSeedProducts(products: Product[]): Product[] {
  const preferredSkus = [
    'ARB-UHT-1L',
    'ARB-YOG-200-FR',
    'ARB-QUE-500',
    'ARB-MP-LPE25',
    'ARB-EMP-DP1',
    'ARB-MP-CLM',
    'ARB-LOG-C24',
    'HOLD-LIM-005',
  ];

  return preferredSkus
    .map((sku) => products.find((product) => product.sku === sku))
    .filter((product): product is Product => !!product);
}

function buildSeedAssignments(
  companyId: string,
  products: Product[],
  locationsByCode: Map<string, StorageLocation>,
): StorageLocationAssignment[] {
  const locationMap: Record<string, string> = {
    'ARB-UHT-1L': 'ARB-BP-PIC-A1-N1-P01',
    'ARB-YOG-200-FR': 'ARB-CF-PIC-A1-N1-P01',
    'ARB-QUE-500': 'ARB-CF-RES-A1-N2-P01',
    'ARB-MP-LPE25': 'ARB-BP-RES-B1-N2-P01',
    'ARB-EMP-DP1': 'ARB-BE-PIC-A1-N1-P01',
    'ARB-MP-CLM': 'ARB-CF-CUA-B2-N1-P01',
    'ARB-LOG-C24': 'ARB-BP-DSP-C1-N1-P01',
    'HOLD-LIM-005': 'ARB-BE-QUI-B1-N1-P01',
  };

  return products.map((product, index) => {
    const location = locationsByCode.get(locationMap[product.sku] ?? '');
    const rotation = resolveProductRotation(product);
    const abc = resolveProductAbcCategory(product);

    return {
      id: `assign-${companyId}-${product.id}-${location?.id ?? index}`,
      empresaId: companyId,
      ubicacionId: location?.id ?? Array.from(locationsByCode.values())[0].id,
      skuId: product.id,
      sku: product.sku,
      productoNombre: product.nombre,
      prioridad: abc === 'A' ? 'CRITICA' : abc === 'B' ? 'ALTA' : 'MEDIA',
      categoriaABC: abc,
      rotacion: rotation,
      fechaAsignacion: `2026-04-${String(4 + index).padStart(2, '0')}T08:00:00-05:00`,
    };
  });
}

function buildSeedLots(
  companyId: string,
  products: Product[],
  locationsByCode: Map<string, StorageLocation>,
  productsById: Map<string, Product>,
): StorageLayoutLot[] {
  const seeds: SeedLotInput[] =
    companyId === 'medussa-holding'
      ? [
          {
            locationCode: 'ARB-BP-PIC-A1-N1-P01',
            skuId: findProductId(products, 'ARB-UHT-1L'),
            quantity: 760,
            lot: 'UHT-2404-A',
            ingreso: '2026-04-06',
            vencimiento: '2026-10-03',
          },
          {
            locationCode: 'ARB-BP-RES-B1-N1-P01',
            skuId: findProductId(products, 'ARB-UHT-1L'),
            quantity: 980,
            lot: 'UHT-2404-B',
            ingreso: '2026-04-04',
            vencimiento: '2026-10-01',
          },
          {
            locationCode: 'ARB-CF-PIC-A1-N1-P01',
            skuId: findProductId(products, 'ARB-YOG-200-FR'),
            quantity: 520,
            lot: 'YOG-0420-FR',
            ingreso: '2026-04-15',
            vencimiento: '2026-05-15',
          },
          {
            locationCode: 'ARB-CF-RES-A1-N2-P01',
            skuId: findProductId(products, 'ARB-QUE-500'),
            quantity: 340,
            lot: 'QUE-0416-C',
            ingreso: '2026-04-16',
            vencimiento: '2026-05-08',
          },
          {
            locationCode: 'ARB-CF-CUA-B2-N1-P01',
            skuId: findProductId(products, 'ARB-QUE-500'),
            quantity: 48,
            lot: 'QUE-0321-R',
            ingreso: '2026-03-21',
            vencimiento: '2026-04-17',
          },
          {
            locationCode: 'ARB-BP-RES-B1-N2-P01',
            skuId: findProductId(products, 'ARB-MP-LPE25'),
            quantity: 1320,
            lot: 'LPE25-0407',
            ingreso: '2026-04-07',
            vencimiento: '2027-04-07',
          },
          {
            locationCode: 'ARB-BE-PIC-A1-N1-P01',
            skuId: findProductId(products, 'ARB-EMP-DP1'),
            quantity: 8200,
            lot: 'DP1-0409',
            ingreso: '2026-04-09',
            vencimiento: null,
          },
          {
            locationCode: 'ARB-BE-RES-A2-N1-P01',
            skuId: findProductId(products, 'ARB-EMP-DP1'),
            quantity: 4700,
            lot: 'DP1-0401',
            ingreso: '2026-04-01',
            vencimiento: null,
          },
          {
            locationCode: 'ARB-CF-CUA-B2-N1-P01',
            skuId: findProductId(products, 'ARB-MP-CLM'),
            quantity: 36,
            lot: 'CLM-0328',
            ingreso: '2026-03-28',
            vencimiento: '2026-04-24',
          },
          {
            locationCode: 'ARB-BP-DSP-C1-N1-P01',
            skuId: findProductId(products, 'ARB-LOG-C24'),
            quantity: 72,
            lot: 'CAN-0402',
            ingreso: '2026-04-02',
            vencimiento: null,
          },
          {
            locationCode: 'ARB-BE-QUI-B1-N1-P01',
            skuId: findProductId(products, 'HOLD-LIM-005'),
            quantity: 34,
            lot: 'DET-0403',
            ingreso: '2026-04-03',
            vencimiento: '2027-04-03',
          },
          {
            locationCode: 'ARB-BP-RES-B2-N1-P01',
            skuId: findProductId(products, 'ARB-MP-LPE25'),
            quantity: 420,
            lot: 'LPE25-0329',
            ingreso: '2026-03-29',
            vencimiento: '2027-03-29',
          },
        ]
      : buildGenericLotSeeds(companyId, products);

  return seeds
    .map((seed) => {
      const product = productsById.get(seed.skuId);
      const location = locationsByCode.get(seed.locationCode);

      if (!product || !location) {
        return null;
      }

      return {
        id: `lot-${companyId}-${slugify(seed.lot)}-${location.id}`,
        empresaId: companyId,
        bodegaId: location.bodegaId,
        ubicacionId: location.id,
        skuId: product.id,
        sku: product.sku,
        productoNombre: product.nombre,
        lote: seed.lot,
        fechaIngreso: seed.ingreso,
        fechaVencimiento: seed.vencimiento,
        stockSistema: seed.quantity,
        estado: resolveLotStatus(seed.vencimiento),
      } satisfies StorageLayoutLot;
    })
    .filter((item): item is StorageLayoutLot => !!item);
}

function buildGenericLotSeeds(companyId: string, products: Product[]): SeedLotInput[] {
  const selected = products.slice(0, 3);

  return selected.flatMap((product, index) => [
    {
      locationCode: `${companyId.toUpperCase().slice(0, 3)}-01-REC-A1-N1-P01`,
      skuId: product.id,
      quantity: 120 + index * 45,
      lot: `${slugify(product.sku)}-A`,
      ingreso: '2026-04-08',
      vencimiento: product.manejaVencimiento ? '2026-09-30' : null,
    },
    {
      locationCode: `${companyId.toUpperCase().slice(0, 3)}-02-RES-B1-N1-P01`,
      skuId: product.id,
      quantity: 80 + index * 25,
      lot: `${slugify(product.sku)}-B`,
      ingreso: '2026-04-04',
      vencimiento: product.manejaVencimiento ? '2026-10-20' : null,
    },
  ]);
}

function buildOccupancy(
  location: StorageLocation,
  lots: StorageLayoutLot[],
  products: Product[],
): StorageLayoutOccupancy {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const occupied = Math.max(
    0,
    Math.round(
      lots.reduce((sum, lot) => {
        const product = productsById.get(lot.skuId);
        const projected = resolveInventoryProjectedStockForLayoutLot(lot);
        return sum + resolveSpaceUsage(product, projected.stockSistema);
      }, 0),
    ),
  );
  const pct = location.capacidad ? Math.min(100, Math.round((occupied / location.capacidad) * 100)) : 0;

  return {
    id: `occ-${location.id}`,
    empresaId: location.empresaId,
    ubicacionId: location.id,
    capacidadTotal: location.capacidad,
    capacidadOcupada: occupied,
    ocupacionPct: pct,
  };
}

function buildAbcClassification(
  companyId: string,
  assignments: StorageLocationAssignment[],
  products: Product[],
): AbcClassification[] {
  const categorySpend = readCategorySpend(companyId);
  const totalSpend = Array.from(categorySpend.values()).reduce((sum, value) => sum + value, 0);
  const productsById = new Map(products.map((item) => [item.id, item]));

  return assignments.map((assignment) => {
    const product = productsById.get(assignment.skuId);
    const categoryKey = mapProductToSupplyCategory(product);
    const baselineShare = totalSpend ? Math.round(((categorySpend.get(categoryKey) ?? 0) / totalSpend) * 100) : 0;
    const uplift =
      assignment.categoriaABC === 'A' ? 8 : assignment.categoriaABC === 'B' ? 2 : -6;
    const participationPct = Math.max(4, Math.min(32, baselineShare + uplift));

    return {
      id: `abc-${companyId}-${assignment.skuId}`,
      empresaId: companyId,
      skuId: assignment.skuId,
      sku: assignment.sku,
      productoNombre: assignment.productoNombre,
      categoriaABC: assignment.categoriaABC,
      rotacion: assignment.rotacion,
      participacionPct: participationPct,
      sugerenciaUbicacion:
        assignment.categoriaABC === 'A'
          ? 'Picking frontal con reabastecimiento diario'
          : assignment.categoriaABC === 'B'
            ? 'Reserva media con reposicion cada turno'
            : 'Reserva profunda o soporte de baja rotacion',
    };
  });
}

function buildLayoutAlerts(
  companyId: string,
  locations: StorageLocation[],
  assignments: StorageLocationAssignment[],
  occupanciesByLocation: Map<string, StorageLayoutOccupancy>,
  products: Product[],
): StorageLayoutAlert[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const assignmentByLocation = new Map(assignments.map((assignment) => [assignment.ubicacionId, assignment]));
  const alerts: StorageLayoutAlert[] = [];

  locations.forEach((location) => {
    const occupancy = occupanciesByLocation.get(location.id);
    const assignment = assignmentByLocation.get(location.id);
    const product = assignment ? productsById.get(assignment.skuId) : null;

    if (occupancy && occupancy.ocupacionPct >= 88) {
      alerts.push({
        id: `layout-alert-sat-${location.id}`,
        empresaId: companyId,
        ubicacionId: location.id,
        tipoAlerta: 'ZONA_SATURADA',
        severidad: occupancy.ocupacionPct >= 95 ? 'ALTA' : 'MEDIA',
        descripcion: `${location.codigo} opera al ${occupancy.ocupacionPct}% y tensiona reposicion/picking.`,
      });
    }

    if (occupancy && occupancy.ocupacionPct <= 18 && location.estado === 'ACTIVA') {
      alerts.push({
        id: `layout-alert-idle-${location.id}`,
        empresaId: companyId,
        ubicacionId: location.id,
        tipoAlerta: 'ZONA_OCIOSA',
        severidad: occupancy.ocupacionPct <= 8 ? 'MEDIA' : 'BAJA',
        descripcion: `${location.codigo} tiene uso bajo y puede absorber reubicaciones.`,
      });
    }

    if (location.estado === 'BLOQUEADA') {
      alerts.push({
        id: `layout-alert-block-${location.id}`,
        empresaId: companyId,
        ubicacionId: location.id,
        tipoAlerta: 'UBICACION_BLOQUEADA',
        severidad: 'ALTA',
        descripcion: `${location.codigo} esta bloqueada para operaciones de conteo y movimiento.`,
      });
    }

    if (assignment && product && isSanitaryMismatch(location, product)) {
      alerts.push({
        id: `layout-alert-san-${location.id}`,
        empresaId: companyId,
        ubicacionId: location.id,
        tipoAlerta: 'RESTRICCION_INCOMPATIBLE',
        severidad: 'ALTA',
        descripcion: `${assignment.productoNombre} no es consistente con la restriccion sanitaria de ${location.codigo}.`,
      });
    }
  });

  return alerts.sort((left, right) => compareSeverity(right.severidad, left.severidad));
}

function buildRelocationSuggestions(
  companyId: string,
  locations: StorageLocation[],
  assignments: StorageLocationAssignment[],
  occupanciesByLocation: Map<string, StorageLayoutOccupancy>,
  abcBySku: Map<string, AbcClassification>,
): StorageRelocationSuggestion[] {
  const activeLocations = locations.filter((item) => item.estado === 'ACTIVA');
  const suggestions: StorageRelocationSuggestion[] = [];

  assignments.forEach((assignment) => {
    const location = activeLocations.find((item) => item.id === assignment.ubicacionId);

    if (!location) {
      return;
    }

    const occupancy = occupanciesByLocation.get(location.id)?.ocupacionPct ?? 0;
    const abc = abcBySku.get(assignment.skuId);
    const preferredZones = assignment.categoriaABC === 'A' ? ['Picking', 'Pre-despacho'] : ['Reserva', 'Picking'];
    const candidate = activeLocations.find((item) => {
      if (item.id === location.id) {
        return false;
      }

      const candidateOccupancy = occupanciesByLocation.get(item.id)?.ocupacionPct ?? 0;

      return preferredZones.includes(item.zona) && candidateOccupancy < 58 && item.tipoAlmacenamiento === location.tipoAlmacenamiento;
    });

    if (!candidate) {
      return;
    }

    if (assignment.categoriaABC === 'A' && occupancy < 70 && preferredZones.includes(location.zona)) {
      return;
    }

    suggestions.push({
      id: `sugg-${companyId}-${assignment.id}`,
      empresaId: companyId,
      skuId: assignment.skuId,
      sku: assignment.sku,
      productoNombre: assignment.productoNombre,
      origenUbicacionId: location.id,
      origenCodigo: location.codigo,
      destinoUbicacionId: candidate.id,
      destinoCodigo: candidate.codigo,
      motivo:
        assignment.categoriaABC === 'A'
          ? 'SKU clase A requiere acceso mas corto y menor saturacion.'
          : 'Rebalanceo de ocupacion para liberar capacidad operativa.',
      impacto: abc?.sugerenciaUbicacion ?? 'Mejorar picking y estabilidad de layout.',
    });
  });

  return suggestions.slice(0, 8);
}

function buildZoneMap(
  warehouses: Warehouse[],
  locations: StorageLocation[],
  occupancies: StorageLayoutOccupancy[],
  assignmentsByLocation: Map<string, StorageLocationAssignment[]>,
): StorageLayoutZoneSummary[] {
  const occupanciesByLocation = new Map(occupancies.map((item) => [item.ubicacionId, item]));
  const zoneKeys = new Set(locations.map((item) => `${item.bodegaId}|${item.zona}`));

  return Array.from(zoneKeys)
    .map((key) => {
      const [warehouseId, zone] = key.split('|');
      const warehouse = warehouses.find((item) => item.id === warehouseId);
      const zoneLocations = locations.filter((item) => item.bodegaId === warehouseId && item.zona === zone);
      const cells = zoneLocations.map((location) => ({
        locationId: location.id,
        code: location.codigo,
        occupancyPct: occupanciesByLocation.get(location.id)?.ocupacionPct ?? 0,
        status: location.estado,
        sku: assignmentsByLocation.get(location.id)?.[0]?.sku ?? null,
      }));
      const average = cells.length
        ? Math.round(cells.reduce((sum, cell) => sum + cell.occupancyPct, 0) / cells.length)
        : 0;

      return {
        warehouseId,
        warehouseName: warehouse?.nombre ?? warehouseId,
        zone,
        occupancyPct: average,
        saturated: average >= 88,
        idle: average <= 18,
        cells,
      };
    })
    .sort((left, right) => {
      if (left.warehouseName !== right.warehouseName) {
        return left.warehouseName.localeCompare(right.warehouseName, 'es-CO');
      }

      return left.zone.localeCompare(right.zone, 'es-CO');
    });
}

function buildKpis(
  warehouses: Warehouse[],
  locations: StorageLocation[],
  occupancies: StorageLayoutOccupancy[],
  abc: AbcClassification[],
  map: StorageLayoutZoneSummary[],
): StorageLayoutKpis {
  return {
    activeWarehouses: warehouses.filter((item) => item.estado === 'ACTIVA').length,
    totalLocations: locations.length,
    averageOccupancyPct: occupancies.length
      ? Math.round(occupancies.reduce((sum, item) => sum + item.ocupacionPct, 0) / occupancies.length)
      : 0,
    saturatedZones: map.filter((item) => item.saturated).length,
    idleZones: map.filter((item) => item.idle).length,
    skuClassA: abc.filter((item) => item.categoriaABC === 'A').length,
  };
}

function buildCatalogs(store: StorageLayoutStore, companyId: string): StorageLayoutCatalogs {
  const companyWarehouses = store.warehouses.filter((item) => item.empresaId === companyId);
  const companyLocations = store.locations.filter((item) => item.empresaId === companyId);
  const companyAssignments = store.assignments.filter((item) => item.empresaId === companyId);
  const companyProducts = readCompanyProducts(companyId).filter((item) => item.estado === 'ACTIVO');
  const zones = Array.from(new Set(companyLocations.map((item) => item.zona))).sort((a, b) =>
    a.localeCompare(b, 'es-CO'),
  );

  return {
    warehouses: companyWarehouses.map((item) => ({ value: item.id, label: item.nombre })),
    zones: zones.map((item) => ({ value: item, label: item })),
    storageTypes: [
      { value: 'Seco', label: 'Seco' },
      { value: 'Refrigerado', label: 'Refrigerado' },
      { value: 'Congelado', label: 'Congelado' },
      { value: 'Material empaque', label: 'Material empaque' },
      { value: 'Cuarentena', label: 'Cuarentena' },
    ],
    sanitaryRestrictions: [
      { value: 'Sin restriccion', label: 'Sin restriccion' },
      { value: 'Solo refrigerado', label: 'Solo refrigerado' },
      { value: 'No alimentos abiertos', label: 'No alimentos abiertos' },
      { value: 'Material quimico separado', label: 'Material quimico separado' },
      { value: 'Producto terminado', label: 'Producto terminado' },
    ],
    occupancyStates: [
      { value: 'TODAS', label: 'Todas' },
      { value: 'SATURADA', label: 'Saturada' },
      { value: 'RIESGO', label: 'En riesgo' },
      { value: 'CONTROLADA', label: 'Controlada' },
      { value: 'OCIOSA', label: 'Ociosa' },
    ],
    skus: companyProducts
      .map((item) => ({
        value: item.sku,
        label: `${item.sku} · ${item.nombre}`,
        skuId: item.id,
        sku: item.sku,
        productName: item.nombre,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
    abcCategories: [
      { value: 'TODAS', label: 'Todas' },
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
    ],
    warehouseTypes: [
      { value: 'PRINCIPAL', label: 'Principal' },
      { value: 'EMPAQUE', label: 'Empaque' },
      { value: 'FRIO', label: 'Cuarto frio' },
      { value: 'SATELITE', label: 'Satelite' },
    ],
    warehouseStatuses: [
      { value: 'ACTIVA', label: 'Activa' },
      { value: 'INACTIVA', label: 'Inactiva' },
    ],
    locationStatuses: [
      { value: 'ACTIVA', label: 'Activa' },
      { value: 'BLOQUEADA', label: 'Bloqueada' },
      { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
    ],
    priorities: [
      { value: 'CRITICA', label: 'Critica' },
      { value: 'ALTA', label: 'Alta' },
      { value: 'MEDIA', label: 'Media' },
      { value: 'BAJA', label: 'Baja' },
    ],
  };
}

function matchesLayoutFilters(
  location: StorageLocation,
  store: StorageLayoutStore,
  filters: StorageLayoutFilters,
): boolean {
  const occupancy = store.occupancies.find((item) => item.ubicacionId === location.id)?.ocupacionPct ?? 0;
  const assignments = store.assignments.filter((item) => item.ubicacionId === location.id);
  const matchesSku = !filters.sku || assignments.some((item) => item.sku === filters.sku);
  const matchesAbc =
    filters.categoriaABC === 'TODAS' ||
    assignments.some((item) => item.categoriaABC === filters.categoriaABC);

  return (
    (!filters.bodegaId || location.bodegaId === filters.bodegaId) &&
    (!filters.zona || location.zona === filters.zona) &&
    (!filters.tipoAlmacenamiento || location.tipoAlmacenamiento === filters.tipoAlmacenamiento) &&
    (!filters.restriccionSanitaria || location.restriccionSanitaria === filters.restriccionSanitaria) &&
    matchesOccupancyFilter(filters.ocupacion, occupancy) &&
    matchesSku &&
    matchesAbc
  );
}

function matchesOccupancyFilter(filter: StorageLayoutFilters['ocupacion'], occupancyPct: number): boolean {
  if (filter === 'TODAS') {
    return true;
  }

  if (filter === 'SATURADA') {
    return occupancyPct >= 88;
  }

  if (filter === 'RIESGO') {
    return occupancyPct >= 70 && occupancyPct < 88;
  }

  if (filter === 'CONTROLADA') {
    return occupancyPct >= 20 && occupancyPct < 70;
  }

  return occupancyPct < 20;
}

function readCompanyProducts(companyId: string): Product[] {
  if (typeof window === 'undefined') {
    return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
  }

  const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);

  if (!raw) {
    return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
  }

  try {
    const parsed = JSON.parse(raw) as { products?: Product[] };
    return (parsed.products ?? [])
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }));
  } catch {
    return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
  }
}

function readCategorySpend(companyId: string): Map<string, number> {
  const result = new Map<string, number>();

  if (typeof window === 'undefined') {
    return result;
  }

  const raw = localStorage.getItem(PURCHASE_ANALYSIS_STORAGE_KEY);

  if (!raw) {
    return result;
  }

  try {
    const parsed = JSON.parse(raw) as PurchaseAnalysisStore;
    const latest =
      (parsed.analyses ?? [])
        .filter((item: PurchaseAnalysisAggregate) => item.analysis.empresaId === companyId)
        .sort(
          (left: PurchaseAnalysisAggregate, right: PurchaseAnalysisAggregate) =>
            new Date(right.analysis.creadoEn).getTime() - new Date(left.analysis.creadoEn).getTime(),
        )[0] ?? null;

    latest?.details.forEach((detail) => {
      result.set(detail.categoria, (result.get(detail.categoria) ?? 0) + detail.valorTotal);
    });

    return result;
  } catch {
    return result;
  }
}

function resolveProductRotation(product: Product): StorageRotationLevel {
  const normalizedName = normalize(product.nombre);

  if (
    normalizedName.includes('uht') ||
    normalizedName.includes('yogurt') ||
    normalizedName.includes('leche') ||
    normalizedName.includes('doypack')
  ) {
    return 'ALTA';
  }

  if (normalizedName.includes('queso') || normalizedName.includes('cultivo')) {
    return 'MEDIA';
  }

  return 'BAJA';
}

function resolveProductAbcCategory(product: Product): AbcCategory {
  const rotation = resolveProductRotation(product);

  if (rotation === 'ALTA') {
    return 'A';
  }

  if (rotation === 'MEDIA') {
    return 'B';
  }

  return 'C';
}

function resolveSpaceUsage(product: Product | undefined, stock: number): number {
  if (!product) {
    return Math.max(1, Math.round(stock / 8));
  }

  if (product.unidadBase === 'KG') {
    return Math.round(stock * 0.12);
  }

  if (product.familia === 'Empaque') {
    return Math.round(stock * 0.01);
  }

  if (product.familia === 'Consumo interno') {
    return Math.round(stock * 0.2);
  }

  return Math.round(stock * 0.06);
}

function isSanitaryMismatch(location: StorageLocation, product: Product): boolean {
  if (location.restriccionSanitaria === 'Sin restriccion') {
    return false;
  }

  if (location.restriccionSanitaria === 'Solo refrigerado') {
    return location.tipoAlmacenamiento !== 'Refrigerado' && location.tipoAlmacenamiento !== 'Congelado';
  }

  if (location.restriccionSanitaria === 'Producto terminado') {
    return product.familia !== 'Producto terminado';
  }

  if (location.restriccionSanitaria === 'Material quimico separado') {
    return product.familia !== 'Limpieza';
  }

  if (location.restriccionSanitaria === 'No alimentos abiertos') {
    return product.familia === 'Materia prima';
  }

  return false;
}

function mapProductToSupplyCategory(product: Product | undefined): string {
  if (!product) {
    return 'Insumos';
  }

  if (product.familia === 'Empaque') {
    return 'Empaques';
  }

  if (product.familia === 'Repuestos') {
    return 'Repuestos';
  }

  if (product.familia === 'Limpieza') {
    return 'Insumos';
  }

  if (normalize(product.nombre).includes('cultivo')) {
    return 'Insumos';
  }

  return 'Materias primas';
}

function resolveLotStatus(vencimiento: string | null): StorageLayoutLot['estado'] {
  if (!vencimiento) {
    return 'ACTIVO';
  }

  const today = new Date();
  const dueDate = new Date(`${vencimiento}T00:00:00`);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return 'VENCIDO';
  }

  if (diffDays <= 10) {
    return 'PROXIMO_VENCER';
  }

  return 'ACTIVO';
}

function resolveCompanyName(companyId: string): string {
  return COMPANY_NAMES[companyId] ?? 'Empresa activa';
}

function findProductId(products: Product[], sku: string): string {
  return products.find((product) => product.sku === sku)?.id ?? products[0]?.id ?? `product-${sku}`;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function compareSeverity(
  left: StorageLayoutAlertSeverity,
  right: StorageLayoutAlertSeverity,
): number {
  const weight: Record<StorageLayoutAlertSeverity, number> = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return weight[left] - weight[right];
}
