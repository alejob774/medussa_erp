export type DeliveryStatus =
  | 'EN_RUTA'
  | 'ENTREGADA'
  | 'PARCIALMENTE_SURTIDA'
  | 'NO_ENTREGADA'
  | 'LISTA_PARA_DESPACHO';

export interface DeliveryDetail {
  productId: string;
  sku: string;
  productName: string;
  orderedQuantity: number;
  pendingQuantity: number;
  deliveredQuantity: number;
  unit: string;
}

export interface DeliveryEvidence {
  signatureBase64: string;
  photoBase64?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  comments?: string | null;
}

export interface DeliveryTrace {
  status: DeliveryStatus;
  description: string;
  occurredAt: string;
  user: string;
}

export interface DeliveryOrder {
  orderId: string;
  companyId: string;
  customerId: string;
  customerName: string;
  driverId: string;
  driverName: string;
  routeId: string;
  routeName: string;
  vehicleId: string;
  vehicleName: string;
  orderStatus: DeliveryStatus;
  deliveryDate: string;
  deliveredAt?: string | null;
  comments?: string | null;
  signatureBase64?: string | null;
  photoBase64?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  deliveredByUserId?: string | null;
  details: DeliveryDetail[];
  trace: DeliveryTrace[];
}

export interface DeliveryConfirmationPayload {
  orderId: string;
  deliveredByUserId: string;
  comments?: string | null;
  signatureBase64: string;
  photoBase64?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  details: Array<{
    productId: string;
    deliveredQuantity: number;
  }>;
}

export interface DeliveryFilters {
  routeId?: string | null;
  driverId?: string | null;
  status?: DeliveryStatus | 'TODOS' | null;
  date?: string | null;
}

export interface DeliveryCatalogs {
  routes: Array<{ id: string; name: string }>;
  drivers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
}

export const DELIVERY_STORAGE_KEY = 'medussa.erp.mock.deliveries.hu019';
