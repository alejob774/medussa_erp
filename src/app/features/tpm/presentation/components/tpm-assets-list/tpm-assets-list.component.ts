import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TpmAssetAggregate } from '../../../domain/models/tpm-response.model';

@Component({
  selector: 'app-tpm-assets-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Activos de planta</p>
          <h3 class="erp-section-title">Hoja de vida tecnica</h3>
          <p class="erp-section-description">
            Revisa el estado del equipo, las horas de uso, el proximo mantenimiento y la relacion con OEE.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ assets.length }} activos
        </span>
      </div>

      @if (assets.length) {
        <div class="mt-5 erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[90rem]">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Ubicacion</th>
                <th>Estado tecnico</th>
                <th>Horas uso</th>
                <th>Ultimo mantenimiento</th>
                <th>Proximo mantenimiento</th>
                <th>Planes</th>
                <th>OTs abiertas</th>
                <th>Alertas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of assets; track item.asset.id) {
                <tr>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.asset.codigoEquipo }}</p>
                    <p class="text-xs text-slate-500">{{ item.asset.nombreEquipo }}</p>
                  </td>
                  <td>{{ item.asset.ubicacion }}</td>
                  <td>
                    <span class="erp-status-chip" [class]="statusClass(item.asset.estadoEquipo)">
                      {{ item.asset.estadoEquipo }}
                    </span>
                  </td>
                  <td>{{ item.asset.horasUso }}</td>
                  <td>{{ item.asset.fechaUltimoMantenimiento || 'Sin cierre' }}</td>
                  <td>{{ item.asset.fechaProximoMantenimiento || 'Por definir' }}</td>
                  <td>{{ item.plans.length }}</td>
                  <td>{{ openOrders(item) }}</td>
                  <td>{{ item.alerts.length }}</td>
                  <td>
                    <button
                      type="button"
                      mat-stroked-button
                      [color]="selectedAssetId === item.asset.id ? 'primary' : undefined"
                      (click)="select.emit(item)"
                    >
                      {{ selectedAssetId === item.asset.id ? 'Seleccionado' : 'Ver detalle' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[18rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Todavia no hay activos TPM visibles</p>
            <p class="mt-2 text-slate-600">
              TPM extiende automaticamente el maestro de Equipos cuando existe una empresa activa.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class TpmAssetsListComponent {
  @Input() assets: TpmAssetAggregate[] = [];
  @Input() selectedAssetId: string | null = null;

  @Output() readonly select = new EventEmitter<TpmAssetAggregate>();

  openOrders(item: TpmAssetAggregate): number {
    return item.workOrders.filter((order) => order.estado !== 'CERRADA' && order.estado !== 'CANCELADA').length;
  }

  statusClass(state: TpmAssetAggregate['asset']['estadoEquipo']): string {
    if (state === 'OPERATIVO') {
      return 'erp-status-chip--success';
    }

    if (state === 'DETENIDO') {
      return 'erp-status-chip--muted';
    }

    if (state === 'EN_MANTENIMIENTO') {
      return 'erp-status-chip--warning';
    }

    return 'erp-status-chip--danger';
  }
}
