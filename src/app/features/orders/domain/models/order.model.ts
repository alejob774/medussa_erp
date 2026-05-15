export type OrderStatus =
  | 'CREADA'
  | 'RECHAZADA'
  | 'ENVIADA'
  | 'RECIBIDA'
  | 'EN_ALISTAMIENTO'
  | 'PARCIALMENTE_SURTIDA'
  | 'EN_PRODUCCION_COMPRA'
  | 'LISTA_PARA_DESPACHO'
  | 'EN_RUTA'
  | 'ENTREGADA';

export type OrderPriority = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type OrderType = 'NORMAL' | 'PROMOCIONAL' | 'REPOSICION' | 'CREDITO';

export type OrderChannel = 'WEB' | 'CAMPO' | 'TELEFONICO' | 'WHATSAPP' | 'MAYORISTA';

export type OrderPaymentCondition = 'CONTADO' | 'CREDITO_8_DIAS' | 'CREDITO_15_DIAS' | 'CREDITO_30_DIAS';

export type CustomerCommercialStatus = 'ACTIVO' | 'RESTRINGIDO' | 'INACTIVO';

export type OrderStockStatus = 'DISPONIBLE' | 'BAJO_STOCK' | 'SIN_STOCK';

export interface OrderInventoryAvailability {
  productId: string;
  sku: string;
  productName: string;
  presentation: string;
  unit: string;
  availableStock: number;
  unitPrice: number;
  stockStatus: OrderStockStatus;
}

export interface OrderDetail {
  productId: string;
  sku: string;
  productName: string;
  presentation: string;
  unit: string;
  quantity: number;
  availableStock: number;
  unitPrice: number;
  lineTotal: number;
  stockStatus: OrderStockStatus;
  promisedLater: boolean;
}

export interface Order {
  id: string;
  localUuid: string;
  backendId?: string | null;
  companyId: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  orderNumber: string;
  backendOrderNumber?: string | null;
  orderDate: string;
  requestedDeliveryDate: string;
  orderType: OrderType;
  salesChannel: OrderChannel;
  priority: OrderPriority;
  paymentCondition: OrderPaymentCondition;
  status: OrderStatus;
  details: OrderDetail[];
  subtotal: number;
  tax: number;
  total: number;
  reserveInventory: boolean;
  createdOffline: boolean;
  synced: boolean;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  trace: OrderTrace[];
}

export interface OrderTrace {
  status: OrderStatus;
  description: string;
  occurredAt: string;
  user: string;
}

export interface OrderConsolidatedLine {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  availableStock: number;
  promisedLater: boolean;
}

export interface OrderSyncResult {
  synced: number;
  rejected: number;
  orders: Order[];
  consolidatedLines: OrderConsolidatedLine[];
  message: string;
}

export interface OrderCustomerOption {
  id: string;
  name: string;
  commercialName?: string | null;
  status: CustomerCommercialStatus;
  restrictionReason?: string | null;
}

export interface OrderSellerOption {
  id: string;
  name: string;
}

export interface OrderCatalogs {
  customers: OrderCustomerOption[];
  sellers: OrderSellerOption[];
  products: OrderInventoryAvailability[];
}

export interface SaveOrderPayload {
  customerId: string;
  sellerId: string;
  orderDate: string;
  requestedDeliveryDate: string;
  orderType: OrderType;
  salesChannel: OrderChannel;
  priority: OrderPriority;
  paymentCondition: OrderPaymentCondition;
  details: OrderDetail[];
  reserveInventory: boolean;
}

export interface OrderListFilters {
  status?: OrderStatus | 'TODOS' | null;
  customerId?: string | null;
}

export const ORDER_STATUSES: OrderStatus[] = [
  'CREADA',
  'RECHAZADA',
  'ENVIADA',
  'RECIBIDA',
  'EN_ALISTAMIENTO',
  'PARCIALMENTE_SURTIDA',
  'EN_PRODUCCION_COMPRA',
  'LISTA_PARA_DESPACHO',
  'EN_RUTA',
  'ENTREGADA',
];

export const ORDER_STORAGE_KEY = 'medussa.erp.mock.orders.hu018';
