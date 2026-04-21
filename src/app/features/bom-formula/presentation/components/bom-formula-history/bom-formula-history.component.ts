import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BomFormulaAggregate } from '../../../domain/models/bom-formula.model';
import { BomFormulaHistory } from '../../../domain/models/bom-formula-history.model';

@Component({
  selector: 'app-bom-formula-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Versionado y trazabilidad</p>
        <h3 class="erp-section-title">Historial de cambios</h3>
        <p class="erp-section-description">
          Consulta versiones anteriores, costos comparados y motivos de aprobacion, rechazo o nueva version.
        </p>
      </div>

      @if (selectedFormula) {
        <div class="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-900">Versiones del producto</p>
            @for (aggregate of relatedFormulas; track aggregate.formula.id) {
              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-semibold text-slate-900">
                      {{ aggregate.formula.codigoFormula }} · v{{ aggregate.formula.version }}
                    </p>
                    <p class="mt-1 text-sm text-slate-600">
                      {{ aggregate.formula.estado }} · {{ aggregate.formula.vigenciaDesde | date: 'dd/MM/yyyy' }}
                      @if (aggregate.formula.vigenciaHasta) {
                        <span>→ {{ aggregate.formula.vigenciaHasta | date: 'dd/MM/yyyy' }}</span>
                      }
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-slate-900">{{ formatCurrency(aggregate.formula.costoEstandarTotal) }}</p>
                    <p class="text-xs text-slate-500">{{ formatCurrency(aggregate.formula.costoPorUnidad) }} por unidad</p>
                  </div>
                </div>
                <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                  <span>Merma: {{ aggregate.formula.mermaEsperada }}%</span>
                  <span>Tiempo: {{ aggregate.formula.tiempoProceso }} min</span>
                  <span>Rend.: {{ aggregate.formula.rendimientoEsperado }} {{ aggregate.formula.unidadRendimiento }}</span>
                  <span>Empaque: {{ aggregate.formula.empaqueRequerido }}</span>
                </div>
              </article>
            }
          </div>

          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-900">Eventos registrados</p>
            @if (relatedHistories.length) {
              @for (history of relatedHistories; track history.id) {
                <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p class="font-semibold text-slate-900">
                    {{ history.versionOrigen || 'Base' }} → {{ history.versionNueva }}
                  </p>
                  <p class="mt-1 text-sm text-slate-600">{{ history.motivoCambio }}</p>
                  <p class="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {{ history.usuario }} · {{ history.fecha | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                </article>
              }
            } @else {
              <div class="erp-empty-state min-h-[16rem]">
                <div>
                  <p class="text-slate-600">No hay historial para la formula seleccionada.</p>
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-slate-600">Selecciona una formula para consultar su trazabilidad.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class BomFormulaHistoryComponent {
  @Input() selectedFormula: BomFormulaAggregate | null = null;
  @Input() relatedFormulas: BomFormulaAggregate[] = [];
  @Input() relatedHistories: BomFormulaHistory[] = [];

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
