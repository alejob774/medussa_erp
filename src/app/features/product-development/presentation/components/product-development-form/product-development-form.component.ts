import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProductDevelopmentProjectAggregate, ProductDevelopmentCatalogs } from '../../../domain/models/product-development-project.model';
import { ProductDevelopmentSavePayload } from '../../../domain/repositories/product-development.repository';

@Component({
  selector: 'app-product-development-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Proyecto</p>
          <h3 class="erp-section-title">Formulario bajo demanda</h3>
          <p class="erp-section-description">Registro ejecutivo del proyecto, no un CRUD abierto por defecto.</p>
        </div>
        <button type="button" mat-stroked-button (click)="submit.emit(value)" [disabled]="form.invalid">Guardar proyecto</button>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" [formGroup]="form">
        <mat-form-field appearance="outline"><mat-label>Nombre producto</mat-label><input matInput formControlName="nombreProducto" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Categoria</mat-label><mat-select formControlName="categoria">@for (item of catalogs.categories; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>SKU propuesto</mat-label><input matInput formControlName="skuPropuesto" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Mercado objetivo</mat-label><mat-select formControlName="mercadoObjetivo">@for (item of catalogs.targetMarkets; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Fecha lanzamiento</mat-label><input matInput type="date" formControlName="fechaLanzamiento" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Responsable</mat-label><mat-select formControlName="responsableProyecto">@for (item of catalogs.responsables; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Proyeccion ventas</mat-label><input matInput type="number" formControlName="proyeccionVentas" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Capacidad requerida</mat-label><input matInput type="number" formControlName="capacidadRequerida" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Capacidad disponible</mat-label><input matInput type="number" formControlName="capacidadDisponible" /></mat-form-field>
        <mat-form-field appearance="outline" class="xl:col-span-3"><mat-label>Materiales criticos</mat-label><input matInput formControlName="materialesCriticos" placeholder="Separados por coma" /></mat-form-field>
        <mat-form-field appearance="outline" class="xl:col-span-3"><mat-label>Proveedores criticos</mat-label><input matInput formControlName="proveedoresCriticos" placeholder="Separados por coma" /></mat-form-field>
        <mat-form-field appearance="outline" class="xl:col-span-3"><mat-label>Observaciones</mat-label><textarea matInput rows="3" formControlName="observaciones"></textarea></mat-form-field>
      </form>
    </section>
  `,
})
export class ProductDevelopmentFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() project: ProductDevelopmentProjectAggregate | null = null;
  @Input() catalogs: ProductDevelopmentCatalogs = {
    categories: [],
    targetMarkets: [],
    responsables: [],
    units: [],
    suppliers: [],
    statuses: [],
    viabilities: [],
    riskLevels: [],
  };

  @Output() readonly submit = new EventEmitter<ProductDevelopmentSavePayload>();

  readonly form = this.fb.group({
    nombreProducto: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    categoria: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    skuPropuesto: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    mercadoObjetivo: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    proyeccionVentas: this.fb.control<number | null>(null),
    fechaLanzamiento: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    responsableProyecto: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    capacidadRequerida: this.fb.control<number | null>(null),
    capacidadDisponible: this.fb.control<number | null>(null),
    proveedoresCriticos: this.fb.control(''),
    materialesCriticos: this.fb.control(''),
    observaciones: this.fb.control(''),
  });

  get value(): ProductDevelopmentSavePayload {
    const value = this.form.getRawValue();
    return {
      nombreProducto: value.nombreProducto,
      categoria: value.categoria,
      skuPropuesto: value.skuPropuesto,
      mercadoObjetivo: value.mercadoObjetivo,
      proyeccionVentas: value.proyeccionVentas,
      fechaLanzamiento: value.fechaLanzamiento,
      responsableProyecto: value.responsableProyecto,
      capacidadRequerida: value.capacidadRequerida,
      capacidadDisponible: value.capacidadDisponible,
      proveedoresCriticos: this.toList(value.proveedoresCriticos),
      materialesCriticos: this.toList(value.materialesCriticos),
      observaciones: value.observaciones?.trim() || null,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      const project = this.project?.project;
      this.form.patchValue(
        {
          nombreProducto: project?.nombreProducto ?? '',
          categoria: project?.categoria ?? '',
          skuPropuesto: project?.skuPropuesto ?? '',
          mercadoObjetivo: project?.mercadoObjetivo ?? '',
          proyeccionVentas: project?.proyeccionVentas ?? null,
          fechaLanzamiento: project?.fechaLanzamiento ?? '',
          responsableProyecto: project?.responsableProyecto ?? '',
          capacidadRequerida: project?.capacidadRequerida ?? null,
          capacidadDisponible: project?.capacidadDisponible ?? null,
          proveedoresCriticos: project?.proveedoresCriticos.join(', ') ?? '',
          materialesCriticos: project?.materialesCriticos.join(', ') ?? '',
          observaciones: project?.observaciones ?? '',
        },
        { emitEvent: false },
      );
    }
  }

  private toList(value: string | null | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
