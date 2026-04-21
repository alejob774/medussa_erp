import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BomFormulaAggregate } from '../../../domain/models/bom-formula.model';

@Component({
  selector: 'app-bom-formula-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Repositorio tecnico</p>
        <h3 class="erp-section-title">Listado de formulas y versiones</h3>
        <p class="erp-section-description">
          Revisa producto, version, estado, vigencia, costo y responsable antes de aprobar o crear una nueva version.
        </p>
      </div>

      @if (formulas.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[90rem]">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Version</th>
                <th>Estado</th>
                <th>Vigencia</th>
                <th>Merma</th>
                <th>Rendimiento</th>
                <th>Empaque</th>
                <th>Costo total</th>
                <th>Costo unidad</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              @for (aggregate of formulas; track aggregate.formula.id) {
                <tr
                  class="cursor-pointer"
                  [class.bg-sky-50]="aggregate.formula.id === selectedFormulaId"
                  (click)="select.emit(aggregate)"
                >
                  <td class="font-semibold text-slate-900">{{ aggregate.formula.codigoFormula }}</td>
                  <td>{{ aggregate.formula.productoCodigo }} · {{ aggregate.formula.productoNombre }}</td>
                  <td>{{ aggregate.formula.version }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="statusClass(aggregate.formula.estado)">
                      {{ aggregate.formula.estado }}
                    </span>
                  </td>
                  <td>
                    {{ aggregate.formula.vigenciaDesde | date: 'dd/MM/yyyy' }}
                    @if (aggregate.formula.vigenciaHasta) {
                      <span>→ {{ aggregate.formula.vigenciaHasta | date: 'dd/MM/yyyy' }}</span>
                    } @else {
                      <span>→ abierta</span>
                    }
                  </td>
                  <td>{{ aggregate.formula.mermaEsperada }}%</td>
                  <td>{{ aggregate.formula.rendimientoEsperado }} {{ aggregate.formula.unidadRendimiento }}</td>
                  <td>{{ aggregate.formula.empaqueRequerido }}</td>
                  <td>{{ formatCurrency(aggregate.formula.costoEstandarTotal) }}</td>
                  <td>{{ formatCurrency(aggregate.formula.costoPorUnidad) }}</td>
                  <td>{{ aggregate.formula.responsableAprobacion }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[18rem]">
          <div>
            <p class="text-slate-600">No hay formulas para la seleccion actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class BomFormulaListComponent {
  @Input() formulas: BomFormulaAggregate[] = [];
  @Input() selectedFormulaId: string | null = null;

  @Output() readonly select = new EventEmitter<BomFormulaAggregate>();

  statusClass(status: BomFormulaAggregate['formula']['estado']): string {
    if (status === 'VIGENTE') {
      return 'erp-chip--success';
    }

    if (status === 'PENDIENTE') {
      return 'erp-chip--info';
    }

    if (status === 'RECHAZADA') {
      return 'erp-chip--warning';
    }

    return 'erp-chip--neutral';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
