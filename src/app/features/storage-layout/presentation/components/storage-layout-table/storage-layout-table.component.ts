import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StorageLocationAssignment } from '../../../domain/models/storage-location-assignment.model';
import { StorageLayoutOccupancy } from '../../../domain/models/storage-layout-occupancy.model';
import { StorageLocation } from '../../../domain/models/storage-location.model';
import { StorageLayoutLot } from '../../../domain/models/storage-layout-response.model';
import { Warehouse } from '../../../domain/models/warehouse.model';

@Component({
  selector: 'app-storage-layout-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Detalle de ubicaciones</p>
        <h3 class="erp-section-title">Capacidad, ocupacion y asignacion SKU</h3>
        <p class="erp-section-description">
          Muestra el estado real del layout por bodega, posicion, restriccion y uso logico del espacio.
        </p>
      </div>

      @if (locations.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[108rem]">
            <thead>
              <tr>
                <th>Bodega</th>
                <th>Codigo</th>
                <th>Zona</th>
                <th>Pasillo</th>
                <th>Rack</th>
                <th>Nivel</th>
                <th>Posicion</th>
                <th>Tipo</th>
                <th>Restriccion</th>
                <th>SKU</th>
                <th>Capacidad</th>
                <th>Ocupacion</th>
                <th>Lotes</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (location of locations; track location.id) {
                <tr [class.bg-sky-50]="location.id === selectedLocationId">
                  <td>{{ warehouseName(location.bodegaId) }}</td>
                  <td class="font-semibold text-slate-900">{{ location.codigo }}</td>
                  <td>{{ location.zona }}</td>
                  <td>{{ location.pasillo }}</td>
                  <td>{{ location.rack }}</td>
                  <td>{{ location.nivel }}</td>
                  <td>{{ location.posicion }}</td>
                  <td>{{ location.tipoAlmacenamiento }}</td>
                  <td>{{ location.restriccionSanitaria }}</td>
                  <td>{{ assignmentLabel(location.id) }}</td>
                  <td>{{ occupancy(location.id)?.capacidadTotal ?? location.capacidad }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="occupancyClass(occupancy(location.id)?.ocupacionPct ?? 0)">
                      {{ occupancy(location.id)?.ocupacionPct ?? 0 }}%
                    </span>
                  </td>
                  <td>{{ locationLots(location.id).length }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="statusClass(location.estado)">
                      {{ location.estado }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button type="button" mat-icon-button (click)="selectLocation.emit(location)">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="editLocation.emit(location)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="assignSku.emit(location)">
                        <mat-icon>move_up</mat-icon>
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
            <p class="text-slate-600">No hay ubicaciones visibles con el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class StorageLayoutTableComponent {
  @Input() warehouses: Warehouse[] = [];
  @Input() locations: StorageLocation[] = [];
  @Input() assignments: StorageLocationAssignment[] = [];
  @Input() occupancies: StorageLayoutOccupancy[] = [];
  @Input() lots: StorageLayoutLot[] = [];
  @Input() selectedLocationId: string | null = null;

  @Output() readonly selectLocation = new EventEmitter<StorageLocation>();
  @Output() readonly editLocation = new EventEmitter<StorageLocation>();
  @Output() readonly assignSku = new EventEmitter<StorageLocation>();

  warehouseName(warehouseId: string): string {
    return this.warehouses.find((item) => item.id === warehouseId)?.nombre ?? warehouseId;
  }

  assignmentLabel(locationId: string): string {
    const assignment = this.assignments.find((item) => item.ubicacionId === locationId);
    return assignment ? `${assignment.sku} · ${assignment.productoNombre}` : 'Sin asignacion';
  }

  occupancy(locationId: string): StorageLayoutOccupancy | undefined {
    return this.occupancies.find((item) => item.ubicacionId === locationId);
  }

  locationLots(locationId: string): StorageLayoutLot[] {
    return this.lots.filter((item) => item.ubicacionId === locationId);
  }

  occupancyClass(occupancyPct: number): string {
    if (occupancyPct >= 88) {
      return 'erp-chip--warning';
    }

    if (occupancyPct < 18) {
      return 'erp-chip--info';
    }

    return 'erp-chip--success';
  }

  statusClass(status: string): string {
    if (status === 'BLOQUEADA') {
      return 'erp-chip--warning';
    }

    if (status === 'MANTENIMIENTO') {
      return 'erp-chip--neutral';
    }

    return 'erp-chip--success';
  }
}
