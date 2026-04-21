import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { OeeAlert } from '../../../domain/models/oee-alert.model';

@Component({
  selector: 'app-oee-alerts',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Alertas simples</p>
          <h3 class="erp-section-title">Alertas operativas del periodo</h3>
          <p class="erp-section-description">
            Priorizacion basica por severidad para reaccionar sobre disponibilidad, rendimiento, calidad y paro.
          </p>
        </div>
        <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {{ alerts.length }} alertas
        </span>
      </div>

      @if (alerts.length) {
        <div class="mt-5 space-y-3">
          @for (alert of alerts; track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="erp-status-chip" [class]="severityClass(alert.severidad)">{{ alert.severidad }}</span>
                    <span class="text-sm font-semibold text-slate-900">{{ alert.tipo }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-600">{{ alert.descripcion }}</p>
                </div>
                <button type="button" mat-stroked-button (click)="focusRecord.emit(alert.registroId)">Ver registro</button>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Sin alertas para los filtros actuales</p>
            <p class="mt-2 text-slate-600">
              El periodo filtrado esta dentro de los umbrales operativos configurados para OEE.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class OeeAlertsComponent {
  @Input() alerts: OeeAlert[] = [];

  @Output() readonly focusRecord = new EventEmitter<string>();

  severityClass(severity: OeeAlert['severidad']): string {
    if (severity === 'ALTA') {
      return 'erp-status-chip--danger';
    }

    if (severity === 'MEDIA') {
      return 'erp-status-chip--warning';
    }

    return 'erp-status-chip--muted';
  }
}
