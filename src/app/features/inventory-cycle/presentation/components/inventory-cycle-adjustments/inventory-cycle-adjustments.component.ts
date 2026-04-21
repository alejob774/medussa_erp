import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { InventoryCycleAdjustment } from '../../../domain/models/inventory-cycle-adjustment.model';
import { InventoryCycleCount } from '../../../domain/models/inventory-cycle-count.model';
import { InventoryAccuracy } from '../../../domain/models/inventory-accuracy.model';
import { InventoryCycleCatalogs } from '../../../domain/models/inventory-cycle-response.model';

@Component({
  selector: 'app-inventory-cycle-adjustments',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel space-y-6">
      <div>
        <p class="erp-section-eyebrow">Ajustes y exactitud</p>
        <h3 class="erp-section-title">Bandeja de aprobacion y precision por bodega</h3>
        <p class="erp-section-description">
          Separa ajustes pendientes del cierre operativo y pone en contexto la exactitud por bodega.
        </p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-3">
          @for (adjustment of pendingAdjustments; track adjustment.id) {
            <article class="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-semibold text-slate-900">{{ countLabel(adjustment.conteoId) }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ adjustment.tipoAjuste }} · {{ adjustment.cantidad }} unidades</p>
                  <p class="mt-3 text-sm text-slate-600">{{ adjustment.motivo }}</p>
                </div>
                <button type="button" mat-flat-button color="primary" (click)="approve.emit(adjustment.conteoId)">
                  Aprobar
                </button>
              </div>
            </article>
          }

          @if (!pendingAdjustments.length) {
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay ajustes pendientes de aprobacion.
            </article>
          }
        </div>

        <div class="space-y-3">
          @for (accuracy of accuracies; track accuracy.id) {
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{{ warehouseLabel(accuracy.bodegaId) }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ accuracy.totalConteos }} conteos</p>
                </div>
                <span class="erp-chip" [ngClass]="accuracy.exactitudPct >= 97 ? 'erp-chip--success' : 'erp-chip--warning'">
                  {{ accuracy.exactitudPct }}%
                </span>
              </div>
              <div class="mt-4 h-2 rounded-full bg-slate-200">
                <div class="h-2 rounded-full bg-sky-600" [style.width.%]="accuracy.exactitudPct"></div>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class InventoryCycleAdjustmentsComponent {
  @Input() pendingAdjustments: InventoryCycleAdjustment[] = [];
  @Input() accuracies: InventoryAccuracy[] = [];
  @Input() counts: InventoryCycleCount[] = [];
  @Input() catalogs: InventoryCycleCatalogs = {
    warehouses: [],
    locations: [],
    skus: [],
    lots: [],
    states: [],
    severities: [],
  };

  @Output() readonly approve = new EventEmitter<string>();

  countLabel(countId: string): string {
    const count = this.counts.find((item) => item.id === countId);
    return count ? `${count.sku} · ${count.lote}` : countId;
  }

  warehouseLabel(warehouseId: string): string {
    return this.catalogs.warehouses.find((item) => item.value === warehouseId)?.label ?? warehouseId;
  }
}
