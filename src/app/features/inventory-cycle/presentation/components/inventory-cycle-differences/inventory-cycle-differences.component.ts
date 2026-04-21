import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InventoryCycleAlert } from '../../../domain/models/inventory-cycle-alert.model';
import { InventoryCycleCount } from '../../../domain/models/inventory-cycle-count.model';
import { InventoryCycleRecurrenceItem } from '../../../domain/models/inventory-cycle-response.model';

@Component({
  selector: 'app-inventory-cycle-differences',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel space-y-6">
      <div>
        <p class="erp-section-eyebrow">Diferencias y recurrencia</p>
        <h3 class="erp-section-title">Focos criticos del ciclo</h3>
        <p class="erp-section-description">
          Resume diferencias de alto impacto y los puntos donde el error ya se repite por SKU o ubicacion.
        </p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="space-y-3">
          @for (count of differingCounts.slice(0, 5); track count.id) {
            <article class="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{{ count.sku }} · {{ count.lote }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ count.fechaConteo.slice(0, 10) }}</p>
                </div>
                <span class="erp-chip" [ngClass]="count.diferencia === 0 ? 'erp-chip--success' : 'erp-chip--warning'">
                  {{ count.diferencia }}
                </span>
              </div>
              <p class="mt-3 text-sm text-slate-600">
                Sistema {{ count.stockSistema }} vs fisico {{ count.conteoFisico }}.
              </p>
            </article>
          }
        </div>

        <div class="space-y-4">
          <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-900">Ubicaciones recurrentes</p>
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
            <p class="text-sm font-semibold text-slate-900">SKU recurrentes</p>
            <div class="mt-3 space-y-2">
              @for (item of recurrentSkus; track item.label) {
                <div class="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{{ item.label }}</span>
                  <span class="font-semibold text-slate-900">{{ item.count }}</span>
                </div>
              }
            </div>
          </article>

          <article class="rounded-3xl border border-amber-100 bg-amber-50/70 p-4">
            <p class="text-sm font-semibold text-slate-900">Alertas activas</p>
            <div class="mt-3 space-y-2">
              @for (alert of alerts.slice(0, 4); track alert.id) {
                <p class="text-sm text-slate-600">
                  <span class="font-semibold text-slate-900">{{ alert.tipoAlerta }}:</span>
                  {{ alert.descripcion }}
                </p>
              }
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
})
export class InventoryCycleDifferencesComponent {
  @Input() differingCounts: InventoryCycleCount[] = [];
  @Input() alerts: InventoryCycleAlert[] = [];
  @Input() recurrentLocations: InventoryCycleRecurrenceItem[] = [];
  @Input() recurrentSkus: InventoryCycleRecurrenceItem[] = [];
}
