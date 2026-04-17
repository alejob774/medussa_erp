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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { SaveSupplierPayload, SupplierFormMode } from '../../../domain/models/supplier-form.model';
import {
  EMPTY_SUPPLIER_CATALOGS,
  Supplier,
  SupplierCatalogs,
  SupplierStatus,
} from '../../../domain/models/supplier.model';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
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
            <p class="erp-page-eyebrow !mb-0">Configuración</p>
            <span class="erp-chip erp-chip--neutral">{{ modeLabel }}</span>
            @if (initialValue) {
              <span class="erp-chip" [class.erp-chip--success]="initialValue.estado === 'ACTIVO'" [class.erp-chip--warning]="initialValue.estado === 'INACTIVO'">
                {{ initialValue.estado }}
              </span>
            }
          </div>

          <h2 class="mt-3 text-2xl font-bold text-slate-900">{{ titleLabel }}</h2>
          <p class="mt-2 max-w-3xl text-sm text-slate-500">
            La ficha superior modela el abastecimiento MIR y logístico, conservando NIT único por empresa y operación mock-first.
          </p>
        </div>

        <div class="erp-meta-card min-w-[260px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{ initialValue?.nit ? 'NIT actual: ' + initialValue?.nit : 'Los nuevos proveedores se crearán en este contexto.' }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando proveedor...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del proveedor</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>NIT</mat-label>
                    <input matInput formControlName="nit" />
                    @if (isInvalid('nit')) { <mat-error>{{ getErrorMessage('nit') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombre proveedor</mat-label>
                    <input matInput formControlName="nombreProveedor" />
                    @if (isInvalid('nombreProveedor')) { <mat-error>{{ getErrorMessage('nombreProveedor') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Ubicación y contacto</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Ciudad, dirección y contacto</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad</mat-label>
                    <mat-select formControlName="ciudadId">
                      @for (city of catalogs.cities; track city.id) {
                        <mat-option [value]="city.id">{{ city.name }}{{ city.department ? ' · ' + city.department : '' }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('ciudadId')) { <mat-error>{{ getErrorMessage('ciudadId') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="telefono" />
                    @if (isInvalid('telefono')) { <mat-error>{{ getErrorMessage('telefono') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Dirección</mat-label>
                    <textarea matInput rows="3" formControlName="direccion"></textarea>
                    @if (isInvalid('direccion')) { <mat-error>{{ getErrorMessage('direccion') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('email')) { <mat-error>{{ getErrorMessage('email') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Abastecimiento</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Tipo, producto y condiciones</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de abastecimiento</mat-label>
                    <mat-select formControlName="tipoAbastecimiento">
                      @for (option of catalogs.supplyTypes; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('tipoAbastecimiento')) { <mat-error>{{ getErrorMessage('tipoAbastecimiento') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Producto principal</mat-label>
                    <mat-select formControlName="productoPrincipal">
                      @for (option of catalogs.productOptions; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('productoPrincipal')) { <mat-error>{{ getErrorMessage('productoPrincipal') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Lead time (días)</mat-label>
                    <input matInput type="number" formControlName="leadTimeDias" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('leadTimeDias')) { <mat-error>{{ getErrorMessage('leadTimeDias') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>MOQ</mat-label>
                    <input matInput type="number" formControlName="moq" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('moq')) { <mat-error>{{ getErrorMessage('moq') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Condición de pago</mat-label>
                    <mat-select formControlName="condicionPago">
                      <mat-option [value]="null">Sin condición</mat-option>
                      @for (option of catalogs.paymentTerms; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>
                </div>
              </section>
            </div>

            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Control</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Contexto del registro</h3>
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
                    @if (isInvalid('estado')) { <mat-error>{{ getErrorMessage('estado') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Resumen operativo</p>
                <h3 class="mt-2 text-lg font-semibold text-slate-900">Condiciones de negocio</h3>

                <dl class="mt-4 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3"><dt>NIT único por empresa</dt><dd class="font-semibold text-slate-900">Activo</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Tipo abastecimiento</dt><dd class="font-semibold text-slate-900">{{ form.controls.tipoAbastecimiento.value || 'Pendiente' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Producto principal</dt><dd class="text-right font-semibold text-slate-900">{{ form.controls.productoPrincipal.value || 'Pendiente' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Eliminación inteligente</dt><dd class="text-right font-semibold text-slate-900">{{ initialValue?.tieneDependenciasActivas ? 'Pasa a inactivo' : 'Eliminación física permitida' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Auditoría preparada</dt><dd class="font-semibold text-slate-900">Sí</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Creado</dt><dd class="text-right font-semibold text-slate-900">{{ createdAtLabel }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Actualizado</dt><dd class="text-right font-semibold text-slate-900">{{ updatedAtLabel }}</dd></div>
                </dl>

                @if (initialValue?.tieneDependenciasActivas) {
                  <div class="erp-alert erp-alert--warning mt-5">Este proveedor tiene dependencias activas. La acción eliminar lo dejará inactivo.</div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar proveedor</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">{{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar proveedor' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class SupplierFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: SupplierCatalogs = EMPTY_SUPPLIER_CATALOGS;
  @Input() existingSuppliers: Supplier[] = [];
  @Input() initialValue: Supplier | null = null;
  @Input() mode: SupplierFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveSupplier = new EventEmitter<SaveSupplierPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    nit: ['', [Validators.required, Validators.minLength(5)]],
    nombreProveedor: ['', [Validators.required, Validators.minLength(3)]],
    ciudadId: ['', [Validators.required]],
    direccion: ['', [Validators.required, Validators.minLength(3)]],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    email: this.fb.control<string | null>(null, [Validators.email]),
    tipoAbastecimiento: this.fb.control<'MIR' | 'LOGISTICA' | ''>('', [Validators.required]),
    productoPrincipal: ['', [Validators.required]],
    leadTimeDias: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    moq: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    condicionPago: this.fb.control<string | null>(null),
    estado: this.fb.nonNullable.control<SupplierStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de proveedores. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    return this.mode === 'edit'
      ? 'Editar proveedor'
      : this.mode === 'view'
        ? 'Detalle del proveedor'
        : 'Crear proveedor';
  }

  get modeLabel(): string {
    return this.mode === 'edit'
      ? 'Modo edición'
      : this.mode === 'view'
        ? 'Modo visualización'
        : 'Modo creación';
  }

  get createdAtLabel(): string {
    return this.formatDate(this.initialValue?.createdAt, 'Se asignará al guardar');
  }

  get updatedAtLabel(): string {
    return this.formatDate(this.initialValue?.updatedAt, 'Pendiente');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingSuppliers']) {
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
    const selectedCity = this.catalogs.cities.find((city) => city.id === value.ciudadId) ?? null;

    this.pendingChangesService.clear();
    this.saveSupplier.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      nit: value.nit.trim().toUpperCase(),
      nombreProveedor: value.nombreProveedor.trim(),
      ciudadId: value.ciudadId,
      ciudadNombre: selectedCity?.name ?? null,
      direccion: value.direccion.trim(),
      telefono: value.telefono.trim(),
      email: value.email?.trim().toLowerCase() || null,
      tipoAbastecimiento: value.tipoAbastecimiento as 'MIR' | 'LOGISTICA',
      productoPrincipal: value.productoPrincipal.trim(),
      leadTimeDias: value.leadTimeDias,
      moq: value.moq,
      condicionPago: value.condicionPago?.trim() || null,
      estado: value.estado,
    });
  }

  cancel(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de proveedores. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    if (this.mode === 'edit') {
      this.cancelEdit.emit();
      return;
    }

    this.closePanel.emit();
  }

  resetToCreate(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de proveedores. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    this.cancelEdit.emit();
  }

  isInvalid(controlName: keyof SupplierFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof SupplierFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return controlName === 'telefono' ? 'Debe contener al menos 7 caracteres.' : controlName === 'nit' ? 'Debe contener al menos 5 caracteres.' : 'Debe contener al menos 3 caracteres.';
    if (control.hasError('email')) return 'Ingresa un correo válido.';
    if (control.hasError('duplicateNit')) return 'Ya existe otro proveedor con ese NIT en la empresa activa.';
    if (control.hasError('nonNegative')) return 'El valor no puede ser negativo.';
    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();
    this.form.reset({
      nit: this.initialValue?.nit ?? '',
      nombreProveedor: this.initialValue?.nombreProveedor ?? '',
      ciudadId: this.initialValue?.ciudadId ?? this.catalogs.cities[0]?.id ?? '',
      direccion: this.initialValue?.direccion ?? '',
      telefono: this.initialValue?.telefono ?? '',
      email: this.initialValue?.email ?? null,
      tipoAbastecimiento: this.initialValue?.tipoAbastecimiento ?? '',
      productoPrincipal: this.initialValue?.productoPrincipal ?? '',
      leadTimeDias: this.initialValue?.leadTimeDias ?? null,
      moq: this.initialValue?.moq ?? null,
      condicionPago: this.initialValue?.condicionPago ?? null,
      estado: this.initialValue?.estado ?? 'ACTIVO',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    if (this.mode === 'view') {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }

    this.pendingChangesService.clear();
  }

  private applyDynamicValidators(): void {
    this.form.controls.nit.setValidators([
      Validators.required,
      Validators.minLength(5),
      this.uniqueNitValidator(),
    ]);
    this.form.controls.nit.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueNitValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);
      if (!normalizedValue) return null;

      const duplicated = this.existingSuppliers.some((supplier) => {
        if (supplier.id === this.initialValue?.id) return false;
        return normalizeFieldValue(supplier.nit) === normalizedValue;
      });

      return duplicated ? { duplicateNit: true } : null;
    };
  }

  private formatDate(value: string | null | undefined, fallback: string): string {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

function normalizeFieldValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nonNegativeOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    return Number(value) >= 0 ? null : { nonNegative: true };
  };
}
