import {
  DeliveryCatalogs,
  DeliveryOrder,
} from '../../domain/models/delivery.model';

export interface DeliveryMockStore {
  deliveries: DeliveryOrder[];
}

export const DELIVERY_CATALOGS: DeliveryCatalogs = {
  routes: [
    { id: 'route-arb-norte', name: 'Ruta Norte Medellin' },
    { id: 'route-arb-sur', name: 'Ruta Sur Cafetera' },
    { id: 'route-arb-bogota', name: 'Ruta Bogota Supermercados' },
  ],
  drivers: [
    { id: 'driver-arb-001', name: 'Jorge Salazar' },
    { id: 'driver-arb-002', name: 'Marta Cardenas' },
  ],
  vehicles: [
    { id: 'vehicle-arb-001', name: 'Furgon refrigerado ARB-241' },
    { id: 'vehicle-arb-002', name: 'Camion liviano ARB-318' },
  ],
};

export const INITIAL_DELIVERY_STORE: DeliveryMockStore = {
  deliveries: [
    {
      orderId: 'order-arb-005',
      companyId: 'medussa-holding',
      customerId: 'cli-ret-004',
      customerName: 'Tiendas El Faro S.A.S.',
      driverId: 'driver-arb-001',
      driverName: 'Jorge Salazar',
      routeId: 'route-arb-norte',
      routeName: 'Ruta Norte Medellin',
      vehicleId: 'vehicle-arb-001',
      vehicleName: 'Furgon refrigerado ARB-241',
      orderStatus: 'EN_RUTA',
      deliveryDate: '2026-05-15',
      deliveredAt: null,
      comments: null,
      signatureBase64: null,
      photoBase64: null,
      gpsLatitude: 6.2442,
      gpsLongitude: -75.5812,
      deliveredByUserId: null,
      details: [
        {
          productId: 'prod-arb-003',
          sku: 'ARB-UHT-1L',
          productName: 'Leche entera UHT 1L',
          orderedQuantity: 20,
          pendingQuantity: 20,
          deliveredQuantity: 0,
          unit: 'UND',
        },
      ],
      trace: [
        {
          status: 'EN_RUTA',
          description: 'Orden cargada al vehiculo y enviada a ruta.',
          occurredAt: '2026-05-15T07:20:00-05:00',
          user: 'mock-logistica',
        },
      ],
    },
    {
      orderId: 'order-arb-007',
      companyId: 'medussa-holding',
      customerId: 'cli-ret-005',
      customerName: 'Supermercados Brisa Norte S.A.S.',
      driverId: 'driver-arb-002',
      driverName: 'Marta Cardenas',
      routeId: 'route-arb-bogota',
      routeName: 'Ruta Bogota Supermercados',
      vehicleId: 'vehicle-arb-002',
      vehicleName: 'Camion liviano ARB-318',
      orderStatus: 'EN_RUTA',
      deliveryDate: '2026-05-15',
      deliveredAt: null,
      comments: 'Entrega con firma pendiente.',
      signatureBase64: null,
      photoBase64: null,
      gpsLatitude: 4.711,
      gpsLongitude: -74.0721,
      deliveredByUserId: null,
      details: [
        {
          productId: 'prod-arb-001',
          sku: 'ARB-YOG-200-FR',
          productName: 'Yogurt bebible fresa 200 ml',
          orderedQuantity: 36,
          pendingQuantity: 36,
          deliveredQuantity: 0,
          unit: 'UND',
        },
        {
          productId: 'prod-arb-002',
          sku: 'ARB-QUE-500',
          productName: 'Queso campesino 500 g',
          orderedQuantity: 12,
          pendingQuantity: 12,
          deliveredQuantity: 0,
          unit: 'UND',
        },
      ],
      trace: [
        {
          status: 'EN_RUTA',
          description: 'Salida confirmada desde muelle refrigerado.',
          occurredAt: '2026-05-15T07:45:00-05:00',
          user: 'mock-logistica',
        },
      ],
    },
    {
      orderId: 'order-arb-006',
      companyId: 'medussa-holding',
      customerId: 'cli-ret-006',
      customerName: 'Distribuidora Cafetera del Sur',
      driverId: 'driver-arb-001',
      driverName: 'Jorge Salazar',
      routeId: 'route-arb-sur',
      routeName: 'Ruta Sur Cafetera',
      vehicleId: 'vehicle-arb-001',
      vehicleName: 'Furgon refrigerado ARB-241',
      orderStatus: 'PARCIALMENTE_SURTIDA',
      deliveryDate: '2026-05-14',
      deliveredAt: '2026-05-14T15:35:00-05:00',
      comments: 'Cliente recibio parcial por diferencia de queso campesino.',
      signatureBase64: 'data:text/plain;base64,ZmlybWEtbW9jay1wYXJjaWFs',
      photoBase64: 'data:text/plain;base64,ZXZpZGVuY2lhLW1vY2s=',
      gpsLatitude: 5.0703,
      gpsLongitude: -75.5138,
      deliveredByUserId: 'mock-logistica',
      details: [
        {
          productId: 'prod-arb-002',
          sku: 'ARB-QUE-500',
          productName: 'Queso campesino 500 g',
          orderedQuantity: 8,
          pendingQuantity: 8,
          deliveredQuantity: 4,
          unit: 'UND',
        },
      ],
      trace: [
        {
          status: 'EN_RUTA',
          description: 'Orden enviada a ruta.',
          occurredAt: '2026-05-14T07:10:00-05:00',
          user: 'mock-logistica',
        },
        {
          status: 'PARCIALMENTE_SURTIDA',
          description: 'Entrega parcial registrada con firma y evidencia mock.',
          occurredAt: '2026-05-14T15:35:00-05:00',
          user: 'mock-logistica',
        },
      ],
    },
  ],
};
