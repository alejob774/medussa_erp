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
import { DEFAULT_DRIVER_FILTERS, DriverFilters } from '../../../domain/models/driver-filters.model';
import { Driver, DriverCatalogs, EMPTY_DRIVER_CATALOGS } from '../../../domain/models/driver.model';
import { DriverListResponse, EMPTY_DRIVER_LIST_RESPONSE } from '../../../domain/models/driver-response.model';

@Component({
  selector: 'app-drivers-list',
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
            <input matInput formControlName="search" placeholder="Buscar por ID, nombre, documento, ciudad o celular" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.05fr_0.8fr_0.9fr_0.9fr] xl:items-start">
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

          <div class="erp-meta-card xl:mt-1">
            {{ response.total }} conductores en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando conductores...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de conductores.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra ciudad, estado o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">delivery_dining</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay conductores registrados.</p>
              <p class="mt-1 text-sm">Crea el primer conductor de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear conductor
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1420px] text-sm">
              <thead>
                <tr>
                  <th>ID conductor</th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Celular</th>
                  <th># Rutas</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (driver of response.items; track driver.id) {
                  <tr [class.bg-slate-50]="selectedDriverId === driver.id">
                    <td class="font-semibold text-slate-900">{{ driver.idConductor }}</td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ driver.nombreConductor }}</div>
                      <div class="mt-1 text-xs text-slate-500">
                        {{ driver.tipoDocumento }}{{ driver.numeroDocumento ? ' · ' + driver.numeroDocumento : '' }}
                      </div>
                    </td>
                    <td>{{ driver.ciudadNombre || 'Sin ciudad' }}</td>
                    <td>{{ driver.celular || 'Sin dato' }}</td>
                    <td>{{ driver.cantidadRutasAsignadas }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="driver.estado === 'ACTIVO'" [class.erp-chip--warning]="driver.estado === 'INACTIVO'">
                        {{ driver.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Ver"
                          [disabled]="isBusy(driver.id)"
                          (click)="selectDriver.emit(driver)"
                        >
                          <mat-icon>visibility</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Editar"
                          [disabled]="isBusy(driver.id)"
                          (click)="editDriver.emit(driver)"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Eliminar"
                          [disabled]="isBusy(driver.id)"
                          (click)="deleteDriver.emit(driver)"
                        >
                          <mat-icon>{{ deletingId === driver.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-row-action"
                          [class.border-amber-200]="driver.estado === 'ACTIVO'"
                          [class.text-amber-700]="driver.estado === 'ACTIVO'"
                          [class.bg-amber-50]="driver.estado === 'ACTIVO'"
                          [class.border-emerald-200]="driver.estado === 'INACTIVO'"
                          [class.text-emerald-700]="driver.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="driver.estado === 'INACTIVO'"
                          [disabled]="isBusy(driver.id)"
                          (click)="toggleStatus.emit(driver)"
                        >
                          <mat-icon class="text-base">
                            {{ driver.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}
                          </mat-icon>
                          <span>
                            {{
                              statusUpdatingId === driver.id
                                ? 'Procesando...'
                                : driver.estado === 'ACTIVO'
                                  ? 'Inactivar'
                                  : 'Activar'
                            }}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="7" class="!p-0">
                      <mat-accordion class="block border-t border-slate-100">
                        <mat-expansion-panel class="!shadow-none">
                          <mat-expansion-panel-header>
                            <mat-panel-title>Rutas asociadas</mat-panel-title>
                            <mat-panel-description>
                              {{ driver.cantidadRutasAsignadas }} asignadas al conductor
                            </mat-panel-description>
                          </mat-expansion-panel-header>

                          @if (driver.rutasAsignadas.length) {
                            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              @for (route of driver.rutasAsignadas; track route.routeId) {
                                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p class="text-sm font-semibold text-slate-900">{{ route.nombreRuta }}</p>
                                  <p class="mt-1 text-xs text-slate-500">{{ route.idRuta }}</p>
                                  <p class="mt-2 text-xs text-slate-500">{{ route.zona }}</p>
                                </div>
                              }
                            </div>
                          } @else {
                            <div class="erp-empty-state !min-h-[9rem] !rounded-[1rem] !border-dashed !bg-white">
                              <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">route</mat-icon>
                              <div>
                                <p class="text-sm font-semibold text-slate-700">No hay rutas asociadas.</p>
                                <p class="mt-1 text-xs text-slate-500">Este conductor aún no tiene asignación logística.</p>
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
export class DriversListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: DriverFilters = { ...DEFAULT_DRIVER_FILTERS };
  @Input() catalogs: DriverCatalogs = EMPTY_DRIVER_CATALOGS;
  @Input() response: DriverListResponse = EMPTY_DRIVER_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedDriverId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<DriverFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectDriver = new EventEmitter<Driver>();
  @Output() editDriver = new EventEmitter<Driver>();
  @Output() deleteDriver = new EventEmitter<Driver>();
  @Output() toggleStatus = new EventEmitter<Driver>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    ciudadId: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          ciudadId: this.filters.ciudadId ?? null,
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
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        estado: 'TODOS',
        ciudadId: null,
      },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      ciudadId: null,
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
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.ciudadId);
  }

  isBusy(driverId: string): boolean {
    return this.deletingId === driverId || this.statusUpdatingId === driverId;
  }
}
