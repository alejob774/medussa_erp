import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InventoryCycleCount } from '../../../domain/models/inventory-cycle-count.model';
import { InventoryCycleHistory } from '../../../domain/models/inventory-cycle-history.model';
import { InventoryCycleRecurrenceItem } from '../../../domain/models/inventory-cycle-response.model';

@Component({
  selector: 'app-inventory-cycle-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel space-y-6">
      <div>
        <p class="erp-section-eyebrow">Historial y mapa de error</p>
        <h3 class="erp-section-title">Trazabilidad del conteo seleccionado</h3>
        <p class="erp-section-description">
          Conserva el rastro del conteo y resume los puntos del layout donde la diferencia ya se vuelve patron.
        </p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          @if (count) {
            <div class="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{{ count.sku }}</p>
                  <h4 class="mt-2 text-lg font-semibold text-slate-900">{{ count.productoNombre }}</h4>
                  <p class="mt-2 text-sm text-slate-500">{{ count.lote }} · {{ count.fechaConteo.slice(0, 10) }}</p>
                </div>
                <span class="erp-chip" [ngClass]="count.diferencia === 0 ? 'erp-chip--success' : 'erp-chip--warning'">
                  {{ count.estado }}
                </span>
              </div>

              <div class="mt-5 space-y-3">
                @for (item of selectedHistory; track item.id) {
                  <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm font-semibold text-slate-900">{{ item.evento }}</p>
                      <p class="text-xs text-slate-500">{{ item.fechaEvento.slice(0, 10) }}</p>
                    </div>
                    <p class="mt-2 text-sm text-slate-600">{{ item.observacion }}</p>
                    <p class="mt-2 text-xs text-slate-500">{{ item.usuarioId }}</p>
                  </article>
                }
              </div>
            </div>
          } @else {
            <div class="erp-empty-state min-h-[18rem]">
              <div>
                <p class="text-slate-600">Selecciona un conteo para revisar su trazabilidad.</p>
              </div>
            </div>
          }
        </div>

        <div class="space-y-3">
          <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="font-semibold text-slate-900">Mapa de error por ubicacion</p>
            <div class="mt-3 space-y-2">
              @for (item of recurrentLocations; track item.label) {
                <div class="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{{ item.label }}</span>
                  <span class="font-semibold text-slate-900">{{ item.count }}</span>
                </div>
              }
            </div>
          </article>

          <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="font-semibold text-slate-900">Mapa de error por SKU</p>
            <div class="mt-3 space-y-2">
              @for (item of recurrentSkus; track item.label) {
                <div class="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{{ item.label }}</span>
                  <span class="font-semibold text-slate-900">{{ item.count }}</span>
                </div>
              }
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
})
export class InventoryCycleHistoryComponent {
  @Input() count: InventoryCycleCount | null = null;
  @Input() histories: InventoryCycleHistory[] = [];
  @Input() recurrentLocations: InventoryCycleRecurrenceItem[] = [];
  @Input() recurrentSkus: InventoryCycleRecurrenceItem[] = [];

  get selectedHistory(): InventoryCycleHistory[] {
    if (!this.count) {
      return [];
    }

    return this.histories.filter((item) => item.conteoId === this.count?.id);
  }
}
