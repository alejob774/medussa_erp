import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { OrderFacadeService } from '../../../application/facade/order-facade.service';
import {
  CustomerCommercialStatus,
  Order,
  OrderCatalogs,
  OrderChannel,
  OrderDetail,
  OrderInventoryAvailability,
  OrderPaymentCondition,
  OrderPriority,
  OrderType,
  SaveOrderPayload,
} from '../../../domain/models/order.model';

@Component({
  selector: 'app-order-taking-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './order-taking-page.component.html',
})
export class OrderTakingPageComponent {
  private readonly orderFacade = inject(OrderFacadeService);

  catalogs: OrderCatalogs = { customers: [], sellers: [], products: [] };
  orders: Order[] = [];
  details: OrderDetail[] = [];
  selectedOrder: Order | null = null;
  loading = false;
  saving = false;
  sending = false;
  errorMessage = '';
  successMessage = '';
  warningMessage = '';
  activeCompanyName = 'Empresa activa';
  lastInventorySyncAt: string | null = null;

  selectedCustomerId = '';
  selectedSellerId = '';
  orderDate = today();
  requestedDeliveryDate = today(1);
  orderType: OrderType = 'NORMAL';
  salesChannel: OrderChannel = 'CAMPO';
  priority: OrderPriority = 'NORMAL';
  paymentCondition: OrderPaymentCondition = 'CREDITO_15_DIAS';
  reserveInventory = true;

  selectedProductId = '';
  quantityToAdd = 1;
  promisedLater = false;

