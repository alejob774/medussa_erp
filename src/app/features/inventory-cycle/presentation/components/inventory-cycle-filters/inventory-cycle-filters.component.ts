import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_INVENTORY_CYCLE_FILTERS,
  InventoryCycleFilters,
} from '../../../domain/models/inventory-cycle-filters.model';
import { InventoryCycleCatalogs } from '../../../domain/models/inventory-cycle-response.model';

@Component({
  selector: 'app-inventory-cycle-filters',
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
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Filtros de conteo</p>
          <h3 class="erp-section-title">Corte por bodega, ubicacion, lote y severidad</h3>
          <p class="erp-section-description">
            Enfoca la bandeja operativa sobre los lotes y ubicaciones donde el layout ya muestra tension.
          </p>
        </div>

        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-flat-button color="primary" (click)="apply.emit(value)">Aplicar</button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Bodega</mat-label>
          <mat-select formControlName="bodegaId">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.warehouses; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ubicacion</mat-label>
          <mat-select formControlName="ubicacionId">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.locations; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>SKU</mat-label>
          <mat-select formControlName="sku">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.skus; track item.skuId) {
              <mat-option [value]="item.sku">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Lote</mat-label>
          <mat-select formControlName="loteId">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.lots; track item.lotId) {
              <mat-option [value]="item.lotId">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="estado">
            @for (item of catalogs.states; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha desde</mat-label>
          <input matInput type="date" formControlName="fechaDesde" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha hasta</mat-label>
          <input matInput type="date" formControlName="fechaHasta" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Severidad alerta</mat-label>
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
export class InventoryCycleFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() filters: InventoryCycleFilters = { ...DEFAULT_INVENTORY_CYCLE_FILTERS };
  @Input() catalogs: InventoryCycleCatalogs = {
    warehouses: [],
    locations: [],
    skus: [],
    lots: [],
    states: [],
    severities: [],
  };

  @Output() readonly apply = new EventEmitter<InventoryCycleFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    bodegaId: this.fb.control<string | null>(null),
    ubicacionId: this.fb.control<string | null>(null),
    sku: this.fb.control<string | null>(null),
    loteId: this.fb.control<string | null>(null),
    estado: this.fb.control<InventoryCycleFilters['estado']>('TODOS', { nonNullable: true }),
    fechaDesde: this.fb.control('', { nonNullable: true }),
    fechaHasta: this.fb.control('', { nonNullable: true }),
    severidad: this.fb.control<InventoryCycleFilters['severidad']>('TODAS', { nonNullable: true }),
  });

  get value(): InventoryCycleFilters {
    return this.form.getRawValue() as InventoryCycleFilters;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
