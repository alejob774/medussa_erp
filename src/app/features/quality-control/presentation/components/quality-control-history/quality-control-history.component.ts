import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { QualityLotHistory } from '../../../domain/models/quality-lot-history.model';
import { QualityInspectionAggregate } from '../../../domain/models/quality-inspection.model';

@Component({
  selector: 'app-quality-control-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article class="erp-panel">
        <p class="erp-section-eyebrow">Historial de lote</p>
        <h3 class="erp-section-title">Inspecciones relacionadas</h3>
        <p class="erp-section-description">
          Secuencia tecnica de controles previos y decisiones sobre el mismo lote.
        </p>

        @if (relatedInspections.length) {
          <div class="mt-5 space-y-3">
            @for (item of relatedInspections; track item.inspection.id) {
              <article class="erp-detail-card">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      {{ item.inspection.tipoControl }} · {{ item.inspection.fechaMuestra | date: 'yyyy-MM-dd HH:mm' }}
                    </p>
                    <p class="mt-1 text-sm text-slate-600">
                      {{ item.inspection.analista }} · {{ item.inspection.equipoUtilizado }}
                    </p>
                  </div>
                  <span class="erp-status-chip" [class]="statusClass(item.inspection.estadoLote)">
                    {{ item.inspection.estadoLote }}
                  </span>
                </div>
                <p class="mt-3 text-sm text-slate-600">
                  {{ item.evaluation.noConformes }} fuera de rango · {{ item.evaluation.criticosFueraDeRango }} criticos
                </p>
              </article>
            }
          </div>
        } @else {
          <div class="erp-empty-state mt-5 min-h-[14rem]">
            <div>
              <p class="text-slate-600">Selecciona una inspeccion para revisar trazabilidad del lote.</p>
            </div>
          </div>
        }
      </article>

      <article class="erp-panel">
        <p class="erp-section-eyebrow">Bitacora</p>
        <h3 class="erp-section-title">Eventos del lote</h3>
        <p class="erp-section-description">
          Registro cronologico de validaciones, bloqueos, liberaciones y no conformidades.
        </p>

        @if (histories.length) {
          <div class="mt-5 space-y-3">
            @for (item of histories; track item.id) {
              <article class="erp-detail-card">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ item.evento }}</p>
                    <p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{{ item.usuario }}</p>
                  </div>
                  <p class="text-xs text-slate-500">{{ item.fecha | date: 'yyyy-MM-dd HH:mm' }}</p>
                </div>
                <p class="mt-3 text-sm text-slate-600">{{ item.observacion }}</p>
              </article>
            }
          </div>
        } @else {
          <div class="erp-empty-state mt-5 min-h-[14rem]">
            <div>
              <p class="text-slate-600">Aun no hay eventos para el lote seleccionado.</p>
            </div>
          </div>
        }
      </article>
    </section>
  `,
})
export class QualityControlHistoryComponent {
  @Input() relatedInspections: QualityInspectionAggregate[] = [];
  @Input() histories: QualityLotHistory[] = [];

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
