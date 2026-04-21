import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InventoryCycleCatalogs } from '../../../domain/models/inventory-cycle-response.model';

export interface InventoryCycleFormValue {
  bodegaId: string;
  ubicacionId: string;
  sku: string;
  loteId: string;
  conteoFisico: number;
  usuarioConteo: string;
  observacion: string;
}

@Component({
  selector: 'app-inventory-cycle-form',
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
          <p class="erp-section-eyebrow">Registro bajo demanda</p>
          <h3 class="erp-section-title">Nuevo conteo ciclico</h3>
          <p class="erp-section-description">
            Registra conteo sobre ubicacion valida, SKU asignado y lote vigente para compararlo contra el sistema.
          </p>
        </div>

        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="close.emit()">Cancelar</button>
          <button type="button" mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="submit.emit(value)">
            {{ saving ? 'Guardando...' : 'Registrar conteo' }}
          </button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Bodega</mat-label>
          <mat-select formControlName="bodegaId">
            @for (item of catalogs.warehouses; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ubicacion</mat-label>
          <mat-select formControlName="ubicacionId">
            @for (item of filteredLocations; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>SKU</mat-label>
          <mat-select formControlName="sku">
            @for (item of filteredSkus; track item.skuId) {
              <mat-option [value]="item.sku">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Lote</mat-label>
          <mat-select formControlName="loteId">
            @for (item of filteredLots; track item.lotId) {
              <mat-option [value]="item.lotId">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Conteo fisico</mat-label>
          <input matInput type="number" formControlName="conteoFisico" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Usuario conteo</mat-label>
          <input matInput formControlName="usuarioConteo" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="xl:col-span-2">
          <mat-label>Observacion</mat-label>
          <textarea matInput rows="3" formControlName="observacion"></textarea>
        </mat-form-field>
      </form>
    </section>
  `,
})
export class InventoryCycleFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() catalogs: InventoryCycleCatalogs = {
    warehouses: [],
    locations: [],
    skus: [],
    lots: [],
    states: [],
    severities: [],
  };
  @Input() saving = false;
  @Input() preferredWarehouseId: string | null = null;
  @Input() preferredLocationId: string | null = null;

  @Output() readonly submit = new EventEmitter<InventoryCycleFormValue>();
  @Output() readonly close = new EventEmitter<void>();

  readonly form = this.fb.group({
    bodegaId: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    ubicacionId: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    sku: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    loteId: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    conteoFisico: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    usuarioConteo: this.fb.control('demo.aux-bodega', { nonNullable: true, validators: [Validators.required] }),
    observacion: this.fb.control('', { nonNullable: true }),
  });

  get value(): InventoryCycleFormValue {
    return this.form.getRawValue() as InventoryCycleFormValue;
  }

  get filteredLocations() {
    const warehouseId = this.form.getRawValue().bodegaId;
    return this.catalogs.locations.filter((item) => !warehouseId || item.warehouseId === warehouseId);
  }

  get filteredLots() {
    const locationId = this.form.getRawValue().ubicacionId;
    const sku = this.form.getRawValue().sku;
    return this.catalogs.lots.filter(
      (item) => (!locationId || item.ubicacionId === locationId) && (!sku || item.sku === sku),
    );
  }

  get filteredSkus() {
    const locationId = this.form.getRawValue().ubicacionId;

    if (!locationId) {
      return this.catalogs.skus;
    }

    const lotSkus = new Set(
      this.catalogs.lots.filter((item) => item.ubicacionId === locationId).map((item) => item.sku),
    );

    return this.catalogs.skus.filter((item) => lotSkus.has(item.sku));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['catalogs'] || changes['preferredWarehouseId'] || changes['preferredLocationId']) {
      const warehouseId = this.preferredWarehouseId ?? this.catalogs.warehouses[0]?.value ?? '';
      const locationId =
        this.preferredLocationId ??
        this.catalogs.locations.find((item) => item.warehouseId === warehouseId)?.value ??
        this.catalogs.locations[0]?.value ??
        '';
      const sku =
        this.catalogs.lots.find((item) => item.ubicacionId === locationId)?.sku ??
        this.catalogs.skus[0]?.sku ??
        '';
      const lotId =
        this.catalogs.lots.find((item) => item.ubicacionId === locationId && item.sku === sku)?.lotId ??
        this.catalogs.lots[0]?.lotId ??
        '';

      this.form.patchValue(
        {
          bodegaId: warehouseId,
          ubicacionId: locationId,
          sku,
          loteId: lotId,
          conteoFisico: 0,
          usuarioConteo: 'demo.aux-bodega',
          observacion: '',
        },
        { emitEvent: false },
      );
    }
  }
}
