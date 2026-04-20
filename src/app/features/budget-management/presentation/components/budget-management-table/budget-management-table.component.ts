import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BudgetManagementAggregate } from '../../../domain/models/budget-management.model';

@Component({
  selector: 'app-budget-management-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Detalle presupuestal</p>
          <h3 class="erp-section-title">Listado ejecutivo de presupuestos</h3>
          <p class="erp-section-description">
            Vista operativa por periodo, centro, categoría, tipo, saldo, desviación y proyección.
          </p>
        </div>
      </div>

      @if (budgets.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[96rem]">
            <thead>
              <tr>
                <th>Año</th>
                <th>Mes</th>
                <th>Centro de costo</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Presupuesto aprobado</th>
                <th>Consumido</th>
                <th>Saldo</th>
                <th>Desviación %</th>
                <th>Proyección</th>
                <th>Riesgo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (aggregate of budgets; track aggregate.budget.id) {
                <tr [class.bg-sky-50]="aggregate.budget.id === selectedBudgetId">
                  <td>{{ aggregate.budget.anio }}</td>
                  <td>{{ monthLabel(aggregate.budget.mes) }}</td>
                  <td class="font-semibold text-slate-900">{{ costCenterLabel(aggregate.budget.centroCosto) }}</td>
                  <td>{{ aggregate.budget.categoria }}</td>
                  <td>{{ aggregate.budget.tipoAbastecimiento }}</td>
                  <td>{{ formatCurrency(aggregate.budget.valorAprobado + aggregate.budget.valorAjustado) }}</td>
                  <td>{{ formatCurrency(aggregate.execution.valorConsumido) }}</td>
                  <td [class.text-amber-700]="aggregate.execution.saldoDisponible < 0">
                    {{ formatCurrency(aggregate.execution.saldoDisponible) }}
                  </td>
                  <td
                    [class.text-amber-700]="aggregate.execution.desviacionPct > 0"
                    [class.font-semibold]="aggregate.execution.desviacionPct > 0"
                  >
                    {{ aggregate.execution.desviacionPct }}%
                  </td>
                  <td>{{ formatCurrency(aggregate.execution.proyeccionCierre) }}</td>
                  <td>{{ aggregate.execution.riesgoPrincipal }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="statusClass(aggregate.budget.estado)">
                      {{ aggregate.budget.estado }}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        mat-icon-button
                        aria-label="Ver detalle"
                        (click)="selectBudget.emit(aggregate)"
                      >
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button
                        type="button"
                        mat-icon-button
                        aria-label="Editar presupuesto"
                        (click)="editBudget.emit(aggregate)"
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button
                        type="button"
                        mat-icon-button
                        aria-label="Ajustar presupuesto"
                        (click)="adjustBudget.emit(aggregate)"
                      >
                        <mat-icon>playlist_add_check</mat-icon>
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
            <p class="text-slate-600">No hay presupuestos para el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class BudgetManagementTableComponent {
  @Input() budgets: BudgetManagementAggregate[] = [];
  @Input() selectedBudgetId: string | null = null;

  @Output() readonly selectBudget = new EventEmitter<BudgetManagementAggregate>();
  @Output() readonly editBudget = new EventEmitter<BudgetManagementAggregate>();
  @Output() readonly adjustBudget = new EventEmitter<BudgetManagementAggregate>();

  monthLabel(month: number): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(
      new Date(2026, Math.max(month - 1, 0), 1),
    );
  }

  costCenterLabel(center: string): string {
    const labels: Record<string, string> = {
      PRODUCCION: 'Producción',
      COMPRAS: 'Compras',
      LOGISTICA: 'Logística',
      BODEGA: 'Bodega',
      MANTENIMIENTO: 'Mantenimiento',
      CALIDAD: 'Calidad',
    };

    return labels[center] ?? center;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  statusClass(status: string): string {
    if (status === 'SOBREGASTO') {
      return 'erp-chip--warning';
    }

    if (status === 'EN_RIESGO') {
      return 'erp-chip--info';
    }

    if (status === 'AJUSTADO') {
      return 'erp-chip--neutral';
    }

    return 'erp-chip--success';
  }
}