  constructor() {
    this.orderFacade.activeCompany$
      .pipe(takeUntilDestroyed())
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.activeCompanyName = company.name;
        this.loadAll();
      });
  }

  get selectedCustomerStatus(): CustomerCommercialStatus | null {
    return this.catalogs.customers.find((customer) => customer.id === this.selectedCustomerId)?.status ?? null;
  }

  get selectedCustomerRestrictionReason(): string | null {
    return this.catalogs.customers.find((customer) => customer.id === this.selectedCustomerId)?.restrictionReason ?? null;
  }

  get subtotal(): number {
    return this.details.reduce((total, detail) => total + detail.lineTotal, 0);
  }

  get tax(): number {
    return Math.round(this.subtotal * 0.19);
  }

  get total(): number {
    return this.subtotal + this.tax;
  }

  get pendingOrders(): Order[] {
    return this.orders.filter((order) => order.status === 'CREADA' && !order.synced);
  }

  loadAll(): void {
    this.loading = true;
    this.errorMessage = '';

    this.orderFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
          this.selectedSellerId = catalogs.sellers[0]?.id ?? '';
          this.selectedProductId = catalogs.products[0]?.productId ?? '';
          this.loadOrders(false);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible cargar catalogos de pedidos.');
        },
      });
  }

  loadOrders(clearMessages = true): void {
    if (clearMessages) {
      this.errorMessage = '';
    }

    this.orderFacade.listOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error: unknown) => {
        this.errorMessage = resolveError(error, 'No fue posible cargar pedidos locales.');
      },
    });
  }

  syncInventory(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.orderFacade
      .syncInventory()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (availability) => {
          this.catalogs = {
            ...this.catalogs,
            products: availability,
          };
          this.lastInventorySyncAt = new Date().toLocaleString('es-CO');
          this.successMessage = 'Disponibilidad de inventario sincronizada en mock.';
          this.repriceDetails(availability);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible sincronizar inventario.');
        },
      });
  }

  addProduct(): void {
    const product = this.catalogs.products.find((item) => item.productId === this.selectedProductId);

    this.warningMessage = '';

    if (!product) {
      this.errorMessage = 'Selecciona un producto.';
      return;
    }

    if (this.quantityToAdd <= 0) {
      this.errorMessage = 'La cantidad debe ser mayor que cero.';
      return;
    }

    const hasStockGap = product.availableStock < this.quantityToAdd;
    const detail: OrderDetail = {
      productId: product.productId,
      sku: product.sku,
      productName: product.productName,
      presentation: product.presentation,
      unit: product.unit,
      quantity: this.quantityToAdd,
      availableStock: product.availableStock,
      unitPrice: product.unitPrice,
      lineTotal: this.quantityToAdd * product.unitPrice,
      stockStatus: product.stockStatus,
      promisedLater: hasStockGap || this.promisedLater,
    };
    const current = this.details.find((item) => item.productId === detail.productId);

    if (current) {
      current.quantity += detail.quantity;
      current.lineTotal = current.quantity * current.unitPrice;
      current.promisedLater = current.promisedLater || detail.promisedLater;
    } else {
      this.details = [...this.details, detail];
    }

    if (hasStockGap) {
      this.warningMessage = 'El producto no cubre la cantidad solicitada; quedo marcado para entrega posterior.';
    }

    this.errorMessage = '';
    this.quantityToAdd = 1;
    this.promisedLater = false;
  }

  removeDetail(productId: string): void {
    this.details = this.details.filter((detail) => detail.productId !== productId);
  }

  saveCreated(): void {
    this.submitOrder(false);
  }

  sendOrder(): void {
    this.submitOrder(true);
  }

  sendSavedOrder(order: Order): void {
    this.sending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.orderFacade
      .sendOrder(order.localUuid)
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: (sentOrder) => {
          this.selectedOrder = sentOrder;
          this.successMessage = `Pedido ${sentOrder.orderNumber} enviado.`;
          this.loadOrders(false);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible enviar el pedido.');
        },
      });
  }

  sendConsolidated(): void {
    this.sending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.orderFacade
      .sendPendingConsolidated()
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = `${result.message} Lineas consolidadas: ${result.consolidatedLines.length}.`;
          this.loadOrders(false);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible enviar pendientes consolidados.');
        },
      });
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
  }

  private submitOrder(sendAfterSave: boolean): void {
    const payload = this.buildPayload();
    const validationError = this.validatePayload(payload);

    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.orderFacade
      .saveOrder(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (order) => {
          this.selectedOrder = order;
          this.successMessage =
            order.status === 'RECHAZADA'
              ? `Pedido ${order.orderNumber} rechazado por validacion comercial.`
              : `Pedido ${order.orderNumber} guardado como CREADA.`;
          this.loadOrders(false);
          this.clearDraft();

          if (sendAfterSave && order.status !== 'RECHAZADA') {
            this.sendSavedOrder(order);
          }
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible guardar el pedido.');
        },
      });
  }

  private buildPayload(): SaveOrderPayload {
    return {
      customerId: this.selectedCustomerId,
      sellerId: this.selectedSellerId,
      orderDate: this.orderDate,
      requestedDeliveryDate: this.requestedDeliveryDate,
      orderType: this.orderType,
      salesChannel: this.salesChannel,
      priority: this.priority,
      paymentCondition: this.paymentCondition,
      details: this.details.map((detail) => ({ ...detail })),
      reserveInventory: this.reserveInventory,
    };
  }

  private validatePayload(payload: SaveOrderPayload): string | null {
    if (!payload.customerId) {
      return 'Selecciona un cliente.';
    }

    if (payload.requestedDeliveryDate < payload.orderDate) {
      return 'La fecha de entrega solicitada debe ser igual o posterior a la fecha del pedido.';
    }

    if (!payload.details.length) {
      return 'Agrega al menos un producto.';
    }

    return null;
  }

  private clearDraft(): void {
    this.details = [];
    this.selectedCustomerId = '';
    this.orderDate = today();
    this.requestedDeliveryDate = today(1);
    this.priority = 'NORMAL';
    this.paymentCondition = 'CREDITO_15_DIAS';
  }

  private repriceDetails(availability: OrderInventoryAvailability[]): void {
    this.details = this.details.map((detail) => {
      const product = availability.find((item) => item.productId === detail.productId);

      if (!product) {
        return detail;
      }

      return {
        ...detail,
        availableStock: product.availableStock,
        unitPrice: product.unitPrice,
        lineTotal: detail.quantity * product.unitPrice,
        stockStatus: product.stockStatus,
        promisedLater: detail.promisedLater || product.availableStock < detail.quantity,
      };
    });
  }
}

function today(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function resolveError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
