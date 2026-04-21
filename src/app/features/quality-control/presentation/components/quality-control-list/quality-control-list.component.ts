import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { QualityInspectionAggregate } from '../../../domain/models/quality-inspection.model';

@Component({
  selector: 'app-quality-control-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Bandeja sanitaria</p>
          <h3 class="erp-section-title">Inspecciones y lotes</h3>
          <p class="erp-section-description">
            Revisa el estado sanitario, la liberacion y las desviaciones detectadas por lote.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ inspections.length }} inspecciones
        </span>
      </div>

      @if (inspections.length) {
        <div class="mt-5 erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[84rem]">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Lote</th>
                <th>Producto</th>
                <th>Proveedor / OP</th>
                <th>Analista</th>
                <th>Fecha muestra</th>
                <th>Estado lote</th>
                <th>Liberado</th>
                <th>No conformes</th>
                <th>Criticos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of inspections; track item.inspection.id) {
                <tr>
                  <td>{{ labelControl(item.inspection.tipoControl) }}</td>
                  <td>
                    <p class="font-semibold text-slate-900">{{ item.inspection.loteCodigo }}</p>
                    <p class="text-xs text-slate-500">{{ item.inspection.productoCodigo }}</p>
                  </td>
                  <td>{{ item.inspection.productoNombre }}</td>
                  <td>
                    {{ item.inspection.proveedorNombre || item.inspection.ordenProduccion || 'Sin referencia' }}
                  </td>
                  <td>{{ item.inspection.analista }}</td>
                  <td>{{ item.inspection.fechaMuestra | date: 'yyyy-MM-dd HH:mm' }}</td>
                  <td>
                    <span class="erp-status-chip" [class]="statusClass(item.inspection.estadoLote)">
                      {{ item.inspection.estadoLote }}
                    </span>
                  </td>
                  <td>{{ item.inspection.liberado ? 'Si' : 'No' }}</td>
                  <td>{{ item.evaluation.noConformes }}</td>
                  <td>{{ item.evaluation.criticosFueraDeRango }}</td>
                  <td>
                    <button
                      type="button"
                      mat-stroked-button
                      [color]="item.inspection.id === selectedInspectionId ? 'primary' : undefined"
                      (click)="select.emit(item)"
                    >
                      {{ item.inspection.id === selectedInspectionId ? 'Seleccionada' : 'Ver detalle' }}
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
            <p class="text-lg font-semibold text-slate-900">Sin inspecciones para los filtros actuales</p>
            <p class="mt-2 text-slate-600">
              Registra la primera inspeccion de recepcion, proceso o producto terminado para este contexto.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class QualityControlListComponent {
  @Input() inspections: QualityInspectionAggregate[] = [];
  @Input() selectedInspectionId: string | null = null;

  @Output() readonly select = new EventEmitter<QualityInspectionAggregate>();

  labelControl(value: QualityInspectionAggregate['inspection']['tipoControl']): string {
    return value === 'PRODUCTO_TERMINADO' ? 'Producto terminado' : value === 'RECEPCION' ? 'Recepcion' : 'Proceso';
  }

  statusClass(status: QualityInspectionAggregate['inspection']['estadoLote']): string {
    if (status === 'APROBADO') {
      return 'erp-status-chip--success';
    }

    if (status === 'RECHAZADO') {
      return 'erp-status-chip--danger';
    }

    if (status === 'CUARENTENA') {
      return 'erp-status-chip--warning';
    }

    return 'erp-status-chip--muted';
  }
}
