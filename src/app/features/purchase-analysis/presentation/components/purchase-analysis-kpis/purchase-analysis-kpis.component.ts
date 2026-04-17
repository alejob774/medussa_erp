import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PurchaseAnalysisKpis } from '../../../domain/models/purchase-analysis-kpi.model';

@Component({
  selector: 'app-purchase-analysis-kpis',
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
export class PurchaseAnalysisKpisComponent {
  @Input({ required: true }) kpis: PurchaseAnalysisKpis = {
    totalSpend: 0,
    mirSpend: 0,
    logisticsSpend: 0,
    criticalSuppliers: 0,
    highRiskActive: 0,
    estimatedSavings: 0,
  };

  get cards(): Array<{ label: string; value: string; hint: string }> {
    return [
      { label: 'Gasto total', value: this.format(this.kpis.totalSpend), hint: 'Consolidado del periodo filtrado.' },
      { label: 'Gasto MIR', value: this.format(this.kpis.mirSpend), hint: 'Compras directas de materia e insumo.' },
      { label: 'Gasto LOGISTICA', value: this.format(this.kpis.logisticsSpend), hint: 'Componentes logisticos y de empaque.' },
      { label: 'Proveedores criticos', value: `${this.kpis.criticalSuppliers}`, hint: 'Con bajo score o alza relevante.' },
      { label: 'Riesgo alto activo', value: `${this.kpis.highRiskActive}`, hint: 'Alertas con severidad alta en curso.' },
      { label: 'Ahorro potencial', value: this.format(this.kpis.estimatedSavings), hint: 'Oportunidad estimada por categoria y proveedor.' },
    ];
  }

  private format(value: number): string {
    return new Intl.NumberFormat('es-CO').format(Math.round(value));
  }
}
