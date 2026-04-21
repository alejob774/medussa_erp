import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MpsPlanFilters } from '../../../domain/models/mps-plan-filters.model';
import { MpsCatalogs } from '../../../domain/models/mps-response.model';

@Component({
  selector: 'app-mps-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-3xl">
          <p class="erp-section-eyebrow">Generacion operativa</p>
          <h3 class="erp-section-title">Filtros del plan maestro</h3>
          <p class="erp-section-description">
            Define periodo, planta, familia y SKU para generar o consultar el plan semanal de {{ companyName }}.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-stroked-button (click)="apply.emit(buildPayload())">Aplicar vista</button>
          <button type="button" mat-flat-button color="primary" (click)="generate.emit(buildPayload())">
            Generar plan
          </button>
        </div>
      </div>

      <div class="mt-5 grid gap-4 xl:grid-cols-4">
        <label class="erp-field">
          <span class="erp-field__label">Fecha inicio</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaInicio" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Fecha fin</span>
          <input class="erp-field__control" type="date" [(ngModel)]="draft.fechaFin" />
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Planta</span>
          <select class="erp-field__control" [(ngModel)]="draft.planta">
            <option [ngValue]="null">Todas las plantas</option>
            @for (option of catalogs.plants; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field">
          <span class="erp-field__label">Familia</span>
          <select class="erp-field__control" [(ngModel)]="draft.familia">
            <option [ngValue]="null">Todas las familias</option>
            @for (option of catalogs.families; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="erp-field xl:col-span-2">
          <span class="erp-field__label">SKU</span>
          <select class="erp-field__control" [(ngModel)]="draft.skuId">
            <option [ngValue]="null">Todos los SKU</option>
            @for (option of catalogs.skus; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>

        <label class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div class="flex items-start gap-3">
            <input class="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" [(ngModel)]="draft.considerarFEFO" />
            <div>
              <p class="font-semibold text-slate-900">Considerar FEFO</p>
              <p class="mt-1 text-xs text-slate-500">Prioriza inventario util con riesgo de vencimiento cercano.</p>
            </div>
          </div>
        </label>

        <label class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div class="flex items-start gap-3">
            <input
              class="mt-1 h-4 w-4 rounded border-slate-300"
              type="checkbox"
              [(ngModel)]="draft.considerarPedidosUrgentes"
            />
            <div>
              <p class="font-semibold text-slate-900">Considerar pedidos urgentes</p>
              <p class="mt-1 text-xs text-slate-500">Empuja prioridades de clientes y rutas con compromiso cercano.</p>
            </div>
          </div>
        </label>
      </div>
    </section>
  `,
})
export class MpsFiltersComponent {
  @Input() set filters(value: MpsPlanFilters) {
    this.draft = { ...value };
  }

  @Input() catalogs: MpsCatalogs = EMPTY_CATALOGS;
  @Input() companyName = 'Empresa activa';

  @Output() readonly apply = new EventEmitter<MpsPlanFilters>();
  @Output() readonly generate = new EventEmitter<MpsPlanFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  draft: MpsPlanFilters = {
    fechaInicio: '',
    fechaFin: '',
    planta: null,
    familia: null,
    skuId: null,
    considerarFEFO: true,
    considerarPedidosUrgentes: true,
  };

  buildPayload(): MpsPlanFilters {
    return {
      fechaInicio: this.draft.fechaInicio,
      fechaFin: this.draft.fechaFin,
      planta: this.draft.planta || null,
      familia: this.draft.familia || null,
      skuId: this.draft.skuId || null,
      considerarFEFO: this.draft.considerarFEFO,
      considerarPedidosUrgentes: this.draft.considerarPedidosUrgentes,
    };
  }
}

const EMPTY_CATALOGS: MpsCatalogs = {
  plants: [],
  families: [],
  skus: [],
  lines: [],
  severities: [],
};
