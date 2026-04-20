import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BudgetManagementAggregate } from '../../../domain/models/budget-management.model';

@Component({
  selector: 'app-budget-management-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Detalle e historial</p>
          <h3 class="erp-section-title">Trazabilidad simple del presupuesto</h3>
          <p class="erp-section-description">
            Seguimiento por movimientos de reserva, consumo, liberación y ajuste.
          </p>
        </div>

        @if (budget) {
          <div class="grid gap-3 sm:grid-cols-3">
            <article class="erp-meta-card min-w-[180px]">
              <p class="erp-meta-card__label">Plan vigente</p>
              <p class="erp-meta-card__value">
                {{ formatCurrency(budget.budget.valorAprobado + budget.budget.valorAjustado) }}
              </p>
              <p class="erp-meta-card__hint">Aprobado más ajuste neto.</p>
            </article>
            <article class="erp-meta-card min-w-[180px]">
              <p class="erp-meta-card__label">Consumido</p>
              <p class="erp-meta-card__value">{{ formatCurrency(budget.execution.valorConsumido) }}</p>
              <p class="erp-meta-card__hint">Consumo registrado en el periodo.</p>
            </article>
            <article class="erp-meta-card min-w-[180px]">
              <p class="erp-meta-card__label">Proyección</p>
              <p class="erp-meta-card__value">{{ formatCurrency(budget.execution.proyeccionCierre) }}</p>
              <p class="erp-meta-card__hint">Estimado de cierre mensual.</p>
            </article>
          </div>
        }
      </div>

      @if (budget) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[64rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo movimiento</th>
                <th>Referencia</th>
                <th>Valor</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              @for (movement of orderedHistory; track movement.id) {
                <tr>
                  <td>{{ movement.fecha }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="movementClass(movement.tipoMovimiento)">
                      {{ movement.tipoMovimiento }}
                    </span>
                  </td>
                  <td>{{ movement.referencia }}</td>
                  <td>{{ formatCurrency(movement.valor) }}</td>
                  <td>{{ movement.usuario }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-slate-600">Selecciona un presupuesto para ver el historial.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class BudgetManagementHistoryComponent {
  @Input() budget: BudgetManagementAggregate | null = null;

  get orderedHistory() {
    return [...(this.budget?.history ?? [])].sort((left, right) =>
      right.fecha.localeCompare(left.fecha),
    );
  }

  movementClass(type: string): string {
    if (type === 'AJUSTE') {
      return 'erp-chip--info';
    }

    if (type === 'CONSUMO') {
      return 'erp-chip--warning';
    }

    if (type === 'LIBERACION') {
      return 'erp-chip--success';
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
