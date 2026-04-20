import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BudgetManagementKpis } from '../../../domain/models/budget-management-kpi.model';

@Component({
  selector: 'app-budget-management-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      @for (card of cards; track card.label) {
        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">{{ card.label }}</p>
          <p class="erp-kpi-card__value">{{ card.value }}</p>
          <p class="erp-kpi-card__hint">{{ card.hint }}</p>
        </article>
      }
    </section>
  `,
})
export class BudgetManagementKpisComponent {
  @Input({ required: true }) kpis: BudgetManagementKpis = {
    totalApproved: 0,
    totalConsumed: 0,
    totalAvailable: 0,
    riskCategories: 0,
    overspendActive: 0,
    projectedCloseTotal: 0,
  };

  get cards(): Array<{ label: string; value: string; hint: string }> {
    return [
      {
        label: 'Presupuesto total',
        value: this.formatCurrency(this.kpis.totalApproved),
        hint: 'Valor aprobado + ajustes vigentes del corte filtrado.',
      },
      {
        label: 'Consumido total',
        value: this.formatCurrency(this.kpis.totalConsumed),
        hint: 'Consumo real local consolidado por presupuesto.',
      },
      {
        label: 'Saldo disponible',
        value: this.formatCurrency(this.kpis.totalAvailable),
        hint: 'Disponibilidad actual antes del cierre del periodo.',
      },
      {
        label: 'Categorías en riesgo',
        value: `${this.kpis.riskCategories}`,
        hint: 'Categorías con riesgo de desviación o proyección excesiva.',
      },
      {
        label: 'Sobregasto activo',
        value: `${this.kpis.overspendActive}`,
        hint: 'Presupuestos ya excedidos o con cierre crítico.',
      },
      {
        label: 'Proyección de cierre',
        value: this.formatCurrency(this.kpis.projectedCloseTotal),
        hint: 'Cierre estimado del periodo sobre la empresa activa.',
      },
    ];
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
