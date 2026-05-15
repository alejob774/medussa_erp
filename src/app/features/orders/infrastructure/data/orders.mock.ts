import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import {
  Order,
  OrderCatalogs,
  OrderInventoryAvailability,
  OrderStockStatus,
} from '../../domain/models/order.model';

export interface OrderMockStore {
  lastInventorySyncAt: string | null;
  inventory: OrderInventoryAvailability[];
  orders: Order[];
}

const COMPANY_ID = 'medussa-holding';
const COMPANY_NAME = 'Industrias Alimenticias El Arbolito';

export const INITIAL_ORDER_INVENTORY: OrderInventoryAvailability[] =
  INITIAL_PRODUCTS_STORE.products
    .filter((product) => product.empresaId === COMPANY_ID && product.familia === 'Producto terminado')
    .map((product, index) => {
      const stockByIndex = [420, 18, 0, 145, 62];
      const availableStock = stockByIndex[index] ?? 36;

      return {
        productId: product.id,
        sku: product.sku,
        productName: product.nombre,
        presentation: product.referencia ?? product.descripcion,
        unit: product.unidadBase,
        availableStock,
        unitPrice: product.precioBruto ?? 0,
        stockStatus: resolveStockStatus(availableStock),
      };
    });

export const ORDER_CATALOGS: OrderCatalogs = {
  customers: [
    ...INITIAL_CLIENTS_STORE.clients
      .filter((client) => client.empresaId === COMPANY_ID)
      .slice(0, 8)
      .map((client) => ({
        id: client.id,
        name: client.nombre,
        commercialName: client.nombreComercial,
        status: client.estado === 'ACTIVO' ? ('ACTIVO' as const) : ('RESTRINGIDO' as const),
        restrictionReason:
          client.estado === 'ACTIVO' ? null : 'Cliente inactivo/restringido para toma de pedidos.',
      })),
    {
      id: 'cli-arb-restringido-001',
      name: 'Minimercado La Colina',
      commercialName: 'La Colina',
      status: 'RESTRINGIDO',
      restrictionReason: 'Cupo vencido y cartera en revision comercial.',
    },
  ],
  sellers: [
    { id: 'seller-arb-001', name: 'Natalia Rojas - Canal tradicional' },
    { id: 'seller-arb-002', name: 'Camilo Herrera - Mayoristas' },
    { id: 'seller-arb-003', name: 'Paula Medina - Supermercados' },
  ],
  products: INITIAL_ORDER_INVENTORY,
};

