import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BudgetManagementAlert } from '../../../domain/models/budget-management-alert.model';

@Component({
  selector: 'app-budget-management-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel h-full">
      <div>
        <p class="erp-section-eyebrow">Alertas presupuestales</p>
        <h3 class="erp-section-title">Vigilancia del periodo</h3>
        <p class="erp-section-description">
          Sobregasto, desviación, consumo crítico y proyección de exceso sobre centros y categorías.
        </p>
      </div>

      @if (alerts.length) {
        <div class="mt-4 space-y-3">
          @for (alert of alerts.slice(0, 8); track alert.id) {
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="erp-chip" [ngClass]="severityClass(alert.severidad)">
                  {{ alert.severidad }}
                </span>
                <span class="erp-chip erp-chip--info">{{ alert.tipo }}</span>
                <span class="erp-chip erp-chip--neutral">{{ alert.centroCosto }}</span>
              </div>

              <p class="mt-3 text-sm font-semibold text-slate-900">{{ alert.categoria }}</p>
              <p class="mt-2 text-sm text-slate-700">{{ alert.descripcion }}</p>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[18rem]">
          <div>
            <p class="text-slate-600">Sin alertas para el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class BudgetManagementAlertsComponent {
  @Input() alerts: BudgetManagementAlert[] = [];

  severityClass(severity: string): string {
    if (severity === 'ALTA') {
      return 'erp-chip--warning';
    }

    if (severity === 'MEDIA') {
      return 'erp-chip--info';
    }

    return 'erp-chip--success';
  }
}
