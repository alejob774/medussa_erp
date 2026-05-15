import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  CustomerCommercialStatus,
  Order,
  OrderCatalogs,
  OrderConsolidatedLine,
  OrderDetail,
  OrderInventoryAvailability,
  OrderListFilters,
  ORDER_STORAGE_KEY,
  OrderStockStatus,
  OrderSyncResult,
  SaveOrderPayload,
} from '../../domain/models/order.model';
import { OrderRepository } from '../../domain/repositories/order.repository';
import {
  INITIAL_ORDER_STORE,
  ORDER_CATALOGS,
  OrderMockStore,
} from '../data/orders.mock';

@Injectable({
  providedIn: 'root',
})
export class OrderMockRepository extends OrderRepository {
  getCatalogs(companyId: string): Observable<OrderCatalogs> {
    const store = this.readStore();

    return of({
      customers: ORDER_CATALOGS.customers,
      sellers: ORDER_CATALOGS.sellers,
      products: store.inventory.filter((product) => product.productName),
    }).pipe(delay(120));
  }

  listOrders(companyId: string, filters: OrderListFilters = {}): Observable<Order[]> {
    const orders = this.readStore().orders
      .filter((order) => order.companyId === companyId)
      .filter((order) => !filters.status || filters.status === 'TODOS' || order.status === filters.status)
      .filter((order) => !filters.customerId || order.customerId === filters.customerId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((order) => this.cloneOrder(order));

    return of(orders).pipe(delay(180));
  }

  getInventoryAvailability(companyId: string): Observable<OrderInventoryAvailability[]> {
    const store = this.readStore();
    const nextStore: OrderMockStore = {
      ...store,
      lastInventorySyncAt: new Date().toISOString(),
      inventory: store.inventory.map((item) => ({
        ...item,
        stockStatus: resolveStockStatus(item.availableStock),
      })),
    };

    this.writeStore(nextStore);

    return of(nextStore.inventory.map((item) => ({ ...item }))).pipe(delay(260));
  }

  getCustomerStatus(
    companyId: string,
    customerId: string,
  ): Observable<{ status: CustomerCommercialStatus; reason?: string | null }> {
    const customer = ORDER_CATALOGS.customers.find((item) => item.id === customerId);

    if (!customer) {
      return throwError(() => new Error('No se encontro el cliente solicitado.'));
    }

    return of({
      status: customer.status,
      reason: customer.restrictionReason ?? null,
    }).pipe(delay(100));
  }

  saveOrder(companyId: string, payload: SaveOrderPayload): Observable<Order> {
    const validationError = this.validatePayload(payload);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const customer = ORDER_CATALOGS.customers.find((item) => item.id === payload.customerId);
    const seller = ORDER_CATALOGS.sellers.find((item) => item.id === payload.sellerId);
    const now = new Date().toISOString();
    const subtotal = payload.details.reduce((total, detail) => total + detail.lineTotal, 0);
    const tax = Math.round(subtotal * 0.19);
    const restricted = customer?.status === 'RESTRINGIDO' || customer?.status === 'INACTIVO';
    const order: Order = {
      id: `order-${Date.now()}`,
      localUuid: crypto.randomUUID(),
      backendId: null,
      companyId,
      customerId: payload.customerId,
      customerName: customer?.name ?? 'Cliente sin nombre',
      sellerId: payload.sellerId,
      sellerName: seller?.name ?? 'Vendedor no asignado',
      orderNumber: this.buildOrderNumber(),
      backendOrderNumber: null,
      orderDate: payload.orderDate,
      requestedDeliveryDate: payload.requestedDeliveryDate,
      orderType: payload.orderType,
      salesChannel: payload.salesChannel,
      priority: payload.priority,
      paymentCondition: payload.paymentCondition,
      status: restricted ? 'RECHAZADA' : 'CREADA',
      details: payload.details.map((detail) => ({ ...detail })),
      subtotal,
      tax,
      total: subtotal + tax,
      reserveInventory: payload.reserveInventory,
      createdOffline: true,
      synced: false,
      rejectionReason: restricted
        ? customer?.restrictionReason ?? 'Cliente restringido para toma de pedidos.'
        : null,
      createdAt: now,
      updatedAt: now,
      trace: [
        {
          status: restricted ? 'RECHAZADA' : 'CREADA',
          description: restricted
            ? 'Pedido rechazado por validacion comercial del cliente.'
            : 'Pedido creado localmente en modo mock-first.',
          occurredAt: now,
          user: 'mock-ventas',
        },
      ],
    };
    const store = this.readStore();

    this.writeStore({
      ...store,
      orders: [order, ...store.orders],
    });

    return of(this.cloneOrder(order)).pipe(delay(260));
  }

  sendOrder(companyId: string, localUuid: string): Observable<Order> {
    const store = this.readStore();
    const order = store.orders.find(
      (item) => item.companyId === companyId && item.localUuid === localUuid,
    );

    if (!order) {
      return throwError(() => new Error('No se encontro el pedido local.'));
    }

    if (order.synced || order.status === 'ENVIADA') {
      return of(this.cloneOrder(order)).pipe(delay(120));
    }

    if (order.status === 'RECHAZADA') {
      return throwError(() => new Error('El pedido esta rechazado y no puede enviarse.'));
    }

    const now = new Date().toISOString();
    const nextOrder: Order = {
      ...order,
      backendId: order.backendId ?? `backend-${order.id}`,
      backendOrderNumber: order.backendOrderNumber ?? order.orderNumber.replace('LOCAL', 'API'),
      status: 'ENVIADA',
      synced: true,
      createdOffline: false,
      updatedAt: now,
      trace: [
        {
          status: 'ENVIADA',
          description:
            'Pedido enviado en mock. La reserva queda simulada; backend debe reservar via API Central de Inventarios.',
          occurredAt: now,
          user: 'mock-ventas',
        },
        ...order.trace,
      ],
    };

    this.writeStore({
      ...store,
      orders: store.orders.map((item) => (item.localUuid === localUuid ? nextOrder : item)),
    });

    return of(this.cloneOrder(nextOrder)).pipe(delay(320));
  }

  sendPendingConsolidated(companyId: string): Observable<OrderSyncResult> {
    const store = this.readStore();
    const pending = store.orders.filter(
      (order) => order.companyId === companyId && order.status === 'CREADA' && !order.synced,
    );
    const now = new Date().toISOString();
    const sentOrders = pending.map((order) => ({
      ...order,
      backendId: order.backendId ?? `backend-${order.id}`,
      backendOrderNumber: order.backendOrderNumber ?? order.orderNumber.replace('LOCAL', 'API'),
      status: 'ENVIADA' as const,
      synced: true,
      createdOffline: false,
      updatedAt: now,
      trace: [
        {
          status: 'ENVIADA' as const,
          description: 'Pedido enviado dentro de lote consolidado mock.',
          occurredAt: now,
          user: 'mock-ventas',
        },
        ...order.trace,
      ],
    }));
    const sentByUuid = new Map(sentOrders.map((order) => [order.localUuid, order]));
    const consolidatedLines = buildConsolidatedLines(sentOrders);

    this.writeStore({
      ...store,
      orders: store.orders.map((order) => sentByUuid.get(order.localUuid) ?? order),
    });

    return of({
      synced: sentOrders.length,
      rejected: 0,
      orders: sentOrders.map((order) => this.cloneOrder(order)),
      consolidatedLines,
      message:
        sentOrders.length > 0
          ? `${sentOrders.length} pedido(s) enviados en lote consolidado.`
          : 'No hay pedidos creados pendientes por enviar.',
    }).pipe(delay(420));
  }

  private validatePayload(payload: SaveOrderPayload): string | null {
    if (!payload.customerId) {
      return 'El cliente es obligatorio.';
    }

    if (!payload.sellerId) {
      return 'El vendedor es obligatorio.';
    }

    if (payload.requestedDeliveryDate < payload.orderDate) {
      return 'La fecha solicitada de entrega no puede ser anterior a la fecha del pedido.';
    }

    if (!payload.details.length) {
      return 'Agrega al menos un producto al pedido.';
    }

    if (payload.details.some((detail) => detail.quantity <= 0)) {
      return 'Las cantidades deben ser mayores que cero.';
    }

    return null;
  }

  private readStore(): OrderMockStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_ORDER_STORE);
    }

    const raw = localStorage.getItem(ORDER_STORAGE_KEY);

    if (!raw) {
      const initialStore = structuredClone(INITIAL_ORDER_STORE);
      this.writeStore(initialStore);
      return initialStore;
    }

    try {
      return normalizeStore(JSON.parse(raw) as OrderMockStore);
    } catch {
      const initialStore = structuredClone(INITIAL_ORDER_STORE);
      this.writeStore(initialStore);
      return initialStore;
    }
  }

  private writeStore(store: OrderMockStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(normalizeStore(store)));
  }

  private buildOrderNumber(): string {
    const date = new Date();
    const suffix = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}${date.getTime()}`
      .slice(-8)
      .padStart(8, '0');

    return `PED-LOCAL-${suffix}`;
  }

  private cloneOrder(order: Order): Order {
    return {
      ...order,
      details: order.details.map((detail) => ({ ...detail })),
      trace: order.trace.map((trace) => ({ ...trace })),
    };
  }
}

function buildConsolidatedLines(orders: Order[]): OrderConsolidatedLine[] {
  const lines = new Map<string, OrderConsolidatedLine>();

  orders.flatMap((order) => order.details).forEach((detail) => {
    const current = lines.get(detail.productId);

    lines.set(detail.productId, {
      productId: detail.productId,
      sku: detail.sku,
      productName: detail.productName,
      quantity: (current?.quantity ?? 0) + detail.quantity,
      availableStock: detail.availableStock,
      promisedLater: (current?.promisedLater ?? false) || detail.promisedLater,
    });
  });

  return Array.from(lines.values());
}

function normalizeStore(store: OrderMockStore): OrderMockStore {
  return {
    lastInventorySyncAt: store.lastInventorySyncAt ?? null,
    inventory: (store.inventory?.length ? store.inventory : INITIAL_ORDER_STORE.inventory).map((item) => ({
      ...item,
      stockStatus: resolveStockStatus(item.availableStock),
    })),
    orders: (store.orders ?? []).map((order) => ({
      ...order,
      companyId: order.companyId || 'medussa-holding',
      customerName: order.customerName || 'Cliente sin nombre',
      sellerName: order.sellerName || 'Vendedor no asignado',
      details: order.details ?? [],
      trace: order.trace ?? [],
    })),
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
