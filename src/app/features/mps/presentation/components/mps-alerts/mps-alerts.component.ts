import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MpsAlert } from '../../../domain/models/mps-alert.model';

@Component({
  selector: 'app-mps-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Panel de alertas</p>
          <h3 class="erp-section-title">Riesgos del plan</h3>
          <p class="erp-section-description">
            Consolida faltantes, saturacion, FEFO y dependencias de compra antes de liberar el plan.
          </p>
        </div>

        <div class="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1">Altas: {{ highCount }}</span>
          <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">Medias: {{ mediumCount }}</span>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Bajas: {{ lowCount }}</span>
        </div>
      </div>

      @if (alerts.length) {
        <div class="mt-5 space-y-3">
          @for (alert of alerts; track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="erp-chip" [ngClass]="severityClass(alert.severidad)">{{ alert.severidad }}</span>
                  <span class="text-sm font-semibold text-slate-900">{{ labelType(alert.tipoAlerta) }}</span>
                </div>
                @if (alert.skuId) {
                  <span class="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">SKU especifico</span>
                }
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-600">{{ alert.descripcion }}</p>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Sin alertas activas</p>
            <p class="mt-2 text-slate-600">El escenario actual no presenta restricciones criticas para la corrida.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class MpsAlertsComponent {
  @Input() alerts: MpsAlert[] = [];

  get highCount(): number {
    return this.alerts.filter((item) => item.severidad === 'ALTA').length;
  }

  get mediumCount(): number {
    return this.alerts.filter((item) => item.severidad === 'MEDIA').length;
  }

  get lowCount(): number {
    return this.alerts.filter((item) => item.severidad === 'BAJA').length;
  }

  severityClass(severity: MpsAlert['severidad']): string {
    if (severity === 'ALTA') {
      return 'erp-chip--danger';
    }

    if (severity === 'MEDIA') {
      return 'erp-chip--warning';
    }

    return 'erp-chip--neutral';
  }

  labelType(type: MpsAlert['tipoAlerta']): string {
    if (type === 'CAPACIDAD_INSUFICIENTE') {
      return 'Capacidad insuficiente';
    }

    if (type === 'RIESGO_FALTANTE') {
      return 'Riesgo de faltante';
    }

    if (type === 'RIESGO_VENCIMIENTO') {
      return 'Riesgo de vencimiento';
    }

    if (type === 'MATERIA_PRIMA_INSUFICIENTE') {
      return 'Materia prima insuficiente';
    }

    return 'Stock de seguridad comprometido';
  }
}
