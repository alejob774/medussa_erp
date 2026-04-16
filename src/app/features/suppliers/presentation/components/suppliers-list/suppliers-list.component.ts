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
import { DEFAULT_SUPPLIER_FILTERS, SupplierFilters } from '../../../domain/models/supplier-filters.model';
import {
  EMPTY_SUPPLIER_CATALOGS,
  Supplier,
  SupplierCatalogs,
} from '../../../domain/models/supplier.model';
import {
  EMPTY_SUPPLIER_LIST_RESPONSE,
  SupplierListResponse,
} from '../../../domain/models/supplier-response.model';

@Component({
  selector: 'app-suppliers-list',
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
            <input matInput formControlName="search" placeholder="Buscar por NIT, nombre, ciudad o producto principal" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.05fr_0.8fr_0.95fr_0.95fr_0.95fr_0.8fr] xl:items-start">
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
            <mat-label>Ciudad</mat-label>
            <mat-select formControlName="ciudadId">
              <mat-option [value]="null">Todas</mat-option>
              @for (city of catalogs.cities; track city.id) {
                <mat-option [value]="city.id">{{ city.name }}{{ city.department ? ' · ' + city.department : '' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo abastecimiento</mat-label>
            <mat-select formControlName="tipoAbastecimiento">
              <mat-option [value]="null">Todos</mat-option>
              @for (option of catalogs.supplyTypes; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Producto principal</mat-label>
            <mat-select formControlName="productoPrincipal">
              <mat-option [value]="null">Todos</mat-option>
              @for (option of catalogs.productOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="erp-meta-card xl:mt-1">
            {{ response.total }} proveedores en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando proveedores...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de proveedores.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra ciudad, tipo, producto o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">factory</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay proveedores registrados</p>
              <p class="mt-1 text-sm">Crea el primer proveedor de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear proveedor
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1440px] text-sm">
              <thead>
                <tr>
                  <th>NIT</th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Producto principal</th>
                  <th>Tipo abastecimiento</th>
                  <th>Lead time</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (supplier of response.items; track supplier.id) {
                  <tr [class.bg-slate-50]="selectedSupplierId === supplier.id">
                    <td class="font-semibold text-slate-900">{{ supplier.nit }}</td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ supplier.nombreProveedor }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ supplier.telefono }}</div>
                    </td>
                    <td>{{ supplier.ciudadNombre || 'Sin ciudad' }}</td>
                    <td>{{ supplier.productoPrincipal }}</td>
                    <td><span class="erp-chip erp-chip--neutral">{{ supplier.tipoAbastecimiento }}</span></td>
                    <td>{{ supplier.leadTimeDias !== null && supplier.leadTimeDias !== undefined ? supplier.leadTimeDias + ' días' : 'Sin dato' }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="supplier.estado === 'ACTIVO'" [class.erp-chip--warning]="supplier.estado === 'INACTIVO'">
                        {{ supplier.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button type="button" class="erp-icon-button" title="Ver" [disabled]="isBusy(supplier.id)" (click)="selectSupplier.emit(supplier)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Editar" [disabled]="isBusy(supplier.id)" (click)="editSupplier.emit(supplier)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Eliminar" [disabled]="isBusy(supplier.id)" (click)="deleteSupplier.emit(supplier)">
                          <mat-icon>{{ deletingId === supplier.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                          [class.border-amber-200]="supplier.estado === 'ACTIVO'"
                          [class.text-amber-700]="supplier.estado === 'ACTIVO'"
                          [class.bg-amber-50]="supplier.estado === 'ACTIVO'"
                          [class.border-emerald-200]="supplier.estado === 'INACTIVO'"
                          [class.text-emerald-700]="supplier.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="supplier.estado === 'INACTIVO'"
                          [disabled]="isBusy(supplier.id)"
                          (click)="toggleStatus.emit(supplier)"
                        >
                          <mat-icon class="text-base">{{ supplier.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}</mat-icon>
                          <span>
                            {{
                              statusUpdatingId === supplier.id
                                ? 'Procesando...'
                                : supplier.estado === 'ACTIVO'
                                  ? 'Inactivar'
                                  : 'Activar'
                            }}
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
export class SuppliersListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: SupplierFilters = { ...DEFAULT_SUPPLIER_FILTERS };
  @Input() catalogs: SupplierCatalogs = EMPTY_SUPPLIER_CATALOGS;
  @Input() response: SupplierListResponse = EMPTY_SUPPLIER_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedSupplierId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<SupplierFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectSupplier = new EventEmitter<Supplier>();
  @Output() editSupplier = new EventEmitter<Supplier>();
  @Output() deleteSupplier = new EventEmitter<Supplier>();
  @Output() toggleStatus = new EventEmitter<Supplier>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    ciudadId: this.fb.control<string | null>(null),
    tipoAbastecimiento: this.fb.control<'MIR' | 'LOGISTICA' | null>(null),
    productoPrincipal: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          ciudadId: this.filters.ciudadId ?? null,
          tipoAbastecimiento: this.filters.tipoAbastecimiento ?? null,
          productoPrincipal: this.filters.productoPrincipal ?? null,
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
      ciudadId: value.ciudadId,
      tipoAbastecimiento: value.tipoAbastecimiento,
      productoPrincipal: value.productoPrincipal,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      { search: '', estado: 'TODOS', ciudadId: null, tipoAbastecimiento: null, productoPrincipal: null },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      ciudadId: null,
      tipoAbastecimiento: null,
      productoPrincipal: null,
      page: 0,
    });
  }

  handlePageChange(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, pageSize: event.pageSize });
  }

  hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.ciudadId || value.tipoAbastecimiento || value.productoPrincipal);
  }

  isBusy(supplierId: string): boolean {
    return this.deletingId === supplierId || this.statusUpdatingId === supplierId;
  }
}
