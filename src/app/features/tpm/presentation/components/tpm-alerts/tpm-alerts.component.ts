import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TpmAlert } from '../../../domain/models/tpm-alert.model';

@Component({
  selector: 'app-tpm-alerts',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Alertas criticas</p>
          <h3 class="erp-section-title">Riesgos tecnicos del periodo</h3>
          <p class="erp-section-description">
            Priorizacion simple para calibraciones, bloqueos, sanitarios, correctivos y repuestos.
          </p>
        </div>
      </div>

      @if (alerts.length) {
        <div class="mt-5 space-y-3">
          @for (item of alerts; track item.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="erp-status-chip" [class]="severityClass(item.severidad)">{{ item.severidad }}</span>
                    <span class="text-sm font-semibold text-slate-900">{{ item.tipo }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-600">{{ item.descripcion }}</p>
                </div>
                <button type="button" mat-stroked-button (click)="focusAsset.emit(item.equipoId)">Ver activo</button>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Sin alertas para el filtro actual</p>
            <p class="mt-2 text-slate-600">Los activos visibles no presentan criticidades TPM pendientes.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class TpmAlertsComponent {
  @Input() alerts: TpmAlert[] = [];

  @Output() readonly focusAsset = new EventEmitter<string>();

  severityClass(severity: TpmAlert['severidad']): string {
    if (severity === 'ALTA') {
      return 'erp-status-chip--danger';
    }

    if (severity === 'MEDIA') {
      return 'erp-status-chip--warning';
    }

    return 'erp-status-chip--muted';
  }
}
