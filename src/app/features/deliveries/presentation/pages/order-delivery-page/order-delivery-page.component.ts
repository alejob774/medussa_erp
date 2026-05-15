import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { DeliveryFacadeService } from '../../../application/facade/delivery-facade.service';
import {
  DeliveryCatalogs,
  DeliveryConfirmationPayload,
  DeliveryDetail,
  DeliveryFilters,
  DeliveryOrder,
  DeliveryTrace,
} from '../../../domain/models/delivery.model';

@Component({
  selector: 'app-order-delivery-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './order-delivery-page.component.html',
})
export class OrderDeliveryPageComponent {
  private readonly deliveryFacade = inject(DeliveryFacadeService);

  catalogs: DeliveryCatalogs = { routes: [], drivers: [], vehicles: [] };
  deliveries: DeliveryOrder[] = [];
  selectedDelivery: DeliveryOrder | null = null;
  editableDetails: DeliveryDetail[] = [];
  trace: DeliveryTrace[] = [];
  loading = false;
  confirming = false;
  errorMessage = '';
  successMessage = '';

  filters: DeliveryFilters = {
    routeId: '',
    driverId: '',
    status: 'TODOS',
    date: today(),
  };

  signatureText = '';
  comments = '';
  photoBase64 = '';
  useMockGps = true;
  gpsLatitude: number | null = 6.2442;
  gpsLongitude: number | null = -75.5812;

  constructor() {
    this.deliveryFacade.activeCompany$
      .pipe(takeUntilDestroyed())
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.loadCatalogs();
        this.loadDeliveries();
      });
  }

  loadCatalogs(): void {
    this.deliveryFacade.getCatalogs().subscribe({
      next: (catalogs) => {
        this.catalogs = catalogs;
      },
      error: (error: unknown) => {
        this.errorMessage = resolveError(error, 'No fue posible cargar catalogos logisticos.');
      },
    });
  }

  loadDeliveries(): void {
    this.loading = true;
    this.errorMessage = '';

    this.deliveryFacade
      .listInRouteOrders({
        ...this.filters,
        routeId: this.filters.routeId || null,
        driverId: this.filters.driverId || null,
        status: this.filters.status || 'TODOS',
        date: this.filters.date || null,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (deliveries) => {
          this.deliveries = deliveries;
          if (!this.selectedDelivery && deliveries.length) {
            this.selectDelivery(deliveries[0]);
          }
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible cargar ordenes en ruta.');
        },
      });
  }

  selectDelivery(delivery: DeliveryOrder): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.deliveryFacade
      .getOrder(delivery.orderId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (current) => {
          this.selectedDelivery = current;
          this.editableDetails = current.details.map((detail) => ({
            ...detail,
            deliveredQuantity: detail.deliveredQuantity,
          }));
          this.comments = current.comments ?? '';
          this.signatureText = current.signatureBase64 ? 'Firma registrada' : '';
          this.photoBase64 = current.photoBase64 ?? '';
          this.gpsLatitude = current.gpsLatitude ?? 6.2442;
          this.gpsLongitude = current.gpsLongitude ?? -75.5812;
          this.loadTrace(current.orderId);
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible cargar el detalle de entrega.');
        },
      });
  }

  loadTrace(orderId: string): void {
    this.deliveryFacade.getTrace(orderId).subscribe({
      next: (trace) => {
        this.trace = trace;
      },
      error: () => {
        this.trace = this.selectedDelivery?.trace ?? [];
      },
    });
  }

  fillTotalDelivery(): void {
    this.editableDetails = this.editableDetails.map((detail) => ({
      ...detail,
      deliveredQuantity: detail.pendingQuantity,
    }));
  }

  clearDeliveryQuantities(): void {
    this.editableDetails = this.editableDetails.map((detail) => ({
      ...detail,
      deliveredQuantity: 0,
    }));
  }

  setMockPhoto(): void {
    this.photoBase64 = toBase64(`evidencia-mock-${this.selectedDelivery?.orderId ?? 'orden'}`);
  }

  confirmTotal(): void {
    this.fillTotalDelivery();
    this.confirmDelivery();
  }

  confirmPartial(): void {
    this.confirmDelivery();
  }

  private confirmDelivery(): void {
    if (!this.selectedDelivery) {
      return;
    }

    const validationError = this.validateConfirmation();

    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const payload: DeliveryConfirmationPayload = {
      orderId: this.selectedDelivery.orderId,
      deliveredByUserId: this.deliveryFacade.getActiveUserId(),
      comments: this.comments || null,
      signatureBase64: toBase64(this.signatureText.trim()),
      photoBase64: this.photoBase64 || null,
      gpsLatitude: this.useMockGps ? this.gpsLatitude : null,
      gpsLongitude: this.useMockGps ? this.gpsLongitude : null,
      details: this.editableDetails.map((detail) => ({
        productId: detail.productId,
        deliveredQuantity: Number(detail.deliveredQuantity) || 0,
      })),
    };

    this.confirming = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.deliveryFacade
      .confirmDelivery(payload)
      .pipe(finalize(() => (this.confirming = false)))
      .subscribe({
        next: (delivery) => {
          this.selectedDelivery = delivery;
          this.editableDetails = delivery.details.map((detail) => ({ ...detail }));
          this.trace = delivery.trace;
          this.successMessage =
            delivery.orderStatus === 'ENTREGADA'
              ? 'Entrega total registrada.'
              : 'Entrega parcial registrada.';
          this.loadDeliveries();
        },
        error: (error: unknown) => {
          this.errorMessage = resolveError(error, 'No fue posible confirmar la entrega.');
        },
      });
  }

  private validateConfirmation(): string | null {
    if (!this.selectedDelivery) {
      return 'Selecciona una orden.';
    }

    if (!['EN_RUTA', 'LISTA_PARA_DESPACHO'].includes(this.selectedDelivery.orderStatus)) {
      return 'La orden ya esta cerrada o no esta disponible para registrar entrega.';
    }

    if (!this.signatureText.trim()) {
      return 'La firma es obligatoria para cerrar la entrega.';
    }

    for (const detail of this.editableDetails) {
      const deliveredQuantity = Number(detail.deliveredQuantity) || 0;

      if (deliveredQuantity > detail.pendingQuantity) {
        return `La cantidad entregada de ${detail.productName} supera el pendiente.`;
      }

      if (deliveredQuantity < 0) {
        return 'Las cantidades entregadas no pueden ser negativas.';
      }
    }

    if (!this.editableDetails.some((detail) => Number(detail.deliveredQuantity) > 0)) {
      return 'Registra al menos una cantidad entregada.';
    }

    return null;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toBase64(value: string): string {
  return `data:text/plain;base64,${btoa(unescape(encodeURIComponent(value)))}`;
}

function resolveError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
