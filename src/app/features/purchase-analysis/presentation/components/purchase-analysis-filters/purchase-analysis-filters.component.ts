import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_PURCHASE_ANALYSIS_FILTERS, PurchaseAnalysisFilters } from '../../../domain/models/purchase-analysis-filters.model';
import { PurchaseAnalysisCatalogs } from '../../../domain/models/purchase-analysis.model';

@Component({
  selector: 'app-purchase-analysis-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Filtros avanzados</p>
          <h3 class="erp-section-title">Abastecimiento estrategico</h3>
          <p class="erp-section-description">Recorta el analisis por proveedor, categoria, tipo, ciudad y severidad.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-flat-button color="primary" (click)="refresh.emit(value)">Actualizar</button>
        </div>
      </div>
      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline"><mat-label>Fecha desde</mat-label><input matInput type="date" formControlName="fechaDesde" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Fecha hasta</mat-label><input matInput type="date" formControlName="fechaHasta" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Proveedor</mat-label><mat-select formControlName="proveedorId"><mat-option [value]="null">Todos</mat-option>@for (item of catalogs.providers; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Categoria</mat-label><mat-select formControlName="categoria"><mat-option [value]="null">Todas</mat-option>@for (item of catalogs.categories; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Tipo</mat-label><mat-select formControlName="tipoAbastecimiento"><mat-option [value]="null">Todos</mat-option>@for (item of catalogs.supplyTypes; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Ciudad</mat-label><mat-select formControlName="ciudad"><mat-option [value]="null">Todas</mat-option>@for (item of catalogs.cities; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Severidad</mat-label><mat-select formControlName="severidad">@for (item of catalogs.severities; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
      </form>
      <div class="mt-4">
        <button type="button" mat-stroked-button (click)="apply.emit(value)">Aplicar filtros</button>
      </div>
    </section>
  `,
})
export class PurchaseAnalysisFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  @Input({ required: true }) catalogs: PurchaseAnalysisCatalogs = { providers: [], categories: [], supplyTypes: [], cities: [], severities: [] };
  @Input({ required: true }) filters: PurchaseAnalysisFilters = { ...DEFAULT_PURCHASE_ANALYSIS_FILTERS };
  @Output() readonly apply = new EventEmitter<PurchaseAnalysisFilters>();
  @Output() readonly refresh = new EventEmitter<PurchaseAnalysisFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    fechaDesde: this.fb.control(DEFAULT_PURCHASE_ANALYSIS_FILTERS.fechaDesde, { nonNullable: true }),
    fechaHasta: this.fb.control(DEFAULT_PURCHASE_ANALYSIS_FILTERS.fechaHasta, { nonNullable: true }),
    proveedorId: this.fb.control<string | null>(null),
    categoria: this.fb.control<string | null>(null),
    tipoAbastecimiento: this.fb.control<'MIR' | 'LOGISTICA' | null>(null),
    ciudad: this.fb.control<string | null>(null),
    severidad: this.fb.control<'ALTA' | 'MEDIA' | 'BAJA' | 'TODAS'>('TODAS', { nonNullable: true }),
  });

  get value(): PurchaseAnalysisFilters {
    return this.form.getRawValue() as PurchaseAnalysisFilters;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
