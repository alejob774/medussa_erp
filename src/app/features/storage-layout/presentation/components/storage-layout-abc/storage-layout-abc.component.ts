import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbcClassification } from '../../../domain/models/abc-classification.model';
import { StorageRelocationSuggestion } from '../../../domain/models/storage-layout-response.model';

@Component({
  selector: 'app-storage-layout-abc',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel space-y-6">
      <div>
        <p class="erp-section-eyebrow">ABC y reubicacion</p>
        <h3 class="erp-section-title">Rotacion y sugerencias estrategicas</h3>
        <p class="erp-section-description">
          Prioriza SKU clase A cerca del picking y propone rebalanceos cuando la ocupacion no ayuda.
        </p>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div class="space-y-3">
          @for (item of abc.slice(0, 6); track item.id) {
            <article class="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{{ item.productoNombre }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ item.sku }}</p>
                </div>
                <span class="erp-chip" [ngClass]="abcClass(item.categoriaABC)">
                  {{ item.categoriaABC }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>Rotacion {{ item.rotacion }}</span>
                <span>Participacion {{ item.participacionPct }}%</span>
              </div>
              <p class="mt-3 text-sm text-slate-600">{{ item.sugerenciaUbicacion }}</p>
            </article>
          }
        </div>

        <div class="space-y-3">
          @for (item of suggestions.slice(0, 5); track item.id) {
            <article class="rounded-3xl border border-sky-100 bg-sky-50/70 p-4">
              <p class="font-semibold text-slate-900">{{ item.productoNombre }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ item.origenCodigo }} → {{ item.destinoCodigo }}</p>
              <p class="mt-3 text-sm text-slate-600">{{ item.motivo }}</p>
              <p class="mt-2 text-sm font-medium text-sky-700">{{ item.impacto }}</p>
            </article>
          }

          @if (!suggestions.length) {
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay reubicaciones sugeridas para el filtro actual.
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class StorageLayoutAbcComponent {
  @Input() abc: AbcClassification[] = [];
  @Input() suggestions: StorageRelocationSuggestion[] = [];

  abcClass(category: string): string {
    if (category === 'A') {
      return 'erp-chip--warning';
    }

    if (category === 'B') {
      return 'erp-chip--neutral';
    }

    return 'erp-chip--info';
  }
}
