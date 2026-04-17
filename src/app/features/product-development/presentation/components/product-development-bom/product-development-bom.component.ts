import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProductDevelopmentBomItem } from '../../../domain/models/product-development-bom-item.model';
import { ProductDevelopmentCatalogs } from '../../../domain/models/product-development-project.model';
import { ProductDevelopmentBomPayload } from '../../../domain/repositories/product-development.repository';

@Component({
  selector: 'app-product-development-bom',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">BOM preliminar</p>
          <h3 class="erp-section-title">Materiales y costo base</h3>
        </div>
        <span class="erp-chip erp-chip--neutral">Costo total: {{ totalCost | number: '1.0-0' }}</span>
      </div>

      @if (projectId) {
        <form class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5" [formGroup]="form">
          <mat-form-field appearance="outline"><mat-label>Codigo</mat-label><input matInput formControlName="itemCodigo" /></mat-form-field>
          <mat-form-field appearance="outline" class="xl:col-span-2"><mat-label>Descripcion</mat-label><input matInput formControlName="descripcion" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Cantidad</mat-label><input matInput type="number" formControlName="cantidad" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Unidad</mat-label><mat-select formControlName="unidadMedida">@for (item of catalogs.units; track item.value) {<mat-option [value]="item.value">{{ item.label }}</mat-option>}</mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Costo</mat-label><input matInput type="number" formControlName="costoEstimado" /></mat-form-field>
          <div class="flex items-center xl:col-span-4">
            <button type="button" mat-stroked-button [disabled]="form.invalid" (click)="save.emit(form.getRawValue())">Agregar item</button>
          </div>
        </form>

        <div class="mt-4 space-y-3">
          @for (item of bom; track item.id) {
            <article class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p class="font-semibold text-slate-900">{{ item.itemCodigo }} · {{ item.descripcion }}</p>
                <p class="text-sm text-slate-500">{{ item.cantidad }} {{ item.unidadMedida }} · {{ item.costoEstimado | number: '1.0-0' }}</p>
              </div>
              <button type="button" mat-button color="warn" (click)="remove.emit(item.id)">Quitar</button>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[14rem]"><div><p class="text-slate-600">Crea o selecciona un proyecto para editar su BOM.</p></div></div>
      }
    </section>
  `,
})
export class ProductDevelopmentBomComponent {
  private readonly fb = new FormBuilder();

  @Input() projectId: string | null = null;
  @Input() bom: ProductDevelopmentBomItem[] = [];
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

  @Output() readonly save = new EventEmitter<ProductDevelopmentBomPayload>();
  @Output() readonly remove = new EventEmitter<string>();

  readonly form = this.fb.group({
    itemCodigo: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descripcion: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    cantidad: this.fb.control(1, { nonNullable: true, validators: [Validators.required] }),
    unidadMedida: this.fb.control('UND', { nonNullable: true, validators: [Validators.required] }),
    costoEstimado: this.fb.control(0, { nonNullable: true, validators: [Validators.required] }),
  });

  get totalCost(): number {
    return this.bom.reduce((total, item) => total + item.cantidad * item.costoEstimado, 0);
  }
}
