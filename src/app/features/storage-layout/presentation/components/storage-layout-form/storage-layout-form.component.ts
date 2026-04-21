import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StorageLocationAssignment } from '../../../domain/models/storage-location-assignment.model';
import { StorageLayoutCatalogs } from '../../../domain/models/storage-layout-response.model';
import { StorageLocation } from '../../../domain/models/storage-location.model';
import { Warehouse } from '../../../domain/models/warehouse.model';

export type StorageLayoutFormMode = 'warehouse' | 'location' | 'assignment';

export interface StorageLayoutFormValue {
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  bodegaId: string;
  zona: string;
  pasillo: string;
  rack: string;
  nivel: string;
  posicion: string;
  capacidad: number;
  tipoAlmacenamiento: string;
  restriccionSanitaria: string;
  ubicacionId: string;
  sku: string;
  prioridad: string;
  categoriaABC: string;
  rotacion: string;
}

@Component({
  selector: 'app-storage-layout-form',
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
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Panel bajo demanda</p>
          <h3 class="erp-section-title">{{ title }}</h3>
          <p class="erp-section-description">{{ description }}</p>
        </div>

        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
          <button type="button" mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="submit.emit(value)">
            {{ saving ? 'Guardando...' : actionLabel }}
          </button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        @if (mode === 'warehouse') {
          <mat-form-field appearance="outline">
            <mat-label>Codigo</mat-label>
            <input matInput formControlName="codigo" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="xl:col-span-2">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              @for (item of catalogs.warehouseTypes; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              @for (item of catalogs.warehouseStatuses; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (mode === 'location') {
          <mat-form-field appearance="outline">
            <mat-label>Bodega</mat-label>
            <mat-select formControlName="bodegaId">
              @for (item of warehouses; track item.id) {
                <mat-option [value]="item.id">{{ item.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Zona</mat-label>
            <input matInput formControlName="zona" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Pasillo</mat-label>
            <input matInput formControlName="pasillo" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Rack</mat-label>
            <input matInput formControlName="rack" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nivel</mat-label>
            <input matInput formControlName="nivel" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Posicion</mat-label>
            <input matInput formControlName="posicion" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Capacidad</mat-label>
            <input matInput type="number" formControlName="capacidad" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo almacenamiento</mat-label>
            <mat-select formControlName="tipoAlmacenamiento">
              @for (item of catalogs.storageTypes; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Restriccion sanitaria</mat-label>
            <mat-select formControlName="restriccionSanitaria">
              @for (item of catalogs.sanitaryRestrictions; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              @for (item of catalogs.locationStatuses; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (mode === 'assignment') {
          <mat-form-field appearance="outline" class="xl:col-span-2">
            <mat-label>Ubicacion</mat-label>
            <mat-select formControlName="ubicacionId">
              @for (item of locations; track item.id) {
                <mat-option [value]="item.id">{{ item.codigo }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="xl:col-span-2">
            <mat-label>SKU</mat-label>
            <mat-select formControlName="sku">
              @for (item of catalogs.skus; track item.skuId) {
                <mat-option [value]="item.sku">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Prioridad</mat-label>
            <mat-select formControlName="prioridad">
              @for (item of catalogs.priorities; track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Categoria ABC</mat-label>
            <mat-select formControlName="categoriaABC">
              @for (item of catalogs.abcCategories.slice(1); track item.value) {
                <mat-option [value]="item.value">{{ item.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Rotacion</mat-label>
            <mat-select formControlName="rotacion">
              <mat-option value="ALTA">Alta</mat-option>
              <mat-option value="MEDIA">Media</mat-option>
              <mat-option value="BAJA">Baja</mat-option>
            </mat-select>
          </mat-form-field>
        }
      </form>
    </section>
  `,
})
export class StorageLayoutFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: StorageLayoutFormMode = 'location';
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
  @Input() warehouses: Warehouse[] = [];
  @Input() locations: StorageLocation[] = [];
  @Input() warehouse: Warehouse | null = null;
  @Input() location: StorageLocation | null = null;
  @Input() assignment: StorageLocationAssignment | null = null;
  @Input() saving = false;

  @Output() readonly submit = new EventEmitter<StorageLayoutFormValue>();
  @Output() readonly close = new EventEmitter<void>();

  readonly form = this.fb.group({
    codigo: this.fb.control('', { nonNullable: true }),
    nombre: this.fb.control('', { nonNullable: true }),
    tipo: this.fb.control('PRINCIPAL', { nonNullable: true }),
    estado: this.fb.control('ACTIVA', { nonNullable: true }),
    bodegaId: this.fb.control('', { nonNullable: true }),
    zona: this.fb.control('', { nonNullable: true }),
    pasillo: this.fb.control('', { nonNullable: true }),
    rack: this.fb.control('', { nonNullable: true }),
    nivel: this.fb.control('', { nonNullable: true }),
    posicion: this.fb.control('', { nonNullable: true }),
    capacidad: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
    tipoAlmacenamiento: this.fb.control('Seco', { nonNullable: true }),
    restriccionSanitaria: this.fb.control('Sin restriccion', { nonNullable: true }),
    ubicacionId: this.fb.control('', { nonNullable: true }),
    sku: this.fb.control('', { nonNullable: true }),
    prioridad: this.fb.control('ALTA', { nonNullable: true }),
    categoriaABC: this.fb.control('B', { nonNullable: true }),
    rotacion: this.fb.control('MEDIA', { nonNullable: true }),
  });

  get title(): string {
    if (this.mode === 'warehouse') {
      return this.warehouse ? 'Editar bodega' : 'Nueva bodega';
    }

    if (this.mode === 'assignment') {
      return this.assignment ? 'Editar asignacion SKU' : 'Asignar SKU a ubicacion';
    }

    return this.location ? 'Editar ubicacion' : 'Nueva ubicacion';
  }

  get description(): string {
    if (this.mode === 'warehouse') {
      return 'Define la bodega operativa que soporta layout, ocupacion y ciclo de conteos.';
    }

    if (this.mode === 'assignment') {
      return 'Vincula el SKU a la ubicacion correcta segun criticidad, ABC y rotacion.';
    }

    return 'Registra capacidad fisica, restriccion sanitaria y estado logistico de la posicion.';
  }

  get actionLabel(): string {
    return this.warehouse || this.location || this.assignment ? 'Guardar cambios' : 'Crear registro';
  }

  get value(): StorageLayoutFormValue {
    return this.form.getRawValue() as StorageLayoutFormValue;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] || changes['warehouse'] || changes['location'] || changes['assignment']) {
      this.form.patchValue(
        {
          codigo: this.warehouse?.codigo ?? '',
          nombre: this.warehouse?.nombre ?? '',
          tipo: this.warehouse?.tipo ?? 'PRINCIPAL',
          estado: this.warehouse?.estado ?? this.location?.estado ?? 'ACTIVA',
          bodegaId: this.location?.bodegaId ?? this.locations[0]?.bodegaId ?? this.warehouses[0]?.id ?? '',
          zona: this.location?.zona ?? 'Picking',
          pasillo: this.location?.pasillo ?? 'A1',
          rack: this.location?.rack ?? 'R1',
          nivel: this.location?.nivel ?? 'N1',
          posicion: this.location?.posicion ?? 'P01',
          capacidad: this.location?.capacidad ?? 100,
          tipoAlmacenamiento: this.location?.tipoAlmacenamiento ?? 'Seco',
          restriccionSanitaria: this.location?.restriccionSanitaria ?? 'Sin restriccion',
          ubicacionId: this.assignment?.ubicacionId ?? this.location?.id ?? this.locations[0]?.id ?? '',
          sku: this.assignment?.sku ?? this.catalogs.skus[0]?.sku ?? '',
          prioridad: this.assignment?.prioridad ?? 'ALTA',
          categoriaABC: this.assignment?.categoriaABC ?? 'B',
          rotacion: this.assignment?.rotacion ?? 'MEDIA',
        },
        { emitEvent: false },
      );
    }
  }
}
