import { InventoryMovement, InventoryMovementType } from '../../../inventory-core/domain/models/inventory-movement.model';
import { Product } from '../../../products/domain/models/product.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { CostMovement, CostMovementFilters } from '../../domain/models/cost-movement.model';
import { CostsCoreStore, EMPTY_COSTS_CORE_STORE } from '../../domain/models/costs-core-store.model';
import { ProductCost } from '../../domain/models/product-cost.model';
import { ProductionOrderCost } from '../../domain/models/production-order-cost.model';
import { ProductMargin, SalesCost } from '../../domain/models/sales-cost.model';
import { ProductCostLookup } from '../../domain/repositories/costs-core.repository';

export const COSTS_CORE_STORAGE_KEY = 'medussa.erp.mock.costs-core';

const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const ECONOMIC_MOVEMENT_TYPES: InventoryMovementType[] = [
  'COMPRA_RECEPCION',
  'DESPACHO_VENTA',
  'CONSUMO_MP',
  'INGRESO_PT',
  'AJUSTE_POS',
  'AJUSTE_NEG',
  'MERMA_CALIDAD',
  'CONSUMO_REPUESTO_TPM',
  'DEVOLUCION',
];
const AVERAGE_COST_INPUT_TYPES: InventoryMovementType[] = [
  'COMPRA_RECEPCION',
  'INGRESO_PT',
  'AJUSTE_POS',
  'DEVOLUCION',
];

export function readCostsCoreStore(): CostsCoreStore {
  if (typeof window === 'undefined') {
    return cloneCostsStore(EMPTY_COSTS_CORE_STORE);
  }

  const raw = localStorage.getItem(COSTS_CORE_STORAGE_KEY);

  if (!raw) {
    const emptyStore = cloneCostsStore(EMPTY_COSTS_CORE_STORE);
    writeCostsCoreStore(emptyStore);
    return emptyStore;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CostsCoreStore>;
    return {
      productCosts: (parsed.productCosts ?? []).map((item) => ({ ...item })),
      costMovements: (parsed.costMovements ?? []).map((item) => ({ ...item })),
      productionOrderCosts: (parsed.productionOrderCosts ?? []).map((item) => ({ ...item })),
      salesCosts: (parsed.salesCosts ?? []).map((item) => ({ ...item })),
    };
  } catch {
    const emptyStore = cloneCostsStore(EMPTY_COSTS_CORE_STORE);
    writeCostsCoreStore(emptyStore);
    return emptyStore;
  }
}

export function writeCostsCoreStore(store: CostsCoreStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(COSTS_CORE_STORAGE_KEY, JSON.stringify(store));
}

export function getCurrentProductCostFromStore(
  companyId: string,
  lookup: ProductCostLookup,
): ProductCost | null {
  const store = readCostsCoreStore();
  const current = findProductCost(store, companyId, lookup);

  if (current) {
    return { ...current };
  }

  const product = findProduct(companyId, lookup);

  if (!product) {
    return null;
  }

  const seeded = buildInitialProductCost(companyId, {
    productoId: product.id,
    sku: product.sku,
    productoNombre: product.nombre,
    fuenteUltimoCosto: 'MOCK_PRODUCT_CATALOG',
    costoUnitario: resolveMockUnitCost(product),
  });
  writeCostsCoreStore(upsertProductCost(store, seeded));

  return { ...seeded };
}

export function getCostMovementsFromStore(
  companyId: string,
  filters: CostMovementFilters,
): CostMovement[] {
  return readCostsCoreStore().costMovements
    .filter((item) => item.empresaId === companyId)
    .filter((item) => matchesCostMovementFilters(item, filters))
    .sort((left, right) => Date.parse(right.fecha) - Date.parse(left.fecha))
    .map((item) => ({ ...item }));
}

