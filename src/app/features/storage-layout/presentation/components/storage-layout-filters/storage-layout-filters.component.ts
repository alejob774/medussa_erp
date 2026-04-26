import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_STORAGE_LAYOUT_FILTERS,
  StorageLayoutFilters,
} from '../../../domain/models/storage-layout-filters.model';
import { StorageLayoutCatalogs } from '../../../domain/models/storage-layout-response.model';

@Component({
  selector: 'app-storage-layout-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Filtros operativos</p>
          <h3 class="erp-section-title">Lectura por bodega, zona y criticidad</h3>
          <p class="erp-section-description">
            Cruza ocupacion, restriccion sanitaria, SKU y categoria ABC para detectar zonas de riesgo.
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
          <mat-label>Zona</mat-label>
          <mat-select formControlName="zona">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.zones; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo almacenamiento</mat-label>
          <mat-select formControlName="tipoAlmacenamiento">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.storageTypes; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Restriccion sanitaria</mat-label>
          <mat-select formControlName="restriccionSanitaria">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.sanitaryRestrictions; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ocupacion</mat-label>
          <mat-select formControlName="ocupacion">
            @for (item of catalogs.occupancyStates; track item.value) {
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
          <mat-label>Categoria ABC</mat-label>
          <mat-select formControlName="categoriaABC">
            @for (item of catalogs.abcCategories; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </section>
  `,
})
export class StorageLayoutFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() filters: StorageLayoutFilters = { ...DEFAULT_STORAGE_LAYOUT_FILTERS };
  @Input() catalogs: StorageLayoutCatalogs = {
    warehouses: [],
    zones: [],
    storageTypes: [],
    sanitaryRestrictions: [],
    occupancyStates: [],
    skus: [],
    abcCategories: [],
    warehouseTypes: [],
    warehouseStatuses: [],
    locationStatuses: [],
    priorities: [],
  };

  @Output() readonly apply = new EventEmitter<StorageLayoutFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    bodegaId: this.fb.control<string | null>(null),
    zona: this.fb.control<string | null>(null),
    tipoAlmacenamiento: this.fb.control<StorageLayoutFilters['tipoAlmacenamiento']>(null),
    restriccionSanitaria: this.fb.control<StorageLayoutFilters['restriccionSanitaria']>(null),
    ocupacion: this.fb.control<StorageLayoutFilters['ocupacion']>('TODAS', { nonNullable: true }),
    sku: this.fb.control<string | null>(null),
    categoriaABC: this.fb.control<StorageLayoutFilters['categoriaABC']>('TODAS', { nonNullable: true }),
  });

  get value(): StorageLayoutFilters {
    return this.form.getRawValue() as StorageLayoutFilters;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
