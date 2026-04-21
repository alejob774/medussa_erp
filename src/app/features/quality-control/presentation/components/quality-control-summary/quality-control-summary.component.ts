import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  EMPTY_QUALITY_EVALUATION,
  QualityControlDashboard,
} from '../../../domain/models/quality-control-response.model';
import { QualityInspection } from '../../../domain/models/quality-inspection.model';

@Component({
  selector: 'app-quality-control-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <p class="erp-section-eyebrow">{{ eyebrow }}</p>
      <h3 class="erp-section-title">Resumen de evaluacion</h3>
      <p class="erp-section-description">
        Consolidado tecnico de conformidad, estado sugerido y liberacion del lote.
      </p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Parametros</p>
          <p class="erp-metric-card__value">{{ evaluation.totalParametros }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Conformes</p>
          <p class="erp-metric-card__value text-emerald-700">{{ evaluation.conformes }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">No conformes</p>
          <p class="erp-metric-card__value text-amber-700">{{ evaluation.noConformes }}</p>
        </article>
        <article class="erp-metric-card">
          <p class="erp-metric-card__label">Criticos fuera de rango</p>
          <p class="erp-metric-card__value text-rose-700">{{ evaluation.criticosFueraDeRango }}</p>
        </article>
      </div>

      <div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Decision sugerida</p>
            <p class="mt-2 text-xl font-semibold text-slate-900">{{ evaluation.accionSugerida }}</p>
            <p class="mt-2 text-sm text-slate-600">{{ narrative }}</p>
          </div>
          <div class="min-w-[13rem] rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <p class="font-semibold text-slate-900">
              Estado actual: {{ inspection?.estadoLote ?? evaluation.sugerenciaEstado }}
            </p>
            <p class="mt-2">
              Liberado: <strong>{{ inspection?.liberado ? 'Si' : 'No' }}</strong>
            </p>
            <p class="mt-2">
              Responsable:
              <strong>{{ inspection?.responsableLiberacion || 'Pendiente' }}</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class QualityControlSummaryComponent {
  @Input() eyebrow = 'Resumen tecnico';
  @Input() inspection: QualityInspection | null = null;
  @Input() evaluation = EMPTY_QUALITY_EVALUATION;
  @Input() _catalogs: QualityControlDashboard['catalogs'] | null = null;

  get narrative(): string {
    if (!this.evaluation.totalParametros) {
      return 'La inspeccion aun no tiene parametros capturados.';
    }

    if (this.evaluation.inspeccionConforme) {
      return 'Todos los resultados quedaron dentro de rango. El lote puede pasar a liberacion autorizada.';
    }

    if (this.evaluation.criticosFueraDeRango > 0) {
      return 'Hay desviaciones criticas. El lote debe bloquearse o mantenerse en cuarentena segun el caso.';
    }

    return 'Se detectaron desviaciones menores. Se recomienda cuarentena o reinspeccion antes de liberar.';
  }
}
