import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_BUDGET_MANAGEMENT_FILTERS,
  BudgetManagementFilters,
} from '../../../domain/models/budget-management-filters.model';
import { BudgetManagementCatalogs } from '../../../domain/models/budget-management.model';
import { CostCenterCode } from '../../../domain/models/cost-center.model';

@Component({
  selector: 'app-budget-management-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Filtros presupuestales</p>
          <h3 class="erp-section-title">Recorte ejecutivo del gasto</h3>
          <p class="erp-section-description">
            Analiza presupuesto, consumo, riesgo y proyección por periodo, centro, categoría y tipo.
          </p>
        </div>

        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(value)">
            Aplicar filtros
          </button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Año</mat-label>
          <mat-select formControlName="anio">
            @for (item of catalogs.years; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mes</mat-label>
          <mat-select formControlName="mes">
            @for (item of catalogs.months; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Centro de costo</mat-label>
          <mat-select formControlName="centroCosto">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.costCenters; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoria">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.categories; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="tipoAbastecimiento">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.supplyTypes; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="estado">
            @for (item of catalogs.statuses; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Severidad</mat-label>
          <mat-select formControlName="severidad">
            @for (item of catalogs.severities; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </section>
  `,
})
export class BudgetManagementFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) catalogs: BudgetManagementCatalogs = {
    years: [],
    months: [],
    costCenters: [],
    categories: [],
    supplyTypes: [],
    statuses: [],
    severities: [],
  };
  @Input({ required: true }) filters: BudgetManagementFilters = {
    ...DEFAULT_BUDGET_MANAGEMENT_FILTERS,
  };

  @Output() readonly apply = new EventEmitter<BudgetManagementFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    anio: this.fb.control(DEFAULT_BUDGET_MANAGEMENT_FILTERS.anio, { nonNullable: true }),
    mes: this.fb.control(DEFAULT_BUDGET_MANAGEMENT_FILTERS.mes, { nonNullable: true }),
    centroCosto: this.fb.control<CostCenterCode | null>(null),
    categoria: this.fb.control<string | null>(null),
    tipoAbastecimiento: this.fb.control<'MIR' | 'LOGISTICA' | null>(null),
    estado: this.fb.control<'TODOS' | 'CONTROLADO' | 'AJUSTADO' | 'EN_RIESGO' | 'SOBREGASTO'>(
      'TODOS',
      { nonNullable: true },
    ),
    severidad: this.fb.control<'TODAS' | 'ALTA' | 'MEDIA' | 'BAJA'>('TODAS', {
      nonNullable: true,
    }),
  });

  get value(): BudgetManagementFilters {
    return this.form.getRawValue() as BudgetManagementFilters;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