export function registerCostFromInventoryMovement(
  movement: InventoryMovement,
): CostMovement | null {
  if (!ECONOMIC_MOVEMENT_TYPES.includes(movement.tipoMovimiento)) {
    return null;
  }

  let store = readCostsCoreStore();
  const existing = store.costMovements.find((item) => item.inventoryMovementId === movement.id) ?? null;

  if (existing) {
    return { ...existing };
  }

  const product = findProduct(movement.empresaId, {
    productId: movement.productoId,
    sku: movement.sku,
  });
  const currentCost =
    findProductCost(store, movement.empresaId, {
      productId: movement.productoId,
      sku: movement.sku,
    }) ??
    buildInitialProductCost(movement.empresaId, {
      productoId: movement.productoId,
      sku: movement.sku,
      productoNombre: movement.productoNombre,
      fuenteUltimoCosto: 'MOCK_INITIAL_COST',
      costoUnitario: resolveMockUnitCost(product) || movement.costoUnitario,
    });
  const unitCost = resolveMovementUnitCost(movement, currentCost, product);
  const quantity = Math.max(0, Math.round(movement.cantidad));
  const costMovement: CostMovement = {
    id: `cost-mov-${movement.id}`,
    empresaId: movement.empresaId,
    inventoryMovementId: movement.id,
    productoId: movement.productoId,
    sku: movement.sku,
    productoNombre: movement.productoNombre,
    cantidad: quantity,
    signo: movement.signo,
    costoUnitario: unitCost,
    costoTotal: roundMoney(quantity * unitCost * movement.signo),
    tipoOrigen: movement.tipoMovimiento,
    moduloOrigen: movement.moduloOrigen,
    documentoOrigen: movement.documentoOrigen,
    metodoCosto: currentCost.metodoCosto,
    fecha: movement.fechaMovimiento,
  };

  store = {
    ...upsertProductCost(store, currentCost),
    costMovements: [costMovement, ...store.costMovements.map((item) => ({ ...item }))],
  };

  if (AVERAGE_COST_INPUT_TYPES.includes(movement.tipoMovimiento)) {
    store = recalculateAverageCostInStore(store, movement.empresaId, movement.productoId);
  }

  if (movement.tipoMovimiento === 'DESPACHO_VENTA') {
    store = upsertSalesCost(store, buildSalesCost(movement, costMovement, product));
  }

  writeCostsCoreStore(store);
  return { ...costMovement };
}

export function recalculateAverageProductCost(
  companyId: string,
  productId: string,
): ProductCost | null {
  const store = readCostsCoreStore();
  const recalculated = recalculateAverageCostInStore(store, companyId, productId);
  const productCost = recalculated.productCosts.find(
    (item) => item.empresaId === companyId && item.productoId === productId,
  ) ?? null;

  writeCostsCoreStore(recalculated);
  return productCost ? { ...productCost } : null;
}

export function getProductionOrderCostFromStore(
  companyId: string,
  opId: string,
): ProductionOrderCost | null {
  return readCostsCoreStore().productionOrderCosts.find(
    (item) => item.empresaId === companyId && item.opId === opId,
  ) ?? null;
}

export function getProductMarginFromStore(
  companyId: string,
  productId: string,
): ProductMargin | null {
  const sales = readCostsCoreStore().salesCosts.filter(
    (item) => item.empresaId === companyId && item.productoId === productId,
  );

  if (!sales.length) {
    return null;
  }

  const totals = sales.reduce(
    (acc, item) => ({
      cantidadVendida: acc.cantidadVendida + item.cantidad,
      ventas: acc.ventas + item.precioVenta * item.cantidad,
      costoVentas: acc.costoVentas + item.costoTotal,
    }),
    { cantidadVendida: 0, ventas: 0, costoVentas: 0 },
  );
  const margin = totals.ventas - totals.costoVentas;

  return {
    empresaId: companyId,
    productoId: productId,
    sku: sales[0].sku,
    productoNombre: sales[0].productoNombre,
    cantidadVendida: totals.cantidadVendida,
    ventas: roundMoney(totals.ventas),
    costoVentas: roundMoney(totals.costoVentas),
    margen: roundMoney(margin),
    margenPct: totals.ventas ? roundMoney((margin / totals.ventas) * 100) : 0,
  };
}

function recalculateAverageCostInStore(
  store: CostsCoreStore,
  companyId: string,
  productId: string,
): CostsCoreStore {
  const current = store.productCosts.find(
    (item) => item.empresaId === companyId && item.productoId === productId,
  ) ?? null;

  if (!current) {
    return store;
  }

  const inputMovements = store.costMovements.filter(
    (item) =>
      item.empresaId === companyId &&
      item.productoId === productId &&
      AVERAGE_COST_INPUT_TYPES.includes(item.tipoOrigen) &&
      item.cantidad > 0 &&
      item.costoUnitario > 0,
  );

  if (!inputMovements.length) {
    return store;
  }

  const totals = inputMovements.reduce(
    (acc, item) => ({
      quantity: acc.quantity + item.cantidad,
      value: acc.value + item.cantidad * item.costoUnitario,
    }),
    { quantity: 0, value: 0 },
  );
  const nextCost: ProductCost = {
    ...current,
    metodoCosto: 'PROMEDIO',
    costoActual: totals.quantity ? roundMoney(totals.value / totals.quantity) : current.costoActual,
    fechaActualizacion: new Date().toISOString(),
    fuenteUltimoCosto: 'INVENTORY_MOVEMENTS_AVERAGE',
  };

  return upsertProductCost(store, nextCost);
}

