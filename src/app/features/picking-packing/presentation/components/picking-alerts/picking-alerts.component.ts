import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PickingAlert } from '../../../domain/models/picking-alert.model';
import { PickingDetail } from '../../../domain/models/picking-detail.model';

@Component({
  selector: 'app-picking-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Control de riesgo</p>
        <h3 class="erp-section-title">Alertas y faltantes</h3>
        <p class="erp-section-description">
          Resumen de pedidos bloqueados, faltantes parciales y novedades que impactan el despacho.
        </p>
      </div>

      <div class="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="space-y-3">
          @if (alerts.length) {
            @for (alert of alerts.slice(0, 8); track alert.id) {
              <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ alert.tipo }}</p>
                    <p class="mt-1 text-sm text-slate-600">{{ alert.descripcion }}</p>
                  </div>
                  <span class="erp-chip" [ngClass]="severityClass(alert.severidad)">
                    {{ alert.severidad }}
                  </span>
                </div>
              </article>
            }
          } @else {
            <div class="erp-empty-state min-h-[14rem]">
              <div>
                <p class="text-slate-600">No hay alertas para el filtro actual.</p>
              </div>
            </div>
          }
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Panel de faltantes</p>
          <h4 class="mt-2 text-lg font-semibold text-slate-900">Lineas con novedad</h4>

          <div class="mt-4 space-y-3">
            @if (shortageDetails.length) {
              @for (detail of shortageDetails.slice(0, 6); track detail.id) {
                <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p class="font-semibold text-slate-900">{{ detail.sku }} · {{ detail.productoNombre }}</p>
                  <p class="mt-1 text-sm text-slate-600">
                    {{ detail.ubicacionCodigo }} · {{ detail.lote }} ·
                    {{ detail.cantidadConfirmada }}/{{ detail.cantidadSolicitada }} confirmadas
                  </p>
                  @if (detail.observacion) {
                    <p class="mt-2 text-sm text-slate-500">{{ detail.observacion }}</p>
                  }
                </article>
              }
            } @else {
              <p class="text-sm text-slate-600">No hay lineas con faltante en la seleccion actual.</p>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PickingAlertsComponent {
  @Input() alerts: PickingAlert[] = [];
  @Input() shortageDetails: PickingDetail[] = [];

  severityClass(severity: PickingAlert['severidad']): string {
    if (severity === 'ALTA') {
      return 'erp-chip--warning';
    }

    if (severity === 'MEDIA') {
      return 'erp-chip--info';
    }

    return 'erp-chip--neutral';
  }
}
