import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_PRODUCT_DEVELOPMENT_FILTERS,
  ProductDevelopmentFilters,
} from '../../../domain/models/product-development-filters.model';
import { ProductDevelopmentCatalogs } from '../../../domain/models/product-development-project.model';

@Component({
  selector: 'app-product-development-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Portafolio</p>
          <h3 class="erp-section-title">Filtros de innovacion</h3>
          <p class="erp-section-description">Estado, viabilidad, riesgo y ventana de lanzamiento del pipeline.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(value)">Aplicar filtros</button>
        </div>
      </div>
      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="estado">
            <mat-option value="TODOS">Todos</mat-option>
            @for (item of catalogs.statuses; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <mat-select formControlName="categoria">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.categories; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Responsable</mat-label>
          <mat-select formControlName="responsable">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.responsables; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Lanzamiento desde</mat-label>
          <input matInput type="date" formControlName="fechaLanzamientoDesde" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Lanzamiento hasta</mat-label>
          <input matInput type="date" formControlName="fechaLanzamientoHasta" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Viabilidad</mat-label>
          <mat-select formControlName="viabilidad">
            <mat-option value="TODAS">Todas</mat-option>
            @for (item of catalogs.viabilities; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Riesgo abastecimiento</mat-label>
          <mat-select formControlName="riesgoAbastecimiento">
            <mat-option value="TODOS">Todos</mat-option>
            @for (item of catalogs.riskLevels; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </section>
  `,
})
export class ProductDevelopmentFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) catalogs: ProductDevelopmentCatalogs = {
    categories: [],
    targetMarkets: [],
    responsables: [],
    units: [],
    suppliers: [],
    statuses: [],
    viabilities: [],
    riskLevels: [],
  };
  @Input({ required: true }) filters: ProductDevelopmentFilters = { ...DEFAULT_PRODUCT_DEVELOPMENT_FILTERS };

  @Output() readonly apply = new EventEmitter<ProductDevelopmentFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    estado: this.fb.control<'TODOS' | any>('TODOS', { nonNullable: true }),
    categoria: this.fb.control<string | null>(null),
    responsable: this.fb.control<string | null>(null),
    fechaLanzamientoDesde: this.fb.control<string | null>(null),
    fechaLanzamientoHasta: this.fb.control<string | null>(null),
    viabilidad: this.fb.control<'TODAS' | any>('TODAS', { nonNullable: true }),
    riesgoAbastecimiento: this.fb.control<'TODOS' | any>('TODOS', { nonNullable: true }),
  });

  get value(): ProductDevelopmentFilters {
    return this.form.getRawValue() as ProductDevelopmentFilters;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
