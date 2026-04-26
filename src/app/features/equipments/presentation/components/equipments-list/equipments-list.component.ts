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
import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from '../../../domain/models/equipment-filters.model';
import {
  EMPTY_EQUIPMENT_CATALOGS,
  Equipment,
  EquipmentCatalogs,
} from '../../../domain/models/equipment.model';
import {
  EMPTY_EQUIPMENT_LIST_RESPONSE,
  EquipmentListResponse,
} from '../../../domain/models/equipment-response.model';

@Component({
  selector: 'app-equipments-list',
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
            <input matInput formControlName="search" placeholder="Buscar por ID, nombre, fabricante o ubicación" />
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
              <mat-option value="ACTIVO">Activos</mat-option>
              <mat-option value="INACTIVO">Inactivos</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo de equipo</mat-label>
            <mat-select formControlName="tipoEquipo">
              <mat-option [value]="null">Todos</mat-option>
              @for (option of catalogs.equipmentTypes; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fabricante</mat-label>
            <input matInput formControlName="empresaFabricante" placeholder="Filtrar por fabricante" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ubicación operativa</mat-label>
            <mat-select formControlName="ubicacionOperativa">
              <mat-option [value]="null">Todas</mat-option>
              @for (option of catalogs.equipmentLocations; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="erp-meta-card xl:mt-1">
            {{ response.total }} equipos en la empresa activa.
          </div>
        </div>
      </form>

      <div class="erp-table-shell mt-6">
        @if (loading) {
          <div class="erp-empty-state">
            <div class="flex flex-col items-center gap-3 text-slate-500">
              <mat-spinner diameter="34"></mat-spinner>
              <p class="text-sm">Cargando equipos...</p>
            </div>
          </div>
        } @else if (errorMessage && !response.items.length) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl text-red-300">error_outline</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No fue posible cargar el maestro de equipos.</p>
              <p class="mt-1 text-sm">{{ errorMessage }}</p>
            </div>

            <button mat-stroked-button type="button" (click)="retry.emit()">Reintentar</button>
          </div>
        } @else if (!response.total && hasActiveFilters()) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">travel_explore</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay resultados para los filtros aplicados.</p>
              <p class="mt-1 text-sm">Prueba con otro tipo, fabricante, ubicación o término de búsqueda.</p>
            </div>

            <button mat-stroked-button type="button" (click)="clearFilters()">Limpiar filtros</button>
          </div>
        } @else if (!response.total) {
          <div class="erp-empty-state">
            <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">precision_manufacturing</mat-icon>
            <div>
              <p class="text-base font-semibold text-slate-700">No hay equipos registrados</p>
              <p class="mt-1 text-sm">Crea el primer equipo de la empresa activa para iniciar el maestro.</p>
            </div>

            <button mat-flat-button color="primary" type="button" (click)="createRequested.emit()">
              Crear equipo
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="erp-data-table min-w-[1400px] text-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Capacidad</th>
                  <th>Fabricante</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th class="w-[230px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (equipment of response.items; track equipment.id) {
                  <tr [class.bg-slate-50]="selectedEquipmentId === equipment.id">
                    <td class="font-semibold text-slate-900">{{ equipment.idEquipo }}</td>
                    <td>
                      <div class="font-semibold text-slate-900">{{ equipment.nombreEquipo }}</div>
                    </td>
                    <td>{{ equipment.tipoEquipo || 'Sin tipo' }}</td>
                    <td>{{ equipment.capacidad }} {{ equipment.unidadCapacidad }}</td>
                    <td>{{ equipment.empresaFabricante }}</td>
                    <td>{{ equipment.ubicacionOperativa || 'Sin ubicación' }}</td>
                    <td>
                      <span class="erp-chip" [class.erp-chip--success]="equipment.estado === 'ACTIVO'" [class.erp-chip--warning]="equipment.estado === 'INACTIVO'">
                        {{ equipment.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="grid grid-cols-[36px_36px_36px_120px] items-center justify-end gap-2">
                        <button type="button" class="erp-icon-button" title="Ver" [disabled]="isBusy(equipment.id)" (click)="selectEquipment.emit(equipment)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Editar" [disabled]="isBusy(equipment.id)" (click)="editEquipment.emit(equipment)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button type="button" class="erp-icon-button" title="Eliminar" [disabled]="isBusy(equipment.id)" (click)="deleteEquipment.emit(equipment)">
                          <mat-icon>{{ deletingId === equipment.id ? 'hourglass_top' : 'delete' }}</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="erp-row-action"
                          [class.border-amber-200]="equipment.estado === 'ACTIVO'"
                          [class.text-amber-700]="equipment.estado === 'ACTIVO'"
                          [class.bg-amber-50]="equipment.estado === 'ACTIVO'"
                          [class.border-emerald-200]="equipment.estado === 'INACTIVO'"
                          [class.text-emerald-700]="equipment.estado === 'INACTIVO'"
                          [class.bg-emerald-50]="equipment.estado === 'INACTIVO'"
                          [disabled]="isBusy(equipment.id)"
                          (click)="toggleStatus.emit(equipment)"
                        >
                          <mat-icon class="text-base">{{ equipment.estado === 'ACTIVO' ? 'toggle_off' : 'published_with_changes' }}</mat-icon>
                          <span>
                            {{
                              statusUpdatingId === equipment.id
                                ? 'Procesando...'
                                : equipment.estado === 'ACTIVO'
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
export class EquipmentsListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() activeCompanyName = '';
  @Input() filters: EquipmentFilters = { ...DEFAULT_EQUIPMENT_FILTERS };
  @Input() catalogs: EquipmentCatalogs = EMPTY_EQUIPMENT_CATALOGS;
  @Input() response: EquipmentListResponse = EMPTY_EQUIPMENT_LIST_RESPONSE;
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() selectedEquipmentId: string | null = null;
  @Input() deletingId: string | null = null;
  @Input() statusUpdatingId: string | null = null;

  @Output() filtersChange = new EventEmitter<EquipmentFilters>();
  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();
  @Output() selectEquipment = new EventEmitter<Equipment>();
  @Output() editEquipment = new EventEmitter<Equipment>();
  @Output() deleteEquipment = new EventEmitter<Equipment>();
  @Output() toggleStatus = new EventEmitter<Equipment>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly pageSizeOptions = [5, 10, 25];
  readonly filterForm = this.fb.group({
    search: [''],
    estado: this.fb.nonNullable.control<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS'),
    tipoEquipo: this.fb.control<string | null>(null),
    empresaFabricante: [''],
    ubicacionOperativa: this.fb.control<string | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.filterForm.reset(
        {
          search: this.filters.search ?? '',
          estado: (this.filters.estado ?? 'TODOS') as 'TODOS' | 'ACTIVO' | 'INACTIVO',
          tipoEquipo: this.filters.tipoEquipo ?? null,
          empresaFabricante: this.filters.empresaFabricante ?? '',
          ubicacionOperativa: this.filters.ubicacionOperativa ?? null,
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
      tipoEquipo: value.tipoEquipo,
      empresaFabricante: value.empresaFabricante?.trim() ?? '',
      ubicacionOperativa: value.ubicacionOperativa,
      page: 0,
    });
  }

  clearFilters(): void {
    this.filterForm.reset(
      { search: '', estado: 'TODOS', tipoEquipo: null, empresaFabricante: '', ubicacionOperativa: null },
      { emitEvent: false },
    );

    this.filtersChange.emit({
      ...this.filters,
      search: '',
      estado: 'TODOS',
      tipoEquipo: null,
      empresaFabricante: null,
      ubicacionOperativa: null,
      page: 0,
    });
  }

  handlePageChange(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, pageSize: event.pageSize });
  }

  hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();
    return !!(value.search?.trim() || value.estado !== 'TODOS' || value.tipoEquipo || value.empresaFabricante?.trim() || value.ubicacionOperativa);
  }

  isBusy(equipmentId: string): boolean {
    return this.deletingId === equipmentId || this.statusUpdatingId === equipmentId;
  }
}
