import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StorageLayoutAlert } from '../../../domain/models/storage-layout-alert.model';

@Component({
  selector: 'app-storage-layout-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Alertas de layout</p>
        <h3 class="erp-section-title">Saturacion, ociosidad y compatibilidad</h3>
        <p class="erp-section-description">
          Señales tempranas para redistribuir capacidad y proteger condiciones sanitarias.
        </p>
      </div>

      @if (alerts.length) {
        <div class="mt-5 space-y-3">
          @for (alert of alerts.slice(0, 8); track alert.id) {
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ alert.tipoAlerta }}</p>
                  <p class="mt-2 text-sm text-slate-600">{{ alert.descripcion }}</p>
                </div>

                <span class="erp-chip" [ngClass]="severityClass(alert.severidad)">
                  {{ alert.severidad }}
                </span>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[14rem]">
          <div>
            <p class="text-slate-600">No se detectaron alertas con el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class StorageLayoutAlertsComponent {
  @Input() alerts: StorageLayoutAlert[] = [];

  severityClass(severity: string): string {
    if (severity === 'ALTA') {
      return 'erp-chip--warning';
    }

    if (severity === 'MEDIA') {
      return 'erp-chip--neutral';
    }

    return 'erp-chip--info';
  }
}
