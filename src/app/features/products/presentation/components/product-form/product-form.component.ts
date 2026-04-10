import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { SaveProductPayload, ProductFormMode } from '../../../domain/models/product-form.model';
import {
  EMPTY_PRODUCT_CATALOGS,
  Product,
  ProductCatalogs,
  ProductStatus,
} from '../../../domain/models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <section class="erp-panel relative overflow-hidden">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="erp-page-eyebrow !mb-0">Inventarios</p>
            <span class="erp-chip erp-chip--neutral">{{ modeLabel }}</span>
            @if (initialValue) {
              <span class="erp-chip" [class.erp-chip--success]="initialValue.estado === 'ACTIVO'" [class.erp-chip--warning]="initialValue.estado === 'INACTIVO'">
                {{ initialValue.estado }}
              </span>
            }
          </div>

          <h2 class="mt-3 text-2xl font-bold text-slate-900">
            {{ titleLabel }}
          </h2>
          <p class="mt-2 max-w-3xl text-sm text-slate-500">
            El formulario superior trabaja siempre sobre la empresa activa y mantiene SKU único por empresa.
          </p>
        </div>

        <div class="erp-meta-card min-w-[240px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{ initialValue?.sku ? 'SKU actual: ' + initialValue?.sku : 'Los nuevos productos se crearán en este contexto.' }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando producto...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del producto</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="nombre" />
                    @if (isInvalid('nombre')) {
                      <mat-error>{{ getErrorMessage('nombre') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Familia</mat-label>
                    <mat-select formControlName="familia">
                      @for (family of catalogs.families; track family.value) {
                        <mat-option [value]="family.value">{{ family.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('familia')) {
                      <mat-error>{{ getErrorMessage('familia') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>SKU</mat-label>
                    <input matInput formControlName="sku" />
                    @if (isInvalid('sku')) {
                      <mat-error>{{ getErrorMessage('sku') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Descripción</mat-label>
                    <textarea matInput rows="4" formControlName="descripcion"></textarea>
                    @if (isInvalid('descripcion')) {
                      <mat-error>{{ getErrorMessage('descripcion') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Referencia</mat-label>
                    <input matInput formControlName="referencia" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Unidad base</mat-label>
                    <mat-select formControlName="unidadBase">
                      @for (unit of catalogs.units; track unit.value) {
                        <mat-option [value]="unit.value">{{ unit.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('unidadBase')) {
                      <mat-error>{{ getErrorMessage('unidadBase') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Control logístico y trazabilidad</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Lote, vencimiento y conversión</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <mat-checkbox formControlName="manejaLote">Maneja lote</mat-checkbox>
                    <p class="mt-2 text-xs text-slate-500">Activa trazabilidad de producción o compra por lote.</p>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <mat-checkbox formControlName="manejaVencimiento">Maneja vencimiento</mat-checkbox>
                    <p class="mt-2 text-xs text-slate-500">Si se activa, la vida útil pasa a ser obligatoria.</p>
                  </div>

                  <mat-form-field appearance="outline">
                    <mat-label>Vida útil en días</mat-label>
                    <input matInput type="number" formControlName="vidaUtilDias" />
                    @if (isInvalid('vidaUtilDias')) {
                      <mat-error>{{ getErrorMessage('vidaUtilDias') }}</mat-error>
                    } @else if (!form.controls.manejaVencimiento.value) {
                      <mat-hint>Se habilita cuando el producto maneja vencimiento.</mat-hint>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Factor de conversión</mat-label>
                    <input matInput type="number" formControlName="factorConversion" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('factorConversion')) {
                      <mat-error>{{ getErrorMessage('factorConversion') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Comercial</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Precios del maestro</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Precio bruto</mat-label>
                    <input matInput type="number" formControlName="precioBruto" />
                    @if (isInvalid('precioBruto')) {
                      <mat-error>{{ getErrorMessage('precioBruto') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Precio neto</mat-label>
                    <input matInput type="number" formControlName="precioNeto" />
                    @if (isInvalid('precioNeto')) {
                      <mat-error>{{ getErrorMessage('precioNeto') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>
            </div>

            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Control</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Estado y contexto</h3>
                </div>

                <div class="space-y-4">
                  <mat-form-field appearance="outline">
                    <mat-label>Empresa</mat-label>
                    <input matInput [value]="activeCompanyName" disabled />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Estado</mat-label>
                    <mat-select formControlName="estado">
                      <mat-option value="ACTIVO">ACTIVO</mat-option>
                      <mat-option value="INACTIVO">INACTIVO</mat-option>
                    </mat-select>
                    @if (isInvalid('estado')) {
                      <mat-error>{{ getErrorMessage('estado') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Resumen operativo</p>
                <h3 class="mt-2 text-lg font-semibold text-slate-900">Condiciones de negocio</h3>

                <dl class="mt-4 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <dt>SKU único por empresa</dt>
                    <dd class="font-semibold text-slate-900">Activo</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Eliminación inteligente</dt>
                    <dd class="text-right font-semibold text-slate-900">
                      {{ initialValue?.tieneMovimientos ? 'Pasa a inactivo' : 'Eliminación física permitida' }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Auditoría preparada</dt>
                    <dd class="font-semibold text-slate-900">Sí</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Creado</dt>
                    <dd class="text-right font-semibold text-slate-900">{{ createdAtLabel }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Actualizado</dt>
                    <dd class="text-right font-semibold text-slate-900">{{ updatedAtLabel }}</dd>
                  </div>
                </dl>

                @if (initialValue?.tieneMovimientos) {
                  <div class="erp-alert erp-alert--warning mt-5">
                    Este producto ya tiene movimientos asociados. La acción eliminar lo dejará inactivo.
                  </div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar producto</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">
                {{ mode === 'edit' ? 'Cancelar' : 'Limpiar' }}
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar producto' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class ProductFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: ProductCatalogs = EMPTY_PRODUCT_CATALOGS;
  @Input() existingProducts: Product[] = [];
  @Input() initialValue: Product | null = null;
  @Input() mode: ProductFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveProduct = new EventEmitter<SaveProductPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    familia: ['', [Validators.required]],
    descripcion: ['', [Validators.required, Validators.minLength(3)]],
    sku: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._/-]{3,40}$/)]],
    referencia: this.fb.control<string | null>(null),
    unidadBase: ['', [Validators.required]],
    manejaLote: false,
    manejaVencimiento: false,
    vidaUtilDias: this.fb.control<number | null>(null),
    factorConversion: this.fb.control<number | null>(null, [positiveOptionalValidator()]),
    precioBruto: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    precioNeto: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    estado: this.fb.nonNullable.control<ProductStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.controls.manejaVencimiento.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.configureShelfLifeControl(value, false);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de productos. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    switch (this.mode) {
      case 'edit':
        return 'Editar producto';
      case 'view':
        return 'Detalle del producto';
      default:
        return 'Crear producto';
    }
  }

  get modeLabel(): string {
    switch (this.mode) {
      case 'edit':
        return 'Modo edición';
      case 'view':
        return 'Modo visualización';
      default:
        return 'Modo creación';
    }
  }

  get createdAtLabel(): string {
    return this.formatDate(this.initialValue?.createdAt, 'Se asignará al guardar');
  }

  get updatedAtLabel(): string {
    return this.formatDate(this.initialValue?.updatedAt, 'Pendiente');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingProducts']) {
      this.applyDynamicValidators();
    }

    if (changes['initialValue'] || changes['mode'] || changes['catalogs']) {
      this.resetForm();
    }
  }

  ngOnDestroy(): void {
    this.pendingChangesService.clear();
  }

  submit(): void {
    if (this.mode === 'view') {
      this.requestEdit.emit();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.pendingChangesService.clear();
    this.saveProduct.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      nombre: value.nombre.trim(),
      familia: value.familia,
      descripcion: value.descripcion.trim(),
      sku: value.sku.trim().toUpperCase(),
      referencia: value.referencia?.trim() || null,
      unidadBase: value.unidadBase,
      manejaLote: value.manejaLote,
      manejaVencimiento: value.manejaVencimiento,
      vidaUtilDias: value.manejaVencimiento ? value.vidaUtilDias : null,
      factorConversion: value.factorConversion,
      precioBruto: value.precioBruto,
      precioNeto: value.precioNeto,
      estado: value.estado,
    });
  }

  cancel(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de productos. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
      return;
    }

    if (this.mode === 'edit') {
      this.cancelEdit.emit();
      return;
    }

    this.resetForm();
  }

  resetToCreate(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de productos. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
      return;
    }

    this.cancelEdit.emit();
  }

  isInvalid(controlName: keyof ProductFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof ProductFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'Debe contener al menos 3 caracteres.';
    }

    if (control.hasError('pattern')) {
      return 'Ingresa un valor válido.';
    }

    if (control.hasError('min')) {
      return 'El valor debe ser mayor que cero.';
    }

    if (control.hasError('nonNegative')) {
      return 'El valor no puede ser negativo.';
    }

    if (control.hasError('duplicateSku')) {
      return 'Ya existe otro producto con ese SKU en la empresa activa.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();

    this.form.reset({
      nombre: this.initialValue?.nombre ?? '',
      familia: this.initialValue?.familia ?? this.catalogs.families[0]?.value ?? '',
      descripcion: this.initialValue?.descripcion ?? '',
      sku: this.initialValue?.sku ?? '',
      referencia: this.initialValue?.referencia ?? null,
      unidadBase: this.initialValue?.unidadBase ?? this.catalogs.units[0]?.value ?? '',
      manejaLote: this.initialValue?.manejaLote ?? false,
      manejaVencimiento: this.initialValue?.manejaVencimiento ?? false,
      vidaUtilDias: this.initialValue?.vidaUtilDias ?? null,
      factorConversion: this.initialValue?.factorConversion ?? null,
      precioBruto: this.initialValue?.precioBruto ?? null,
      precioNeto: this.initialValue?.precioNeto ?? null,
      estado: this.initialValue?.estado ?? 'ACTIVO',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.configureShelfLifeControl(this.form.controls.manejaVencimiento.value, true);

    if (this.mode === 'view') {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
      this.configureShelfLifeControl(this.form.controls.manejaVencimiento.value, true);
    }

    this.pendingChangesService.clear();
  }

  private applyDynamicValidators(): void {
    this.form.controls.sku.setValidators([
      Validators.required,
      Validators.pattern(/^[A-Za-z0-9._/-]{3,40}$/),
      this.uniqueSkuValidator(),
    ]);
    this.form.controls.sku.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueSkuValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedSku = normalizeFieldValue(control.value);

      if (!normalizedSku) {
        return null;
      }

      const duplicated = this.existingProducts.some((product) => {
        if (product.id === this.initialValue?.id) {
          return false;
        }

        return normalizeFieldValue(product.sku) === normalizedSku;
      });

      return duplicated ? { duplicateSku: true } : null;
    };
  }

  private configureShelfLifeControl(enabled: boolean, preserveValue: boolean): void {
    const control = this.form.controls.vidaUtilDias;

    if (enabled) {
      control.enable({ emitEvent: false });
      control.setValidators([Validators.required, Validators.min(1)]);
    } else {
      if (!preserveValue) {
        control.setValue(null, { emitEvent: false });
      }
      control.clearValidators();
      control.disable({ emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  private formatDate(value: string | null | undefined, fallback: string): string {
    if (!value) {
      return fallback;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

function positiveOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '' || control.value === undefined) {
      return null;
    }

    return Number(control.value) > 0 ? null : { min: true };
  };
}

function nonNegativeOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '' || control.value === undefined) {
      return null;
    }

    return Number(control.value) >= 0 ? null : { nonNegative: true };
  };
}

function normalizeFieldValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}