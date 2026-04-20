import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  BudgetManagementAggregate,
  BudgetManagementCatalogs,
} from '../../../domain/models/budget-management.model';
import { CostCenterCode } from '../../../domain/models/cost-center.model';

export type BudgetManagementFormMode = 'create' | 'edit' | 'adjust';

export interface BudgetManagementFormValue {
  anio: number;
  mes: number;
  centroCosto: CostCenterCode;
  categoria: string;
  tipoAbastecimiento: 'MIR' | 'LOGISTICA';
  moneda: string;
  valorAprobado: number;
  valorAjustado: number;
  referencia: string;
  observaciones: string;
}

@Component({
  selector: 'app-budget-management-form',
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
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Formulario bajo demanda</p>
          <h3 class="erp-section-title">{{ title }}</h3>
          <p class="erp-section-description">{{ description }}</p>
        </div>

        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
          <button type="button" mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="submit.emit(value)">
            {{ saving ? 'Guardando...' : actionLabel }}
          </button>
        </div>
      </div>

      @if (budget) {
        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <article class="erp-meta-card">
            <p class="erp-meta-card__label">Empresa activa</p>
            <p class="erp-meta-card__value">{{ budget.budget.empresaNombre }}</p>
            <p class="erp-meta-card__hint">Registro atado al contexto multiempresa activo.</p>
          </article>
          <article class="erp-meta-card">
            <p class="erp-meta-card__label">Consumido</p>
            <p class="erp-meta-card__value">{{ formatCurrency(budget.execution.valorConsumido) }}</p>
            <p class="erp-meta-card__hint">Base para validar el ajuste antes del cierre.</p>
          </article>
          <article class="erp-meta-card">
            <p class="erp-meta-card__label">Proyección</p>
            <p class="erp-meta-card__value">{{ formatCurrency(budget.execution.proyeccionCierre) }}</p>
            <p class="erp-meta-card__hint">Cierre estimado del periodo seleccionado.</p>
          </article>
        </div>
      }

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Año</mat-label>
          <mat-select formControlName="anio" [disabled]="mode === 'adjust'">
            @for (item of catalogs.years; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mes</mat-label>
          <mat-select formControlName="mes" [disabled]="mode === 'adjust'">
            @for (item of catalogs.months; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Centro de costo</mat-label>
          <mat-select formControlName="centroCosto" [disabled]="mode === 'adjust'">
            @for (item of catalogs.costCenters; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoria" [disabled]="mode === 'adjust'">
            @for (item of catalogs.categories; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de abastecimiento</mat-label>
          <mat-select formControlName="tipoAbastecimiento" [disabled]="mode === 'adjust'">
            @for (item of catalogs.supplyTypes; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Moneda</mat-label>
          <input matInput formControlName="moneda" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Valor aprobado</mat-label>
          <input matInput type="number" formControlName="valorAprobado" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Valor ajustado</mat-label>
          <input matInput type="number" formControlName="valorAjustado" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="xl:col-span-2">
          <mat-label>Referencia</mat-label>
          <input matInput formControlName="referencia" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="xl:col-span-2">
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="3" formControlName="observaciones"></textarea>
        </mat-form-field>
      </form>
    </section>
  `,
})
export class BudgetManagementFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: BudgetManagementFormMode = 'create';
  @Input() budget: BudgetManagementAggregate | null = null;
  @Input() catalogs: BudgetManagementCatalogs = {
    years: [],
    months: [],
    costCenters: [],
    categories: [],
    supplyTypes: [],
    statuses: [],
    severities: [],
  };
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<BudgetManagementFormValue>();
  @Output() readonly close = new EventEmitter<void>();

  readonly form = this.fb.group({
    anio: this.fb.control(new Date().getFullYear(), { nonNullable: true, validators: [Validators.required] }),
    mes: this.fb.control(new Date().getMonth() + 1, { nonNullable: true, validators: [Validators.required] }),
    centroCosto: this.fb.control<CostCenterCode>('PRODUCCION', { nonNullable: true, validators: [Validators.required] }),
    categoria: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    tipoAbastecimiento: this.fb.control<'MIR' | 'LOGISTICA'>('MIR', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    moneda: this.fb.control('COP', { nonNullable: true, validators: [Validators.required] }),
    valorAprobado: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(1000)] }),
    valorAjustado: this.fb.control(0, { nonNullable: true }),
    referencia: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    observaciones: this.fb.control('', { nonNullable: true }),
  });

  get title(): string {
    return this.mode === 'create'
      ? 'Nuevo presupuesto'
      : this.mode === 'edit'
        ? 'Editar presupuesto'
        : 'Ajuste presupuestal';
  }

  get description(): string {
    return this.mode === 'adjust'
      ? 'Actualiza el plan vigente con trazabilidad simple y recalculo inmediato de saldo, desviacion y proyeccion.'
      : 'Registro controlado por periodo, centro, categoria y tipo, sin abrir un CRUD plano por defecto.';
  }

  get actionLabel(): string {
    return this.mode === 'adjust' ? 'Aplicar ajuste' : this.mode === 'edit' ? 'Guardar cambios' : 'Crear presupuesto';
  }

  get value(): BudgetManagementFormValue {
    return this.form.getRawValue() as BudgetManagementFormValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['budget'] || changes['mode']) {
      this.form.patchValue(
        {
          anio: this.budget?.budget.anio ?? new Date().getFullYear(),
          mes: this.budget?.budget.mes ?? new Date().getMonth() + 1,
          centroCosto: this.budget?.budget.centroCosto ?? 'PRODUCCION',
          categoria: this.budget?.budget.categoria ?? '',
          tipoAbastecimiento: this.budget?.budget.tipoAbastecimiento ?? 'MIR',
          moneda: this.budget?.budget.moneda ?? 'COP',
          valorAprobado: this.budget?.budget.valorAprobado ?? 0,
          valorAjustado: this.budget?.budget.valorAjustado ?? 0,
          referencia:
            this.mode === 'adjust'
              ? 'Ajuste presupuestal del periodo'
              : this.budget
                ? 'Edicion presupuestal'
                : 'Presupuesto aprobado inicial',
          observaciones: '',
        },
        { emitEvent: false },
      );
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
