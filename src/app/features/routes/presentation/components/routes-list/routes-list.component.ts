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
import { DEFAULT_ROUTE_FILTERS, RouteFilters } from '../../../domain/models/route-filters.model';
import { EMPTY_ROUTE_CATALOGS, Route, RouteCatalogs } from '../../../domain/models/route.model';
import {
  EMPTY_ROUTE_LIST_RESPONSE,
  RouteListResponse,
} from '../../../domain/models/route-response.model';

@Component({
  selector: 'app-routes-list',
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
            <input matInput formControlName="search" placeholder="Buscar por ID, nombre, zona, vendedor o conductor" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.05fr_0.75fr_0.95fr_0.95fr_0.95fr_0.8fr] xl:items-start">
          <mat-form-field appearance="outline">
            <mat-label>Empresa</mat-label>
            <input matInput [value]="activeCompanyName" disabled />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="TODOS">Todos</mat-option>
              <mat-option value="ACTIVO">Activas</mat-option>
              <mat-option value="INACTIVO">Inactivas</mat-option>
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
            <mat-label>Vendedor</mat-label>
            <mat-select formControlName="vendedorId">
              <mat-option [value]="null">Todos</mat-option>
              @for (vendor of catalogs.vendors; track vendor.vendorId) {
                <mat-option [value]="vendor.vendorId">{{ vendor.idVendedor }} · {{ vendor.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Conductor</mat-label>
            <mat-select formControlName="conductorId">
              <mat-option [value]="null">Todos</mat-option>
              @for (driver of catalogs.drivers; track driver.driverId) {
                <mat-option [value]="driver.driverId">{{ driver.idConductor }} · {{ driver.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="erp-meta-card xl:mt-1">
            {{ response.total }} rutas en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando rutas...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de rutas.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra zona, estado, vendedor, conductor o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">route</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay rutas registradas</p>
              <p class="mt-1 text-sm">Crea la primera ruta de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear ruta
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1580px] text-sm">
              <thead>
                <tr>
                  <th>ID ruta</th>
                  <th>Nombre</th>
                  <th>Zona</th>
                  <th>Vendedor</th>
                  <th>Conductor</th>
                  <th># Clientes</th>
                  <th>Días de ruta</th>
                  <th>Días de despacho</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (route of response.items; track route.id) {
                  <tr [class.bg-slate-50]="selectedRouteId === route.id">
                    <td class="font-semibold text-slate-900">{{ route.idRuta }}</td>
                    <td><div class="font-semibold text-slate-900">{{ route.nombreRuta }}</div></td>
                    <td><span class="erp-chip erp-chip--neutral">{{ route.zona }}</span></td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ route.vendedorNombre }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ route.vendedorCodigo }}</div>
                    </td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ route.conductorNombre }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ route.conductorCodigo }}</div>
                    </td>
                    <td>{{ route.cantidadClientesAsignados }}</td>
                    <td>{{ route.diasRuta.length ? route.diasRuta.join(', ') : 'Sin programación' }}</td>
                    <td>{{ route.diasDespacho.length ? route.diasDespacho.join(', ') : 'Sin programación' }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="route.estado === 'ACTIVO'" [class.erp-chip--warning]="route.estado === 'INACTIVO'">
                        {{ route.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button type="button" class="erp-icon-button" title="Ver" [disabled]="isBusy(route.id)" (click)="selectRoute.emit(route)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Editar" [disabled]="isBusy(route.id)" (click)="editRoute.emit(route)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Eliminar" [disabled]="isBusy(route.id)" (click)="deleteRoute.emit(route)">
                          <mat-icon>{{ deletingId === route.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                          [class.border-amber-200]="route.estado === 'ACTIVO'"
                          [class.text-amber-700]="route.estado === 'ACTIVO'"
                          [class.bg-amber-50]="route.estado === 'ACTIVO'"
                          [class.border-emerald-200]="route.estado === 'INACTIVO'"
                          [class.text-emerald-700]="route.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="route.estado === 'INACTIVO'"
                          [disabled]="isBusy(route.id)"
                          (click)="toggleStatus.emit(route)"
                        >
                          <mat-icon class="text-base">
                            {{ route.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}
                          </mat-icon>
                          <span>
                            {{
                              statusUpdatingId === route.id
                                ? 'Procesando...'
                                : route.estado === 'ACTIVO'
                                  ? 'Inactivar'
                                  : 'Activar'
                            }}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="10" class="!p-0">
                      <mat-accordion class="block border-t border-slate-100">
                        <mat-expansion-panel class="!shadow-none">
                          <mat-expansion-panel-header>
                            <mat-panel-title>Clientes asignados</mat-panel-title>
                            <mat-panel-description>{{ route.cantidadClientesAsignados }} vinculados a la ruta</mat-panel-description>
                          </mat-expansion-panel-header>

                          @if (route.clientesAsignados.length) {
                            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              @for (client of route.clientesAsignados; track client.clientId) {
                                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p class="text-sm font-semibold text-slate-900">{{ client.nombre }}</p>
                                  <p class="mt-1 text-xs text-slate-500">{{ client.idCliente }}</p>
                                  <p class="mt-2 text-xs text-slate-500">{{ client.zona }}{{ client.ciudadNombre ? ' · ' + client.ciudadNombre : '' }}</p>
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="erp-empty-state !min-h-[9rem] !rounded-[1rem] !border-dashed !bg-white">
                              <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">groups</mat-icon>
                              <div>
                                <p class="text-sm font-semibold text-slate-700">No hay clientes asociados.</p>
                                <p class="mt-1 text-xs text-slate-500">La ruta aún no tiene asignación comercial guardada.</p>
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
export class RoutesListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: RouteFilters = { ...DEFAULT_ROUTE_FILTERS };
  @Input() catalogs: RouteCatalogs = EMPTY_ROUTE_CATALOGS;
  @Input() response: RouteListResponse = EMPTY_ROUTE_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedRouteId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<RouteFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectRoute = new EventEmitter<Route>();
  @Output() editRoute = new EventEmitter<Route>();
  @Output() deleteRoute = new EventEmitter<Route>();
  @Output() toggleStatus = new EventEmitter<Route>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    zona: this.fb.control<string | null>(null),
    vendedorId: this.fb.control<string | null>(null),
    conductorId: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          zona: this.filters.zona ?? null,
          vendedorId: this.filters.vendedorId ?? null,
          conductorId: this.filters.conductorId ?? null,
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
      vendedorId: value.vendedorId,
      conductorId: value.conductorId,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      { search: '', estado: 'TODOS', zona: null, vendedorId: null, conductorId: null },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      zona: null,
      vendedorId: null,
      conductorId: null,
      page: 0,
    });
  }

  handlePageChange(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, pageSize: event.pageSize });
  }

  hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.zona || value.vendedorId || value.conductorId);
  }

  isBusy(routeId: string): boolean {
    return this.deletingId === routeId || this.statusUpdatingId === routeId;
  }
}
