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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_VENDOR_FILTERS, VendorFilters } from '../../../domain/models/vendor-filters.model';
import { EMPTY_VENDOR_CATALOGS, Vendor, VendorCatalogs } from '../../../domain/models/vendor.model';
import { EMPTY_VENDOR_LIST_RESPONSE, VendorListResponse } from '../../../domain/models/vendor-response.model';

@Component({
  selector: 'app-vendors-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
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
            <input matInput formControlName="search" placeholder="Buscar por ID, nombre, tipo, zona o canal" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1fr_0.75fr_0.9fr_0.9fr_0.95fr_0.9fr] xl:items-start">
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
            <mat-label>Zona</mat-label>
            <mat-select formControlName="zona">
              <mat-option [value]="null">Todas</mat-option>
              @for (zone of catalogs.zones; track zone.value) {
                <mat-option [value]="zone.value">{{ zone.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Canal</mat-label>
            <mat-select formControlName="canal">
              <mat-option [value]="null">Todos</mat-option>
              @for (channel of catalogs.channels; track channel.value) {
                <mat-option [value]="channel.value">{{ channel.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="erp-meta-card xl:col-span-2 xl:mt-1">
            {{ response.total }} vendedores en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando vendedores...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de vendedores.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra zona, canal, estado o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">badge</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay vendedores registrados.</p>
              <p class="mt-1 text-sm">Crea el primer vendedor de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear vendedor
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1560px] text-sm">
              <thead>
                <tr>
                  <th>ID vendedor</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Zona</th>
                  <th>Canal</th>
                  <th>Ciudad</th>
                  <th># Clientes</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (vendor of response.items; track vendor.id) {
                  <tr [class.bg-slate-50]="selectedVendorId === vendor.id">
                    <td class="font-semibold text-slate-900">{{ vendor.idVendedor }}</td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ vendor.nombreVendedor }}</div>
                      @if (vendor.email) {
                        <div class="mt-1 text-xs text-slate-500">{{ vendor.email }}</div>
                      }
                    </td>
                    <td><span class="erp-chip erp-chip--neutral">{{ vendor.tipoVendedor }}</span></td>
                    <td><span class="erp-chip erp-chip--neutral">{{ vendor.zona }}</span></td>
                    <td>{{ vendor.canal }}</td>
                    <td>{{ vendor.ciudadNombre || 'Sin ciudad' }}</td>
                    <td>{{ vendor.cantidadClientesAsignados }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="vendor.estado === 'ACTIVO'" [class.erp-chip--warning]="vendor.estado === 'INACTIVO'">
                        {{ vendor.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Cargar"
                          [disabled]="isBusy(vendor.id)"
                          (click)="selectVendor.emit(vendor)"
                        >
                          <mat-icon>visibility</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Editar"
                          [disabled]="isBusy(vendor.id)"
                          (click)="editVendor.emit(vendor)"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Eliminar"
                          [disabled]="isBusy(vendor.id)"
                          (click)="deleteVendor.emit(vendor)"
                        >
                          <mat-icon>{{ deletingId === vendor.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                          [class.border-amber-200]="vendor.estado === 'ACTIVO'"
                          [class.text-amber-700]="vendor.estado === 'ACTIVO'"
                          [class.bg-amber-50]="vendor.estado === 'ACTIVO'"
                          [class.border-emerald-200]="vendor.estado === 'INACTIVO'"
                          [class.text-emerald-700]="vendor.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="vendor.estado === 'INACTIVO'"
                          [disabled]="isBusy(vendor.id)"
                          (click)="toggleStatus.emit(vendor)"
                        >
                          <mat-icon class="text-base">
                            {{ vendor.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}
                          </mat-icon>
                          <span>
                            {{
                              statusUpdatingId === vendor.id
                                ? 'Procesando...'
                                : vendor.estado === 'ACTIVO'
                                  ? 'Inactivar'
                                  : 'Activar'
                            }}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="9" class="!p-0">
                      <mat-accordion class="block border-t border-slate-100">
                        <mat-expansion-panel class="!shadow-none">
                          <mat-expansion-panel-header>
                            <mat-panel-title>Clientes asociados</mat-panel-title>
                            <mat-panel-description>
                              {{ vendor.cantidadClientesAsignados }} asignados en {{ vendor.zona }}
                            </mat-panel-description>
                          </mat-expansion-panel-header>

                          @if (vendor.clientesAsignados.length) {
                            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              @for (client of vendor.clientesAsignados; track client.clientId) {
                                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p class="text-sm font-semibold text-slate-900">{{ client.nombre }}</p>
                                  <p class="mt-1 text-xs text-slate-500">{{ client.idCliente }}</p>
                                  <p class="mt-2 text-xs text-slate-500">
                                    {{ client.zona }}{{ client.ciudadNombre ? ' · ' + client.ciudadNombre : '' }}
                                  </p>
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="erp-empty-state !min-h-[9rem] !rounded-[1rem] !border-dashed !bg-white">
                              <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">groups</mat-icon>
                              <div>
                                <p class="text-sm font-semibold text-slate-700">No hay clientes asociados.</p>
                                <p class="mt-1 text-xs text-slate-500">Este vendedor aún no tiene asignación comercial.</p>
                              </div>
                            </div>
                          }
                        </mat-expansion-panel>
                      </mat-accordion>
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
export class VendorsListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: VendorFilters = { ...DEFAULT_VENDOR_FILTERS };
  @Input() catalogs: VendorCatalogs = EMPTY_VENDOR_CATALOGS;
  @Input() response: VendorListResponse = EMPTY_VENDOR_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedVendorId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<VendorFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectVendor = new EventEmitter<Vendor>();
  @Output() editVendor = new EventEmitter<Vendor>();
  @Output() deleteVendor = new EventEmitter<Vendor>();
  @Output() toggleStatus = new EventEmitter<Vendor>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    zona: this.fb.control<string | null>(null),
    canal: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          zona: this.filters.zona ?? null,
          canal: this.filters.canal ?? null,
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
      zona: value.zona,
      canal: value.canal,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        estado: 'TODOS',
        zona: null,
        canal: null,
      },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      zona: null,
      canal: null,
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
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.zona || value.canal);
  }

  isBusy(vendorId: string): boolean {
    return this.deletingId === vendorId || this.statusUpdatingId === vendorId;
  }
}