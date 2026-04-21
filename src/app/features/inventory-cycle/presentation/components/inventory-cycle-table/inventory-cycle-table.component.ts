import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InventoryCycleCount } from '../../../domain/models/inventory-cycle-count.model';
import { InventoryCycleCatalogs } from '../../../domain/models/inventory-cycle-response.model';

@Component({
  selector: 'app-inventory-cycle-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Bandeja de conteos</p>
        <h3 class="erp-section-title">Conteos ciclicos por lote y ubicacion</h3>
        <p class="erp-section-description">
          Consolida sistema vs fisico, diferencia, responsable y estado operativo del ajuste.
        </p>
      </div>

      @if (counts.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[104rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bodega</th>
                <th>Ubicacion</th>
                <th>SKU</th>
                <th>Lote</th>
                <th>Sistema</th>
                <th>Fisico</th>
                <th>Diferencia</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (count of counts; track count.id) {
                <tr [class.bg-sky-50]="count.id === selectedCountId">
                  <td>{{ count.fechaConteo.slice(0, 10) }}</td>
                  <td>{{ warehouseLabel(count.bodegaId) }}</td>
                  <td>{{ locationLabel(count.ubicacionId) }}</td>
                  <td class="font-semibold text-slate-900">{{ count.sku }}</td>
                  <td>{{ count.lote }}</td>
                  <td>{{ count.stockSistema }}</td>
                  <td>{{ count.conteoFisico }}</td>
                  <td [class.text-amber-700]="count.diferencia !== 0" [class.font-semibold]="count.diferencia !== 0">
                    {{ count.diferencia }}
                  </td>
                  <td>{{ count.usuarioConteo }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="statusClass(count.estado)">
                      {{ count.estado }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button type="button" mat-icon-button (click)="selectCount.emit(count)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button
                        type="button"
                        mat-icon-button
                        [disabled]="!canClose(count)"
                        (click)="closeCount.emit(count)"
                      >
                        <mat-icon>task_alt</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[18rem]">
          <div>
            <p class="text-slate-600">No hay conteos visibles para el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class InventoryCycleTableComponent {
  @Input() counts: InventoryCycleCount[] = [];
  @Input() catalogs: InventoryCycleCatalogs = {
    warehouses: [],
    locations: [],
    skus: [],
    lots: [],
    states: [],
    severities: [],
  };
  @Input() selectedCountId: string | null = null;

  @Output() readonly selectCount = new EventEmitter<InventoryCycleCount>();
  @Output() readonly closeCount = new EventEmitter<InventoryCycleCount>();

  warehouseLabel(warehouseId: string): string {
    return this.catalogs.warehouses.find((item) => item.value === warehouseId)?.label ?? warehouseId;
  }

  locationLabel(locationId: string): string {
    return this.catalogs.locations.find((item) => item.value === locationId)?.label ?? locationId;
  }

  canClose(count: InventoryCycleCount): boolean {
    return count.estado === 'REGISTRADO' || count.estado === 'AJUSTADO';
  }

  statusClass(status: string): string {
    if (status === 'PENDIENTE_APROBACION' || status === 'CON_DIFERENCIA') {
      return 'erp-chip--warning';
    }

    if (status === 'AJUSTADO') {
      return 'erp-chip--neutral';
    }

    if (status === 'CERRADO') {
      return 'erp-chip--success';
    }

    return 'erp-chip--info';
  }
}
