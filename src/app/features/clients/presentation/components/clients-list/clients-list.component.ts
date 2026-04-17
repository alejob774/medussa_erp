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
import { DEFAULT_CLIENT_FILTERS, ClientFilters } from '../../../domain/models/client-filters.model';
import { EMPTY_CLIENT_CATALOGS, Client, ClientCatalogs } from '../../../domain/models/client.model';
import { EMPTY_CLIENT_LIST_RESPONSE, ClientListResponse } from '../../../domain/models/client-response.model';

@Component({
  selector: 'app-clients-list',
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
            <input
              matInput
              formControlName="search"
              placeholder="Buscar por ID, nombre, nombre comercial, dirección, teléfono, email o zona"
            />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-stroked-button type="button" class="min-h-12" (click)="clearFilters()">
            Limpiar filtros
          </button>

          <button mat-flat-button color="primary" type="submit" class="min-h-12">
            Filtrar
          </button>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.05fr_0.8fr_0.9fr_0.8fr_0.9fr] xl:items-start">
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
                <mat-option [value]="city.id">
                  {{ city.name }}{{ city.department ? ' · ' + city.department : '' }}
                </mat-option>
              }
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
              <p class="text-sm">Cargando clientes...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de clientes.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otra ciudad, zona, estado o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">groups</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay clientes registrados todavía.</p>
              <p class="mt-1 text-sm">Crea el primer cliente de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear cliente
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1480px] text-sm">
              <thead>
                <tr>
                  <th>ID cliente</th>
                  <th>Tipo identificación</th>
                  <th>Nombre</th>
                  <th>Nombre comercial</th>
                  <th>Ciudad</th>
                  <th>Zona</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (client of response.items; track client.id) {
                  <tr [class.bg-slate-50]="selectedClientId === client.id">
                    <td class="font-semibold text-slate-900">{{ client.idCliente }}</td>
                    <td>
                      <span class="erp-chip erp-chip--neutral">{{ client.tipoIdentificacion }}</span>
                    </td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ client.nombre }}</div>
                    </td>
                    <td>{{ client.nombreComercial || 'Sin dato' }}</td>
                    <td>{{ client.ciudadNombre || 'Sin ciudad' }}</td>
                    <td>
                      <span class="erp-chip erp-chip--neutral">{{ client.zona || 'Sin zona' }}</span>
                    </td>
                    <td class="max-w-[240px]">
                      <span class="line-clamp-2">{{ client.direccion }}</span>
                    </td>
                    <td>{{ client.telefono || 'Sin dato' }}</td>
                    <td>{{ client.email || 'Sin dato' }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="client.estado === 'ACTIVO'" [class.erp-chip--warning]="client.estado === 'INACTIVO'">
                        {{ client.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Cargar"
                          [disabled]="isBusy(client.id)"
                          (click)="selectClient.emit(client)"
                        >
                          <mat-icon>visibility</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Editar"
                          [disabled]="isBusy(client.id)"
                          (click)="editClient.emit(client)"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="erp-icon-button"
                          title="Eliminar"
                          [disabled]="isBusy(client.id)"
                          (click)="deleteClient.emit(client)"
                        >
                          <mat-icon>{{ deletingId === client.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>

                        <button
                          type="button"
                          class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                          [class.border-amber-200]="client.estado === 'ACTIVO'"
                          [class.text-amber-700]="client.estado === 'ACTIVO'"
                          [class.bg-amber-50]="client.estado === 'ACTIVO'"
                          [class.border-emerald-200]="client.estado === 'INACTIVO'"
                          [class.text-emerald-700]="client.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="client.estado === 'INACTIVO'"
                          [disabled]="isBusy(client.id)"
                          (click)="toggleStatus.emit(client)"
                        >
                          <mat-icon class="text-base">
                            {{ client.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}
                          </mat-icon>
                          <span>
                            {{
                              statusUpdatingId === client.id
                                ? 'Procesando...'
                                : client.estado === 'ACTIVO'
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
export class ClientsListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: ClientFilters = { ...DEFAULT_CLIENT_FILTERS };
  @Input() catalogs: ClientCatalogs = EMPTY_CLIENT_CATALOGS;
  @Input() response: ClientListResponse = EMPTY_CLIENT_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedClientId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<ClientFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectClient = new EventEmitter<Client>();
  @Output() editClient = new EventEmitter<Client>();
  @Output() deleteClient = new EventEmitter<Client>();
  @Output() toggleStatus = new EventEmitter<Client>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    ciudadId: this.fb.control<string | null>(null),
    zona: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          ciudadId: this.filters.ciudadId ?? null,
          zona: this.filters.zona ?? null,
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
      zona: value.zona,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        estado: 'TODOS',
        ciudadId: null,
        zona: null,
      },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      ciudadId: null,
      zona: null,
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
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.ciudadId || value.zona);
  }

  isBusy(clientId: string): boolean {
    return this.deletingId === clientId || this.statusUpdatingId === clientId;
  }
}