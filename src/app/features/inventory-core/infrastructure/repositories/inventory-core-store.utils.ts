import { InventoryBalance } from '../../domain/models/inventory-balance.model';
import { EMPTY_INVENTORY_CORE_STORE, InventoryCoreStore } from '../../domain/models/inventory-core-store.model';
import { InventoryLot, InventoryLotStatus } from '../../domain/models/inventory-lot.model';
import {
  InventoryMovement,
  InventoryMovementSign,
  InventoryMovementType,
} from '../../domain/models/inventory-movement.model';
import { StorageLayoutLot } from '../../../storage-layout/domain/models/storage-layout-response.model';

export const INVENTORY_CORE_STORAGE_KEY = 'medussa.erp.mock.inventory-core';

export interface StorageLayoutStockMovementContext {
  tipoMovimiento?: InventoryMovementType;
  documentoOrigen?: string | null;
  moduloOrigen?: string;
  usuarioId?: string;
  observacion?: string | null;
  costoUnitario?: number | null;
  registrarMovimiento?: boolean;
  skipInventoryMovement?: boolean;
  sourceAlreadyRecorded?: boolean;
  projectionOnly?: boolean;
}

export interface InventoryProjectedLayoutStock {
  stockSistema: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  cantidadTransito: number;
  hasCentralBalance: boolean;
}

export interface RegisterStorageLayoutMovementInput {
  companyId: string;
  lot: StorageLayoutLot;
  previousStock: number;
  nextStock: number;
  context?: StorageLayoutStockMovementContext;
}

export interface InventoryMovementDraft {
  empresaId: string;
  tipoMovimiento: InventoryMovementType;
  documentoOrigen?: string | null;
  moduloOrigen: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  bodegaId: string;
  ubicacionId: string;
  loteId?: string | null;
  lote?: string | null;
  cantidad: number;
  signo: InventoryMovementSign;
  costoUnitario?: number | null;
  saldoResultante: number;
  usuarioId: string;
  observacion?: string | null;
}

export function readInventoryCoreStore(): InventoryCoreStore {
  if (typeof window === 'undefined') {
    return cloneInventoryStore(EMPTY_INVENTORY_CORE_STORE);
  }

  const raw = localStorage.getItem(INVENTORY_CORE_STORAGE_KEY);

  if (!raw) {
    const emptyStore = cloneInventoryStore(EMPTY_INVENTORY_CORE_STORE);
    writeInventoryCoreStore(emptyStore);
    return emptyStore;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InventoryCoreStore>;
    return {
      movements: (parsed.movements ?? []).map((item) => ({ ...item })),
      balances: (parsed.balances ?? []).map((item) => ({ ...item })),
      lots: (parsed.lots ?? []).map((item) => ({ ...item })),
      reservations: (parsed.reservations ?? []).map((item) => ({ ...item })),
    };
  } catch {
    const emptyStore = cloneInventoryStore(EMPTY_INVENTORY_CORE_STORE);
    writeInventoryCoreStore(emptyStore);
    return emptyStore;
  }
}

export function writeInventoryCoreStore(store: InventoryCoreStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(INVENTORY_CORE_STORAGE_KEY, JSON.stringify(store));
}

export function registerInventoryMovementFromStorageLayout(
  input: RegisterStorageLayoutMovementInput,
): InventoryMovement | null {
  if (
    input.context?.registrarMovimiento === false ||
    input.context?.skipInventoryMovement ||
    input.context?.sourceAlreadyRecorded ||
    input.context?.projectionOnly
  ) {
    return null;
  }

  const previousStock = normalizeStock(input.previousStock);
  const nextStock = normalizeStock(input.nextStock);
  const delta = nextStock - previousStock;

  if (delta === 0) {
    return null;
  }

  const store = readInventoryCoreStore();
  const movement = buildMovement({
    empresaId: input.companyId,
    tipoMovimiento: input.context?.tipoMovimiento ?? (delta > 0 ? 'AJUSTE_POS' : 'AJUSTE_NEG'),
    documentoOrigen: input.context?.documentoOrigen ?? null,
    moduloOrigen: input.context?.moduloOrigen ?? 'STORAGE_LAYOUT_COMPAT',
    productoId: input.lot.skuId,
    sku: input.lot.sku,
    productoNombre: input.lot.productoNombre,
    bodegaId: input.lot.bodegaId,
    ubicacionId: input.lot.ubicacionId,
    loteId: input.lot.id,
    lote: input.lot.lote,
    cantidad: Math.abs(delta),
    signo: delta > 0 ? 1 : -1,
    costoUnitario: input.context?.costoUnitario ?? 0,
    saldoResultante: nextStock,
    usuarioId: input.context?.usuarioId ?? 'mock.inventory-core',
    observacion: input.context?.observacion ?? null,
  });
  const nextStore = upsertBalanceAndLot(
    {
      ...store,
      movements: [movement, ...store.movements.map((item) => ({ ...item }))],
    },
    projectStorageLayoutLot(input.companyId, input.lot, nextStock, movement.fechaMovimiento),
  );

  writeInventoryCoreStore(nextStore);
  return movement;
}