function buildInitialProductCost(
  companyId: string,
  input: {
    productoId: string;
    sku: string;
    productoNombre: string;
    fuenteUltimoCosto: string;
    costoUnitario: number;
  },
): ProductCost {
  return {
    id: `${companyId}|${input.productoId}`,
    empresaId: companyId,
    productoId: input.productoId,
    sku: input.sku,
    productoNombre: input.productoNombre,
    metodoCosto: 'PROMEDIO',
    costoActual: roundMoney(input.costoUnitario),
    fechaActualizacion: new Date().toISOString(),
    fuenteUltimoCosto: input.fuenteUltimoCosto,
  };
}

function buildSalesCost(
  movement: InventoryMovement,
  costMovement: CostMovement,
  product: Product | null,
): SalesCost {
  const price = roundMoney(product?.precioNeto ?? product?.precioBruto ?? 0);
  const costTotal = Math.abs(costMovement.costoTotal);
  const salesTotal = price * costMovement.cantidad;
  const margin = salesTotal - costTotal;

  return {
    id: `sales-cost-${movement.id}`,
    empresaId: movement.empresaId,
    facturaId: null,
    pedidoId: movement.documentoOrigen,
    productoId: movement.productoId,
    sku: movement.sku,
    productoNombre: movement.productoNombre,
    cantidad: costMovement.cantidad,
    costoUnitario: costMovement.costoUnitario,
    costoTotal: roundMoney(costTotal),
    precioVenta: price,
    margen: roundMoney(margin),
    margenPct: salesTotal ? roundMoney((margin / salesTotal) * 100) : 0,
    fecha: movement.fechaMovimiento,
  };
}

function upsertSalesCost(store: CostsCoreStore, salesCost: SalesCost): CostsCoreStore {
  return {
    ...store,
    salesCosts: [
      salesCost,
      ...store.salesCosts.filter((item) => item.id !== salesCost.id).map((item) => ({ ...item })),
    ],
  };
}

function resolveMovementUnitCost(
  movement: InventoryMovement,
  currentCost: ProductCost,
  product: Product | null,
): number {
  if (movement.costoUnitario > 0) {
    return roundMoney(movement.costoUnitario);
  }

  if (currentCost.costoActual > 0) {
    return roundMoney(currentCost.costoActual);
  }

  return roundMoney(resolveMockUnitCost(product));
}

function resolveMockUnitCost(product: Product | null): number {
  if (!product) {
    return 0;
  }

  const catalogPrice = product.precioNeto ?? product.precioBruto ?? 0;

  if (product.familia === 'Producto terminado') {
    return roundMoney(catalogPrice * 0.62);
  }

  return roundMoney(catalogPrice);
}

function findProductCost(
  store: CostsCoreStore,
  companyId: string,
  lookup: ProductCostLookup,
): ProductCost | null {
  return store.productCosts.find(
    (item) =>
      item.empresaId === companyId &&
      (!!lookup.productId ? item.productoId === lookup.productId : true) &&
      (!!lookup.sku ? item.sku === lookup.sku : true),
  ) ?? null;
}

function findProduct(companyId: string, lookup: ProductCostLookup): Product | null {
  return readCompanyProducts(companyId).find(
    (item) =>
      (!!lookup.productId ? item.id === lookup.productId : true) &&
      (!!lookup.sku ? item.sku === lookup.sku : true),
  ) ?? null;
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

function matchesCostMovementFilters(movement: CostMovement, filters: CostMovementFilters): boolean {
  return (
    (!filters.productoId || movement.productoId === filters.productoId) &&
    (!filters.sku || movement.sku === filters.sku) &&
    (!filters.moduloOrigen || movement.moduloOrigen === filters.moduloOrigen) &&
    (!filters.tipoOrigen || filters.tipoOrigen === 'TODOS' || movement.tipoOrigen === filters.tipoOrigen) &&
    (!filters.fechaDesde || movement.fecha.slice(0, 10) >= filters.fechaDesde) &&
    (!filters.fechaHasta || movement.fecha.slice(0, 10) <= filters.fechaHasta)
  );
}

function upsertProductCost(store: CostsCoreStore, productCost: ProductCost): CostsCoreStore {
  return {
    ...store,
    productCosts: [
      productCost,
      ...store.productCosts.filter((item) => item.id !== productCost.id).map((item) => ({ ...item })),
    ],
  };
}

function roundMoney(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function cloneCostsStore(store: CostsCoreStore): CostsCoreStore {
  return {
    productCosts: store.productCosts.map((item) => ({ ...item })),
    costMovements: store.costMovements.map((item) => ({ ...item })),
    productionOrderCosts: store.productionOrderCosts.map((item) => ({ ...item })),
    salesCosts: store.salesCosts.map((item) => ({ ...item })),
  };
}
