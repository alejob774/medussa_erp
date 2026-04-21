import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BomFormulaDetail } from '../../../domain/models/bom-formula-detail.model';
import { MeasurementUnit } from '../../../domain/models/measurement-unit.model';

@Component({
  selector: 'app-bom-formula-cost-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">{{ eyebrow }}</p>
        <h3 class="erp-section-title">Resumen de costeo</h3>
        <p class="erp-section-description">
          Costo estandar total, costo por unidad y parametros base de rendimiento del lote.
        </p>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Ingredientes</p>
          <p class="erp-metric-card__value">{{ ingredients.length }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Costo total</p>
          <p class="erp-metric-card__value text-lg">{{ formatCurrency(totalCost) }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Costo por unidad</p>
          <p class="erp-metric-card__value text-lg">{{ formatCurrency(unitCost) }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Merma esperada</p>
          <p class="erp-metric-card__value">{{ mermaEsperada }}%</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Rendimiento</p>
          <p class="erp-metric-card__value">{{ rendimientoEsperado }} {{ unidadRendimiento }}</p>
        </article>
      </div>

      @if (ingredients.length) {
        <div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-semibold text-slate-900">Componentes mas costosos</p>
          <div class="mt-3 space-y-2">
            @for (item of topCostIngredients(); track item.id) {
              <div class="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>{{ item.ingredienteCodigo }} · {{ item.ingredienteNombre }}</span>
                <span class="font-semibold text-slate-900">{{ formatCurrency(item.costoTotalLinea) }}</span>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class BomFormulaCostSummaryComponent {
  @Input() eyebrow = 'Costeo formula';
  @Input() ingredients: BomFormulaDetail[] = [];
  @Input() mermaEsperada = 0;
  @Input() rendimientoEsperado = 0;
  @Input() unidadRendimiento: MeasurementUnit = 'UND';

  get totalCost(): number {
    return round(this.ingredients.reduce((sum, item) => sum + item.costoTotalLinea, 0));
  }

  get unitCost(): number {
    return this.rendimientoEsperado > 0 ? round(this.totalCost / this.rendimientoEsperado) : 0;
  }

  topCostIngredients(): BomFormulaDetail[] {
    return [...this.ingredients]
      .sort((left, right) => right.costoTotalLinea - left.costoTotalLinea)
      .slice(0, 5);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}