export function recordInventoryCoreMovement(draft: InventoryMovementDraft): InventoryMovement {
  const store = readInventoryCoreStore();
  const movement = buildMovement(draft);
  const nextStore = upsertBalanceForMovement(
    {
      ...store,
      movements: [movement, ...store.movements.map((item) => ({ ...item }))],
    },
    movement,
  );

  writeInventoryCoreStore(nextStore);
  return movement;
}

export function upsertInventoryCoreLot(lot: InventoryLot): void {
  const store = readInventoryCoreStore();
  writeInventoryCoreStore({
    ...store,
    lots: [lot, ...store.lots.filter((item) => item.id !== lot.id).map((item) => ({ ...item }))],
  });
}

export function projectStorageLayoutLotsToBalances(
  companyId: string,
  lots: StorageLayoutLot[],
): InventoryBalance[] {
  const store = readInventoryCoreStore();
  const projected = lots
    .filter((item) => item.empresaId === companyId)
    .map((lot) => {
      const balance = projectStorageLayoutLot(companyId, lot, lot.stockSistema, new Date().toISOString()).balance;
      const stored = store.balances.find((item) => item.id === balance.id) ?? null;

      return {
        ...balance,
        cantidadReservada: stored?.cantidadReservada ?? balance.cantidadReservada,
        cantidadTransito: stored?.cantidadTransito ?? balance.cantidadTransito,
        costoUnitario: stored?.costoUnitario ?? balance.costoUnitario,
        fechaUltimoMovimiento: stored?.fechaUltimoMovimiento ?? balance.fechaUltimoMovimiento,
      };
    });
  const projectedIds = new Set(projected.map((item) => item.id));
  const storedOnly = store.balances
    .filter((item) => item.empresaId === companyId && !projectedIds.has(item.id))
    .map((item) => ({ ...item }));

  return [...projected, ...storedOnly].sort((left, right) => {
    if (left.sku !== right.sku) {
      return left.sku.localeCompare(right.sku, 'es-CO');
    }

    return (left.lote ?? '').localeCompare(right.lote ?? '', 'es-CO');
  });
}

export function resolveInventoryProjectedStockForLayoutLot(
  lot: StorageLayoutLot,
): InventoryProjectedLayoutStock {
  const balance = findBalanceForLayoutLot(lot);

  if (!balance) {
    const fallbackStock = normalizeStock(lot.stockSistema);

    return {
      stockSistema: fallbackStock,
      cantidadDisponible: fallbackStock,
      cantidadReservada: 0,
      cantidadTransito: 0,
      hasCentralBalance: false,
    };
  }

  return {
    stockSistema: normalizeStock(balance.cantidadDisponible),
    cantidadDisponible: normalizeStock(balance.cantidadDisponible),
    cantidadReservada: normalizeStock(balance.cantidadReservada),
    cantidadTransito: normalizeStock(balance.cantidadTransito),
    hasCentralBalance: true,
  };
}

export function projectStorageLayoutLotWithInventoryCore(lot: StorageLayoutLot): StorageLayoutLot {
  const projected = resolveInventoryProjectedStockForLayoutLot(lot);

  return {
    ...lot,
    stockSistema: projected.stockSistema,
  };
}

