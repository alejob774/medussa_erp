import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_PRODUCT_FILTERS, ProductFilters } from '../../../domain/models/product-filters.model';
import { EMPTY_PRODUCT_CATALOGS, Product, ProductCatalogs } from '../../../domain/models/product.model';
import {
  EMPTY_PRODUCT_LIST_RESPONSE,
  ProductListResponse,
} from '../../../domain/models/product-response.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <section class="erp-filter-panel">
      <form class="space-y-5" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
        <div class="flex flex-wrap items-start gap-3 xl:flex-nowrap xl:items-center">
          <mat-form-field appearance="outline" class="min-w-[280px] flex-1">
            <mat-label>Búsqueda</mat-label>
            <input matInput formControlName="search" placeholder="Buscar por SKU, nombre, descripción o referencia" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr] xl:items-start">
          <mat-form-field appearance="outline">
            <mat-label>Empresa</mat-label>
            <input matInput [value]="activeCompanyName" disabled />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="TODOS">Todos</mat-option>
              <mat-option value="ACTIVO">Activos</mat-option>
              <mat-option value="INACTIVO">Inactivos</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Familia</mat-label>
            <mat-select formControlName="familia">
              <mat-option [value]="null">Todas</mat-option>
              @for (family of catalogs.families; track family.value) {
                <mat-option [value]="family.value">{{ family.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="erp-meta-card xl:mt-1">
            {{ response.total }} registros en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando productos...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de productos.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra familia, estado o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">inventory_2</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay productos registrados todavía.</p>
              <p class="mt-1 text-sm">Crea el primer producto de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear producto
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1320px] text-sm">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Familia</th>
                  <th>Descripción</th>
                  <th>UOM</th>
                  <th>Lote</th>
                  <th>Vencimiento</th>
                  <th>Precio bruto</th>
                  <th>Precio neto</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (product of response.items; track product.id) {
                  <tr [class.bg-slate-50]="selectedProductId === product.id">
                    <td class="font-semibold text-slate-900">{{ product.sku }}</td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ product.nombre }}</div>
                      @if (product.referencia) {
                        <div class="mt-1 text-xs text-slate-500">Ref. {{ product.referencia }}</div>
                      }
                    </td>
                    <td>
                      <span class="erp-chip erp-chip--neutral">{{ product.familia }}</span>
                    </td>
                    <td class="max-w-[260px]">
                      <span class="line-clamp-2">{{ product.descripcion }}</span>
                    </td>
                    <td>{{ product.unidadBase }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--info]="product.manejaLote" [class.erp-chip--neutral]="!product.manejaLote">
                        {{ product.manejaLote ? 'Sí' : 'No' }}
                      </span>
                    </td>
                    <td>
                      <div class="space-y-1">
                        <span class="erp-chip" [class.erp-chip--info]="product.manejaVencimiento" [class.erp-chip--neutral]="!product.manejaVencimiento">
                          {{ product.manejaVencimiento ? 'Sí' : 'No' }}
                        </span>
                        @if (product.manejaVencimiento && product.vidaUtilDias) {
                          <div class="text-xs text-slate-500">{{ product.vidaUtilDias }} días</div>
                        }
                      </div>
                    </td>
                    <td>{{ formatCurrency(product.precioBruto) }}</td>
                    <td>{{ formatCurrency(product.precioNeto) }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="product.estado === 'ACTIVO'" [class.erp-chip--warning]="product.estado === 'INACTIVO'">
                        {{ product.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Cargar"
                          [disabled]="isBusy(product.id)"
                          (click)="selectProduct.emit(product)"
                        >
                          <mat-icon>visibility</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Editar"
                          [disabled]="isBusy(product.id)"
                          (click)="editProduct.emit(product)"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Eliminar"
                          [disabled]="isBusy(product.id)"
                          (click)="deleteProduct.emit(product)"
                        >
                          <mat-icon>{{ deletingId === product.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-row-action"
                          [class.border-amber-200]="product.estado === 'ACTIVO'"
                          [class.text-amber-700]="product.estado === 'ACTIVO'"
                          [class.bg-amber-50]="product.estado === 'ACTIVO'"
                          [class.border-emerald-200]="product.estado === 'INACTIVO'"
                          [class.text-emerald-700]="product.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="product.estado === 'INACTIVO'"
                          [disabled]="isBusy(product.id)"
                          (click)="toggleStatus.emit(product)"
                        >
                          <mat-icon class="text-base">
                            {{ product.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}
                          </mat-icon>
                          <span>
                            {{ statusUpdatingId === product.id ? 'Procesando...' : product.estado === 'ACTIVO' ? 'Inactivar' : 'Activar' }}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <mat-paginator
            [length]="response.total"
            [pageIndex]="response.page"
            [pageSize]="response.pageSize"
            [pageSizeOptions]="pageSizeOptions"
            (page)="handlePageChange($event)"
          ></mat-paginator>
        }
      </div>
    </section>
  `,
})
export class ProductsListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: ProductFilters = { ...DEFAULT_PRODUCT_FILTERS };
  @Input() catalogs: ProductCatalogs = EMPTY_PRODUCT_CATALOGS;
  @Input() response: ProductListResponse = EMPTY_PRODUCT_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedProductId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<ProductFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectProduct = new EventEmitter<Product>();
  @Output() editProduct = new EventEmitter<Product>();
  @Output() deleteProduct = new EventEmitter<Product>();
  @Output() toggleStatus = new EventEmitter<Product>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    familia: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          familia: this.filters.familia ?? null,
        },
        { emitEvent: false },
      );
    }
  }

  applyFilters(): void {
    const value = this.filterForm.getRawValue();

    this.filtersChange.emit({
      ...this.filters,
      search: value.search?.trim() ?? '',
      estado: value.estado,
      familia: value.familia,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        estado: 'TODOS',
        familia: null,
      },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      familia: null,
      page: 0,
    });
  }

  handlePageChange(event: PageEvent): void {
    this.pageChange.emit({
      page: event.pageIndex,
      pageSize: event.pageSize,
    });
  }

  hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.familia);
  }

  isBusy(productId: string): boolean {
    return this.deletingId === productId || this.statusUpdatingId === productId;
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Sin definir';
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