export const INITIAL_ORDER_STORE: OrderMockStore = {
  lastInventorySyncAt: '2026-05-14T08:00:00-05:00',
  inventory: INITIAL_ORDER_INVENTORY,
  orders: [
    buildOrder({
      id: 'order-arb-001',
      localUuid: 'local-order-arb-001',
      customerId: 'cli-ret-004',
      customerName: 'Tiendas El Faro S.A.S.',
      sellerId: 'seller-arb-001',
      sellerName: 'Natalia Rojas - Canal tradicional',
      orderNumber: 'PED-LOCAL-0001',
      requestedDeliveryDate: '2026-05-16',
      status: 'CREADA',
      details: [
        buildDetail('prod-arb-001', 24),
        buildDetail('prod-arb-003', 12),
      ],
      synced: false,
      createdOffline: true,
    }),
    buildOrder({
      id: 'order-arb-002',
      localUuid: 'local-order-arb-002',
      customerId: 'cli-ret-005',
      customerName: 'Supermercados Brisa Norte S.A.S.',
      sellerId: 'seller-arb-003',
      sellerName: 'Paula Medina - Supermercados',
      orderNumber: 'PED-LOCAL-0002',
      requestedDeliveryDate: '2026-05-16',
      status: 'ENVIADA',
      details: [
        buildDetail('prod-arb-001', 72),
        buildDetail('prod-arb-002', 16),
      ],
      synced: true,
      createdOffline: false,
    }),
    buildOrder({
      id: 'order-arb-003',
      localUuid: 'local-order-arb-003',
      customerId: 'cli-ret-006',
      customerName: 'Distribuidora Cafetera del Sur',
      sellerId: 'seller-arb-002',
      sellerName: 'Camilo Herrera - Mayoristas',
      orderNumber: 'PED-LOCAL-0003',
      requestedDeliveryDate: '2026-05-17',
      status: 'EN_ALISTAMIENTO',
      details: [
        buildDetail('prod-arb-003', 48),
      ],
      synced: true,
      createdOffline: false,
    }),
    buildOrder({
      id: 'order-arb-004',
      localUuid: 'local-order-arb-004',
      customerId: 'cli-ret-002',
      customerName: 'Mercados del Norte S.A.',
      sellerId: 'seller-arb-003',
      sellerName: 'Paula Medina - Supermercados',
      orderNumber: 'PED-LOCAL-0004',
      requestedDeliveryDate: '2026-05-15',
      status: 'LISTA_PARA_DESPACHO',
      details: [
        buildDetail('prod-arb-001', 36),
        buildDetail('prod-arb-002', 12),
      ],
      synced: true,
      createdOffline: false,
    }),
    buildOrder({
      id: 'order-arb-005',
      localUuid: 'local-order-arb-005',
      customerId: 'cli-ret-004',
      customerName: 'Tiendas El Faro S.A.S.',
      sellerId: 'seller-arb-001',
      sellerName: 'Natalia Rojas - Canal tradicional',
      orderNumber: 'PED-LOCAL-0005',
      requestedDeliveryDate: '2026-05-15',
      status: 'EN_RUTA',
      details: [
        buildDetail('prod-arb-003', 20),
      ],
      synced: true,
      createdOffline: false,
    }),
    buildOrder({
      id: 'order-arb-006',
      localUuid: 'local-order-arb-006',
      customerId: 'cli-ret-006',
      customerName: 'Distribuidora Cafetera del Sur',
      sellerId: 'seller-arb-002',
      sellerName: 'Camilo Herrera - Mayoristas',
      orderNumber: 'PED-LOCAL-0006',
      requestedDeliveryDate: '2026-05-15',
      status: 'PARCIALMENTE_SURTIDA',
      details: [
        buildDetail('prod-arb-002', 8),
        buildDetail('prod-arb-001', 12),
      ],
      synced: true,
      createdOffline: false,
    }),
  ],
};

function buildOrder(input: Pick<Order, 'id' | 'localUuid' | 'customerId' | 'customerName' | 'sellerId' | 'sellerName' | 'orderNumber' | 'requestedDeliveryDate' | 'status' | 'details' | 'synced' | 'createdOffline'>): Order {
  const subtotal = input.details.reduce((total, detail) => total + detail.lineTotal, 0);
  const tax = Math.round(subtotal * 0.19);
  const now = '2026-05-14T08:30:00-05:00';

  return {
    ...input,
    backendId: input.synced ? input.id.replace('order', 'backend-order') : null,
    companyId: COMPANY_ID,
    backendOrderNumber: input.synced ? input.orderNumber.replace('LOCAL', 'API') : null,
    orderDate: '2026-05-14',
    orderType: 'NORMAL',
    salesChannel: 'CAMPO',
    priority: 'NORMAL',
    paymentCondition: 'CREDITO_15_DIAS',
    subtotal,
    tax,
    total: subtotal + tax,
    reserveInventory: true,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
    trace: [
      {
        status: input.status,
        description: `Pedido ${input.status.toLowerCase().replace(/_/g, ' ')} en mock HU-018.`,
        occurredAt: now,
        user: 'mock-ventas',
      },
    ],
  };
}

function buildDetail(productId: string, quantity: number) {
  const product = INITIAL_ORDER_INVENTORY.find((item) => item.productId === productId) ?? INITIAL_ORDER_INVENTORY[0];

  return {
    productId: product.productId,
    sku: product.sku,
    productName: product.productName,
    presentation: product.presentation,
    unit: product.unit,
    quantity,
    availableStock: product.availableStock,
    unitPrice: product.unitPrice,
    lineTotal: quantity * product.unitPrice,
    stockStatus: product.stockStatus,
    promisedLater: product.availableStock < quantity,
  };
}

function resolveStockStatus(availableStock: number): OrderStockStatus {
  if (availableStock <= 0) {
    return 'SIN_STOCK';
  }

  if (availableStock <= 24) {
    return 'BAJO_STOCK';
  }

  return 'DISPONIBLE';
}

export function resolveCompanyName(companyId: string): string {
  return companyId === COMPANY_ID ? COMPANY_NAME : 'Empresa activa';
}
