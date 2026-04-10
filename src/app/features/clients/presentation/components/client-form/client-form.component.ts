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
import { SaveClientPayload, ClientFormMode } from '../../../domain/models/client-form.model';
import { EMPTY_CLIENT_CATALOGS, Client, ClientCatalogs, ClientStatus } from '../../../domain/models/client.model';

@Component({
  selector: 'app-client-form',
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
            <p class="erp-page-eyebrow !mb-0">Ventas</p>
            <span class="erp-chip erp-chip--neutral">{{ modeLabel }}</span>
            @if (initialValue) {
              <span
                class="erp-chip"
                [class.erp-chip--success]="initialValue.estado === 'ACTIVO'"
                [class.erp-chip--warning]="initialValue.estado === 'INACTIVO'"
              >
                {{ initialValue.estado }}
              </span>
            }
          </div>

          <h2 class="mt-3 text-2xl font-bold text-slate-900">{{ titleLabel }}</h2>
          <p class="mt-2 max-w-3xl text-sm text-slate-500">
            La ficha superior trabaja sobre la empresa activa y mantiene el ID cliente único por empresa.
          </p>
        </div>

        <div class="erp-meta-card min-w-[240px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{
              initialValue?.idCliente
                ? 'ID actual: ' + initialValue?.idCliente
                : 'Los nuevos clientes se crearán en este contexto.'
            }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando cliente...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del cliente</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>ID cliente</mat-label>
                    <input matInput formControlName="idCliente" />
                    @if (isInvalid('idCliente')) {
                      <mat-error>{{ getErrorMessage('idCliente') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de identificación</mat-label>
                    <mat-select formControlName="tipoIdentificacion">
                      @for (option of catalogs.identificationTypes; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('tipoIdentificacion')) {
                      <mat-error>{{ getErrorMessage('tipoIdentificacion') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="nombre" />
                    @if (isInvalid('nombre')) {
                      <mat-error>{{ getErrorMessage('nombre') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Nombre comercial</mat-label>
                    <input matInput formControlName="nombreComercial" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Ubicación y contacto</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Ciudad, dirección y canales</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad</mat-label>
                    <mat-select formControlName="ciudadId">
                      @for (city of catalogs.cities; track city.id) {
                        <mat-option [value]="city.id">
                          {{ city.name }}{{ city.department ? ' · ' + city.department : '' }}
                        </mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('ciudadId')) {
                      <mat-error>{{ getErrorMessage('ciudadId') }}</mat-error>
                    }
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

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Dirección</mat-label>
                    <textarea matInput rows="3" formControlName="direccion"></textarea>
                    @if (isInvalid('direccion')) {
                      <mat-error>{{ getErrorMessage('direccion') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="telefono" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('email')) {
                      <mat-error>{{ getErrorMessage('email') }}</mat-error>
                    }
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

                  <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    Zona y vendedor asociado no se gestionan en esta HU. El modelo queda preparado para futuras extensiones.
                  </div>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Resumen operativo</p>
                <h3 class="mt-2 text-lg font-semibold text-slate-900">Condiciones de negocio</h3>

                <dl class="mt-4 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <dt>ID cliente único por empresa</dt>
                    <dd class="font-semibold text-slate-900">Activo</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Eliminación inteligente</dt>
                    <dd class="text-right font-semibold text-slate-900">
                      {{ initialValue?.tieneDependenciasActivas ? 'Pasa a inactivo' : 'Eliminación física permitida' }}
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

                @if (initialValue?.tieneDependenciasActivas) {
                  <div class="erp-alert erp-alert--warning mt-5">
                    Este cliente tiene dependencias activas. La acción eliminar lo dejará inactivo.
                  </div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar cliente</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">
                {{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar cliente' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class ClientFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: ClientCatalogs = EMPTY_CLIENT_CATALOGS;
  @Input() existingClients: Client[] = [];
  @Input() initialValue: Client | null = null;
  @Input() mode: ClientFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveClient = new EventEmitter<SaveClientPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    idCliente: ['', [Validators.required, Validators.minLength(2)]],
    tipoIdentificacion: ['', [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    nombreComercial: this.fb.control<string | null>(null),
    ciudadId: ['', [Validators.required]],
    direccion: ['', [Validators.required, Validators.minLength(3)]],
    telefono: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null, [Validators.email]),
    estado: this.fb.nonNullable.control<ClientStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de clientes. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    switch (this.mode) {
      case 'edit':
        return 'Editar cliente';
      case 'view':
        return 'Detalle del cliente';
      default:
        return 'Crear cliente';
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
    if (changes['existingClients']) {
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
    this.saveClient.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      idCliente: value.idCliente.trim().toUpperCase(),
      tipoIdentificacion: value.tipoIdentificacion,
      nombre: value.nombre.trim(),
      nombreComercial: value.nombreComercial?.trim() || null,
      ciudadId: value.ciudadId,
      ciudadNombre: selectedCity?.name ?? '',
      direccion: value.direccion.trim(),
      telefono: value.telefono?.trim() || null,
      email: value.email?.trim().toLowerCase() || null,
      estado: value.estado,
    });
  }

  cancel(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de clientes. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
      return;
    }

    if (this.mode === 'edit') {
      this.cancelEdit.emit();
      return;
    }

    this.closePanel.emit();
  }

  resetToCreate(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de clientes. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
      return;
    }

    this.cancelEdit.emit();
  }

  isInvalid(controlName: keyof ClientFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof ClientFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'Debe contener al menos 3 caracteres.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('duplicateIdCliente')) {
      return 'Ya existe otro cliente con ese ID en la empresa activa.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();

    this.form.reset({
      idCliente: this.initialValue?.idCliente ?? '',
      tipoIdentificacion:
        this.initialValue?.tipoIdentificacion ?? this.catalogs.identificationTypes[0]?.value ?? '',
      nombre: this.initialValue?.nombre ?? '',
      nombreComercial: this.initialValue?.nombreComercial ?? null,
      ciudadId: this.initialValue?.ciudadId ?? this.catalogs.cities[0]?.id ?? '',
      direccion: this.initialValue?.direccion ?? '',
      telefono: this.initialValue?.telefono ?? null,
      email: this.initialValue?.email ?? null,
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
    this.form.controls.idCliente.setValidators([
      Validators.required,
      Validators.minLength(2),
      this.uniqueIdClienteValidator(),
    ]);
    this.form.controls.idCliente.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueIdClienteValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);

      if (!normalizedValue) {
        return null;
      }

      const duplicated = this.existingClients.some((client) => {
        if (client.id === this.initialValue?.id) {
          return false;
        }

        return normalizeFieldValue(client.idCliente) === normalizedValue;
      });

      return duplicated ? { duplicateIdCliente: true } : null;
    };
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

function normalizeFieldValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}