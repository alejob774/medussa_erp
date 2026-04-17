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
import { EquipmentFormMode, SaveEquipmentPayload } from '../../../domain/models/equipment-form.model';
import {
  EMPTY_EQUIPMENT_CATALOGS,
  Equipment,
  EquipmentCatalogs,
  EquipmentStatus,
} from '../../../domain/models/equipment.model';

@Component({
  selector: 'app-equipment-form',
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
            La ficha superior modela activos operativos listos para futuras integraciones de mantenimiento, sensores e analítica.
          </p>
        </div>

        <div class="erp-meta-card min-w-[260px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{ initialValue?.idEquipo ? 'ID actual: ' + initialValue?.idEquipo : 'Los nuevos equipos se crearán en este contexto.' }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando equipo...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del equipo</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>ID equipo</mat-label>
                    <input matInput formControlName="idEquipo" />
                    @if (isInvalid('idEquipo')) { <mat-error>{{ getErrorMessage('idEquipo') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombre equipo</mat-label>
                    <input matInput formControlName="nombreEquipo" />
                    @if (isInvalid('nombreEquipo')) { <mat-error>{{ getErrorMessage('nombreEquipo') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Especificación técnica</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Capacidad y dimensiones</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Capacidad</mat-label>
                    <input matInput type="number" formControlName="capacidad" />
                    @if (isInvalid('capacidad')) { <mat-error>{{ getErrorMessage('capacidad') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Unidad de capacidad</mat-label>
                    <mat-select formControlName="unidadCapacidad">
                      @for (option of catalogs.capacityUnits; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('unidadCapacidad')) { <mat-error>{{ getErrorMessage('unidadCapacidad') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Diámetro</mat-label>
                    <input matInput type="number" formControlName="diametro" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('diametro')) { <mat-error>{{ getErrorMessage('diametro') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Altura</mat-label>
                    <input matInput type="number" formControlName="altura" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('altura')) { <mat-error>{{ getErrorMessage('altura') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Fabricante</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos del fabricante</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Empresa fabricante</mat-label>
                    <input matInput formControlName="empresaFabricante" />
                    @if (isInvalid('empresaFabricante')) { <mat-error>{{ getErrorMessage('empresaFabricante') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Correo fabricante</mat-label>
                    <input matInput type="email" formControlName="correoFabricante" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('correoFabricante')) { <mat-error>{{ getErrorMessage('correoFabricante') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Dirección fabricante</mat-label>
                    <textarea matInput rows="3" formControlName="direccionFabricante"></textarea>
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Clasificación operativa</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Tipo y ubicación</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de equipo</mat-label>
                    <mat-select formControlName="tipoEquipo">
                      <mat-option [value]="null">Sin tipo</mat-option>
                      @for (option of catalogs.equipmentTypes; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Ubicación operativa</mat-label>
                    <mat-select formControlName="ubicacionOperativa">
                      <mat-option [value]="null">Sin ubicación</mat-option>
                      @for (option of catalogs.equipmentLocations; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
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
                  <div class="flex items-center justify-between gap-3"><dt>ID equipo único por empresa</dt><dd class="font-semibold text-slate-900">Activo</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Capacidad</dt><dd class="font-semibold text-slate-900">{{ form.controls.capacidad.value || 0 }} {{ form.controls.unidadCapacidad.value || '' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Tipo</dt><dd class="text-right font-semibold text-slate-900">{{ form.controls.tipoEquipo.value || 'Pendiente' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Ubicación</dt><dd class="text-right font-semibold text-slate-900">{{ form.controls.ubicacionOperativa.value || 'Pendiente' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Eliminación inteligente</dt><dd class="text-right font-semibold text-slate-900">{{ initialValue?.tieneDependenciasActivas ? 'Pasa a inactivo' : 'Eliminación física permitida' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Auditoría preparada</dt><dd class="font-semibold text-slate-900">Sí</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Creado</dt><dd class="text-right font-semibold text-slate-900">{{ createdAtLabel }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Actualizado</dt><dd class="text-right font-semibold text-slate-900">{{ updatedAtLabel }}</dd></div>
                </dl>

                @if (initialValue?.tieneDependenciasActivas) {
                  <div class="erp-alert erp-alert--warning mt-5">Este equipo tiene dependencias activas. La acción eliminar lo dejará inactivo.</div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar equipo</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">{{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar equipo' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class EquipmentFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: EquipmentCatalogs = EMPTY_EQUIPMENT_CATALOGS;
  @Input() existingEquipments: Equipment[] = [];
  @Input() initialValue: Equipment | null = null;
  @Input() mode: EquipmentFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveEquipment = new EventEmitter<SaveEquipmentPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    idEquipo: ['', [Validators.required, Validators.minLength(2)]],
    nombreEquipo: ['', [Validators.required, Validators.minLength(3)]],
    capacidad: this.fb.control<number | null>(null, [Validators.required]),
    unidadCapacidad: ['', [Validators.required]],
    diametro: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    altura: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    empresaFabricante: ['', [Validators.required, Validators.minLength(3)]],
    direccionFabricante: this.fb.control<string | null>(null),
    correoFabricante: this.fb.control<string | null>(null, [Validators.email]),
    tipoEquipo: this.fb.control<string | null>(null),
    ubicacionOperativa: this.fb.control<string | null>(null),
    estado: this.fb.nonNullable.control<EquipmentStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de equipos. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    return this.mode === 'edit'
      ? 'Editar equipo'
      : this.mode === 'view'
        ? 'Detalle del equipo'
        : 'Crear equipo';
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
    if (changes['existingEquipments']) {
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
    this.saveEquipment.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      idEquipo: value.idEquipo.trim().toUpperCase(),
      nombreEquipo: value.nombreEquipo.trim(),
      capacidad: Number(value.capacidad),
      unidadCapacidad: value.unidadCapacidad,
      diametro: value.diametro,
      altura: value.altura,
      empresaFabricante: value.empresaFabricante.trim(),
      direccionFabricante: value.direccionFabricante?.trim() || null,
      correoFabricante: value.correoFabricante?.trim().toLowerCase() || null,
      tipoEquipo: value.tipoEquipo?.trim() || null,
      ubicacionOperativa: value.ubicacionOperativa?.trim() || null,
      estado: value.estado,
    });
  }

  cancel(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de equipos. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    if (this.mode === 'edit') {
      this.cancelEdit.emit();
      return;
    }

    this.closePanel.emit();
  }

  resetToCreate(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de equipos. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    this.cancelEdit.emit();
  }

  isInvalid(controlName: keyof EquipmentFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof EquipmentFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return controlName === 'idEquipo' ? 'Debe contener al menos 2 caracteres.' : 'Debe contener al menos 3 caracteres.';
    if (control.hasError('email')) return 'Ingresa un correo válido.';
    if (control.hasError('duplicateIdEquipo')) return 'Ya existe otro equipo con ese ID en la empresa activa.';
    if (control.hasError('nonNegative')) return 'El valor no puede ser negativo.';
    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();
    this.form.reset({
      idEquipo: this.initialValue?.idEquipo ?? '',
      nombreEquipo: this.initialValue?.nombreEquipo ?? '',
      capacidad: this.initialValue?.capacidad ?? null,
      unidadCapacidad: this.initialValue?.unidadCapacidad ?? '',
      diametro: this.initialValue?.diametro ?? null,
      altura: this.initialValue?.altura ?? null,
      empresaFabricante: this.initialValue?.empresaFabricante ?? '',
      direccionFabricante: this.initialValue?.direccionFabricante ?? null,
      correoFabricante: this.initialValue?.correoFabricante ?? null,
      tipoEquipo: this.initialValue?.tipoEquipo ?? null,
      ubicacionOperativa: this.initialValue?.ubicacionOperativa ?? null,
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
    this.form.controls.idEquipo.setValidators([
      Validators.required,
      Validators.minLength(2),
      this.uniqueEquipmentIdValidator(),
    ]);
    this.form.controls.idEquipo.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueEquipmentIdValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);
      if (!normalizedValue) return null;

      const duplicated = this.existingEquipments.some((equipment) => {
        if (equipment.id === this.initialValue?.id) return false;
        return normalizeFieldValue(equipment.idEquipo) === normalizedValue;
      });

      return duplicated ? { duplicateIdEquipo: true } : null;
    };
  }

  private formatDate(value: string | null | undefined, fallback: string): string {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
