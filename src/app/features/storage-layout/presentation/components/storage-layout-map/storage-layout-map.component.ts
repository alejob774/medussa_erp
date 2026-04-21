import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StorageLayoutZoneSummary } from '../../../domain/models/storage-layout-response.model';

@Component({
  selector: 'app-storage-layout-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Mapa simplificado</p>
        <h3 class="erp-section-title">Lectura visual de ocupacion y accesibilidad</h3>
        <p class="erp-section-description">
          Coloriza zonas y ubicaciones para detectar saturacion, huecos operativos y posiciones bloqueadas.
        </p>
      </div>

      @if (map.length) {
        <div class="mt-5 grid gap-4 xl:grid-cols-3">
          @for (zone of map; track zone.warehouseId + zone.zone) {
            <article class="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {{ zone.warehouseName }}
                  </p>
                  <h4 class="mt-2 text-lg font-semibold text-slate-900">{{ zone.zone }}</h4>
                </div>

                <span class="erp-chip" [ngClass]="zoneClass(zone.occupancyPct)">
                  {{ zone.occupancyPct }}%
                </span>
              </div>

              <div class="mt-4 grid grid-cols-3 gap-2">
                @for (cell of zone.cells; track cell.locationId) {
                  <div
                    class="rounded-2xl border px-3 py-3 text-xs font-medium"
                    [ngClass]="cellClass(cell.occupancyPct, cell.status)"
                  >
                    <p class="truncate">{{ shortCode(cell.code) }}</p>
                    <p class="mt-1 text-[0.7rem] text-slate-600">{{ cell.occupancyPct }}%</p>
                    @if (cell.sku) {
                      <p class="mt-1 truncate text-[0.68rem] text-slate-500">{{ cell.sku }}</p>
                    }
                  </div>
                }
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-slate-600">No hay zonas visibles para el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class StorageLayoutMapComponent {
  @Input() map: StorageLayoutZoneSummary[] = [];

  shortCode(code: string): string {
    return code.split('-').slice(-3).join('-');
  }

  zoneClass(occupancyPct: number): string {
    if (occupancyPct >= 88) {
      return 'erp-chip--warning';
    }

    if (occupancyPct < 18) {
      return 'erp-chip--info';
    }

    return 'erp-chip--success';
  }

  cellClass(occupancyPct: number, status: string): string {
    if (status === 'BLOQUEADA') {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (status === 'MANTENIMIENTO') {
      return 'border-slate-300 bg-slate-100 text-slate-700';
    }

    if (occupancyPct >= 88) {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    if (occupancyPct < 18) {
      return 'border-sky-200 bg-sky-50 text-sky-700';
    }

    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}