function buildMovement(draft: InventoryMovementDraft): InventoryMovement {
  const quantity = Math.max(0, Math.round(draft.cantidad));
  const unitCost = Number(draft.costoUnitario ?? 0);

  return {
    id: `mov-${draft.empresaId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    empresaId: draft.empresaId,
    fechaMovimiento: new Date().toISOString(),
    tipoMovimiento: draft.tipoMovimiento,
    documentoOrigen: draft.documentoOrigen ?? null,
    moduloOrigen: draft.moduloOrigen,
    productoId: draft.productoId,
    sku: draft.sku,
    productoNombre: draft.productoNombre,
    bodegaId: draft.bodegaId,
    ubicacionId: draft.ubicacionId,
    loteId: draft.loteId ?? null,
    lote: draft.lote ?? null,
    cantidad: quantity,
    signo: draft.signo,
    costoUnitario: unitCost,
    costoTotal: Number((quantity * unitCost).toFixed(2)),
    saldoResultante: normalizeStock(draft.saldoResultante),
    usuarioId: draft.usuarioId,
    observacion: draft.observacion?.trim() || null,
  };
}

function upsertBalanceForMovement(
  store: InventoryCoreStore,
  movement: InventoryMovement,
): InventoryCoreStore {
  const current = store.balances.find((item) => item.id === buildBalanceId(movement)) ?? null;
  const nextBalance: InventoryBalance = {
    id: buildBalanceId(movement),
    empresaId: movement.empresaId,
    productoId: movement.productoId,
    sku: movement.sku,
    bodegaId: movement.bodegaId,
    ubicacionId: movement.ubicacionId,
    loteId: movement.loteId,
    lote: movement.lote,
    cantidadDisponible: normalizeStock(movement.saldoResultante),
    cantidadReservada: current?.cantidadReservada ?? 0,
    cantidadTransito: current?.cantidadTransito ?? 0,
    costoUnitario: movement.costoUnitario,
    fechaUltimoMovimiento: movement.fechaMovimiento,
  };

  return {
    ...store,
    balances: [
      nextBalance,
      ...store.balances.filter((item) => item.id !== nextBalance.id).map((item) => ({ ...item })),
    ],
  };
}

function upsertBalanceAndLot(
  store: InventoryCoreStore,
  projection: { balance: InventoryBalance; lot: InventoryLot },
): InventoryCoreStore {
  const current = store.balances.find((item) => item.id === projection.balance.id) ?? null;
  const nextBalance: InventoryBalance = {
    ...projection.balance,
    cantidadReservada: current?.cantidadReservada ?? projection.balance.cantidadReservada,
    cantidadTransito: current?.cantidadTransito ?? projection.balance.cantidadTransito,
    costoUnitario: current?.costoUnitario ?? projection.balance.costoUnitario,
  };

  return {
    ...store,
    balances: [
      nextBalance,
      ...store.balances.filter((item) => item.id !== nextBalance.id).map((item) => ({ ...item })),
    ],
    lots: [
      projection.lot,
      ...store.lots.filter((item) => item.id !== projection.lot.id).map((item) => ({ ...item })),
    ],
  };
}

function projectStorageLayoutLot(
  companyId: string,
  lot: StorageLayoutLot,
  stock: number,
  movementDate: string,
): { balance: InventoryBalance; lot: InventoryLot } {
  const balance: InventoryBalance = {
    id: `${companyId}|${lot.skuId}|${lot.bodegaId}|${lot.ubicacionId}|${lot.id}`,
    empresaId: companyId,
    productoId: lot.skuId,
    sku: lot.sku,
    bodegaId: lot.bodegaId,
    ubicacionId: lot.ubicacionId,
    loteId: lot.id,
    lote: lot.lote,
    cantidadDisponible: normalizeStock(stock),
    cantidadReservada: 0,
    cantidadTransito: 0,
    costoUnitario: 0,
    fechaUltimoMovimiento: movementDate,
  };
  const inventoryLot: InventoryLot = {
    id: lot.id,
    empresaId: companyId,
    productoId: lot.skuId,
    sku: lot.sku,
    numeroLote: lot.lote,
    fechaFabricacion: null,
    fechaVencimiento: lot.fechaVencimiento,
    estado: mapStorageLotStatus(lot.estado),
    proveedorId: null,
    ordenProduccionId: null,
  };

  return { balance, lot: inventoryLot };
}

function buildBalanceId(movement: InventoryMovement): string {
  return `${movement.empresaId}|${movement.productoId}|${movement.bodegaId}|${movement.ubicacionId}|${movement.loteId ?? 'SIN_LOTE'}`;
}

function findBalanceForLayoutLot(lot: StorageLayoutLot): InventoryBalance | null {
  const balanceId = `${lot.empresaId}|${lot.skuId}|${lot.bodegaId}|${lot.ubicacionId}|${lot.id}`;

  return readInventoryCoreStore().balances.find((item) => item.id === balanceId) ?? null;
}

function mapStorageLotStatus(status: StorageLayoutLot['estado']): InventoryLotStatus {
  if (status === 'VENCIDO') {
    return 'RETENIDO';
  }

  return 'LIBERADO';
}

function normalizeStock(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function cloneInventoryStore(store: InventoryCoreStore): InventoryCoreStore {
  return {
    movements: store.movements.map((item) => ({ ...item })),
    balances: store.balances.map((item) => ({ ...item })),
    lots: store.lots.map((item) => ({ ...item })),
    reservations: store.reservations.map((item) => ({ ...item })),
  };
}
