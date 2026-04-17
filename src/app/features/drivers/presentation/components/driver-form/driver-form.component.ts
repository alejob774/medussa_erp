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
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { DriverFormMode, SaveDriverPayload } from '../../../domain/models/driver-form.model';
import {
  Driver,
  DriverAssignableRoute,
  DriverAssignedRoute,
  DriverCatalogs,
  DriverStatus,
  EMPTY_DRIVER_CATALOGS,
} from '../../../domain/models/driver.model';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
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
            <p class="erp-page-eyebrow !mb-0">Supply Chain Management</p>
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
            La ficha superior trabaja sobre la empresa activa, mantiene el ID conductor único por empresa y permite reasignar rutas activas con advertencia explícita antes de guardar.
          </p>
        </div>

        <div class="erp-meta-card min-w-[260px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{
              initialValue?.idConductor
                ? 'ID actual: ' + initialValue?.idConductor
                : 'Los nuevos conductores se crearán en este contexto.'
            }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando conductor...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del conductor</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>ID conductor</mat-label>
                    <input matInput formControlName="idConductor" />
                    @if (isInvalid('idConductor')) {
                      <mat-error>{{ getErrorMessage('idConductor') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombre conductor</mat-label>
                    <input matInput formControlName="nombreConductor" />
                    @if (isInvalid('nombreConductor')) {
                      <mat-error>{{ getErrorMessage('nombreConductor') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Tipo documento</mat-label>
                    <mat-select formControlName="tipoDocumento">
                      @for (option of catalogs.documentTypes; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('tipoDocumento')) {
                      <mat-error>{{ getErrorMessage('tipoDocumento') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Número documento</mat-label>
                    <input matInput formControlName="numeroDocumento" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('numeroDocumento')) {
                      <mat-error>{{ getErrorMessage('numeroDocumento') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Contacto y ubicación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Ciudad, dirección y contacto</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad</mat-label>
                    <mat-select formControlName="ciudadId">
                      <mat-option [value]="null">Sin ciudad</mat-option>
                      @for (city of catalogs.cities; track city.id) {
                        <mat-option [value]="city.id">
                          {{ city.name }}{{ city.department ? ' · ' + city.department : '' }}
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Celular</mat-label>
                    <input matInput formControlName="celular" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('celular')) {
                      <mat-error>{{ getErrorMessage('celular') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Dirección</mat-label>
                    <textarea matInput rows="3" formControlName="direccion"></textarea>
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('email')) {
                      <mat-error>{{ getErrorMessage('email') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Licencia</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Información de conducción</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-3">
                  <mat-form-field appearance="outline">
                    <mat-label>Número licencia</mat-label>
                    <input matInput formControlName="numeroLicencia" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Categoría licencia</mat-label>
                    <mat-select formControlName="categoriaLicencia">
                      <mat-option [value]="null">Sin categoría</mat-option>
                      @for (option of catalogs.licenseCategories; track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Vencimiento licencia</mat-label>
                    <input matInput type="date" formControlName="vencimientoLicencia" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('vencimientoLicencia')) {
                      <mat-error>{{ getErrorMessage('vencimientoLicencia') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Rutas asignadas</p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Asignación logística multi ruta</h3>
                  </div>

                  <div class="erp-meta-card min-w-[180px] px-4 py-3">
                    {{ assignedRoutesCount }} rutas asignadas
                  </div>
                </div>

                <div class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
                  <div class="space-y-4">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Rutas disponibles</mat-label>
                      <mat-select formControlName="rutasAsignadas" multiple [disabled]="mode === 'view'">
                        @for (route of assignableRoutes; track route.routeId) {
                          <mat-option [value]="route.routeId">
                            <div class="flex flex-col gap-1 py-1">
                              <span class="font-semibold text-slate-800">{{ route.idRuta }} · {{ route.nombreRuta }}</span>
                              <span class="text-xs text-slate-500">{{ route.zona }}</span>
                              @if (isRouteAssignedToAnotherDriver(route)) {
                                <span class="text-xs font-semibold text-amber-700">
                                  Reasignar desde {{ route.assignedDriverCode }} · {{ route.assignedDriverName }}
                                </span>
                              }
                            </div>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-hint>
                        Solo se muestran rutas activas de la empresa. Si una ya pertenece a otro conductor, podrás reasignarla al guardar.
                      </mat-hint>
                      @if (isInvalid('rutasAsignadas')) {
                        <mat-error>{{ getErrorMessage('rutasAsignadas') }}</mat-error>
                      }
                    </mat-form-field>

                    @if (reassignmentWarnings.length) {
                      <div class="erp-alert erp-alert--warning">
                        Estas rutas se reasignarán al guardar: {{ reassignmentWarnings.join(', ') }}.
                      </div>
                    }
                  </div>

                  <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm font-semibold text-slate-800">Rutas seleccionadas</p>

                    @if (selectedAssignedRoutes.length) {
                      <mat-chip-set class="mt-3 flex flex-wrap gap-2">
                        @for (route of selectedAssignedRoutes; track route.routeId) {
                          <mat-chip-row [removable]="mode !== 'view'" (removed)="removeAssignedRoute(route.routeId)">
                            {{ route.idRuta }} · {{ route.nombreRuta }}
                            @if (mode !== 'view') {
                              <button matChipRemove type="button" aria-label="Remover ruta asignada">
                                <mat-icon>cancel</mat-icon>
                              </button>
                            }
                          </mat-chip-row>
                        }
                      </mat-chip-set>

                      <div class="mt-4 grid gap-3">
                        @for (route of selectedAssignedRoutes; track route.routeId) {
                          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p class="text-sm font-semibold text-slate-900">{{ route.nombreRuta }}</p>
                            <p class="mt-1 text-xs text-slate-500">{{ route.idRuta }} · {{ route.zona }}</p>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="erp-empty-state !min-h-[10rem] !rounded-[1rem] !border-dashed !bg-white">
                        <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">route</mat-icon>
                        <div>
                          <p class="text-sm font-semibold text-slate-700">No hay rutas asignadas.</p>
                          <p class="mt-1 text-xs text-slate-500">Selecciona una o varias rutas activas para este conductor.</p>
                        </div>
                      </div>
                    }
                  </div>
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
                    <dt>ID conductor único por empresa</dt>
                    <dd class="font-semibold text-slate-900">Activo</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Rutas asignadas</dt>
                    <dd class="font-semibold text-slate-900">{{ assignedRoutesCount }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Reasignaciones detectadas</dt>
                    <dd class="font-semibold text-slate-900">{{ reassignmentWarnings.length }}</dd>
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
                    Este conductor tiene dependencias activas. La acción eliminar lo dejará inactivo.
                  </div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar conductor</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">
                {{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar conductor' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class DriverFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: DriverCatalogs = EMPTY_DRIVER_CATALOGS;
  @Input() existingDrivers: Driver[] = [];
  @Input() initialValue: Driver | null = null;
  @Input() mode: DriverFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;
  @Input() assignableRoutes: DriverAssignableRoute[] = [];

  @Output() saveDriver = new EventEmitter<SaveDriverPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    idConductor: ['', [Validators.required, Validators.minLength(2)]],
    nombreConductor: ['', [Validators.required, Validators.minLength(3)]],
    tipoDocumento: ['', [Validators.required]],
    numeroDocumento: this.fb.control<string | null>(null, [optionalDocumentValidator()]),
    ciudadId: this.fb.control<string | null>(null),
    direccion: this.fb.control<string | null>(null),
    celular: this.fb.control<string | null>(null, [optionalPhoneValidator()]),
    email: this.fb.control<string | null>(null, [Validators.email]),
    numeroLicencia: this.fb.control<string | null>(null),
    categoriaLicencia: this.fb.control<string | null>(null),
    vencimientoLicencia: this.fb.control<string | null>(null, [optionalDateValidator()]),
    rutasAsignadas: this.fb.nonNullable.control<string[]>([], [requiredArrayValidator()]),
    estado: this.fb.nonNullable.control<DriverStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de conductores. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    switch (this.mode) {
      case 'edit':
        return 'Editar conductor';
      case 'view':
        return 'Detalle del conductor';
      default:
        return 'Crear conductor';
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

  get selectedAssignedRoutes(): DriverAssignedRoute[] {
    const selectedIds = new Set(this.form.controls.rutasAsignadas.value);
    const availableMap = new Map(this.assignableRoutes.map((route) => [route.routeId, route]));
    const initialMap = new Map(
      (this.initialValue?.rutasAsignadas ?? []).map((route) => [route.routeId, route]),
    );

    return Array.from(selectedIds)
      .map((routeId) => availableMap.get(routeId) ?? initialMap.get(routeId))
      .filter((route): route is DriverAssignedRoute => route !== undefined);
  }

  get assignedRoutesCount(): number {
    return this.form.controls.rutasAsignadas.value.length;
  }

  get reassignmentWarnings(): string[] {
    return this.selectedAssignedRoutes
      .map((route) => this.assignableRoutes.find((candidate) => candidate.routeId === route.routeId))
      .filter((route): route is DriverAssignableRoute => route !== undefined)
      .filter((route) => this.isRouteAssignedToAnotherDriver(route))
      .map((route) => route.nombreRuta);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingDrivers']) {
      this.applyDynamicValidators();
    }

    if (changes['initialValue'] || changes['mode'] || changes['catalogs']) {
      this.resetForm();
    }

    if (changes['assignableRoutes']) {
      this.reconcileSelectedRoutes();
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
    this.saveDriver.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      idConductor: value.idConductor.trim().toUpperCase(),
      nombreConductor: value.nombreConductor.trim(),
      tipoDocumento: value.tipoDocumento,
      numeroDocumento: value.numeroDocumento?.trim().toUpperCase() || null,
      ciudadId: value.ciudadId,
      ciudadNombre: selectedCity?.name ?? null,
      direccion: value.direccion?.trim() || null,
      celular: value.celular?.trim() || null,
      email: value.email?.trim().toLowerCase() || null,
      numeroLicencia: value.numeroLicencia?.trim() || null,
      categoriaLicencia: value.categoriaLicencia?.trim() || null,
      vencimientoLicencia: value.vencimientoLicencia || null,
      rutasAsignadas: this.selectedAssignedRoutes.map((route) => ({ ...route })),
      estado: value.estado,
    });
  }

  cancel(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de conductores. Si continúas, se descartarán. ¿Deseas seguir?',
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
        'Hay cambios sin guardar en el maestro de conductores. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
      return;
    }

    this.cancelEdit.emit();
  }

  removeAssignedRoute(routeId: string): void {
    if (this.mode === 'view') {
      return;
    }

    const nextValue = this.form.controls.rutasAsignadas.value.filter((currentId) => currentId !== routeId);
    this.form.controls.rutasAsignadas.setValue(nextValue);
    this.form.controls.rutasAsignadas.markAsDirty();
    this.form.controls.rutasAsignadas.updateValueAndValidity();
  }

  isInvalid(controlName: keyof DriverFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  isRouteAssignedToAnotherDriver(route: DriverAssignableRoute): boolean {
    return !!route.assignedDriverId && route.assignedDriverId !== this.initialValue?.id;
  }

  getErrorMessage(controlName: keyof DriverFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return controlName === 'idConductor'
        ? 'Debe contener al menos 2 caracteres.'
        : 'Debe contener al menos 3 caracteres.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('duplicateIdConductor')) {
      return 'Ya existe otro conductor con ese ID en la empresa activa.';
    }

    if (control.hasError('requiredArray')) {
      return 'Debes asignar al menos una ruta.';
    }

    if (control.hasError('invalidPhone')) {
      return 'El celular debe contener entre 7 y 15 dígitos.';
    }

    if (control.hasError('invalidDocument')) {
      return 'El número de documento debe tener entre 5 y 20 caracteres alfanuméricos.';
    }

    if (control.hasError('invalidDate')) {
      return 'Ingresa una fecha válida.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();

    this.form.reset({
      idConductor: this.initialValue?.idConductor ?? '',
      nombreConductor: this.initialValue?.nombreConductor ?? '',
      tipoDocumento: this.initialValue?.tipoDocumento ?? this.catalogs.documentTypes[0]?.value ?? '',
      numeroDocumento: this.initialValue?.numeroDocumento ?? null,
      ciudadId: this.initialValue?.ciudadId ?? null,
      direccion: this.initialValue?.direccion ?? null,
      celular: this.initialValue?.celular ?? null,
      email: this.initialValue?.email ?? null,
      numeroLicencia: this.initialValue?.numeroLicencia ?? null,
      categoriaLicencia: this.initialValue?.categoriaLicencia ?? null,
      vencimientoLicencia: this.initialValue?.vencimientoLicencia ?? null,
      rutasAsignadas: this.initialValue?.rutasAsignadas.map((route) => route.routeId) ?? [],
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
    this.form.controls.idConductor.setValidators([
      Validators.required,
      Validators.minLength(2),
      this.uniqueDriverIdValidator(),
    ]);
    this.form.controls.idConductor.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueDriverIdValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);

      if (!normalizedValue) {
        return null;
      }

      const duplicated = this.existingDrivers.some((driver) => {
        if (driver.id === this.initialValue?.id) {
          return false;
        }

        return normalizeFieldValue(driver.idConductor) === normalizedValue;
      });

      return duplicated ? { duplicateIdConductor: true } : null;
    };
  }

  private reconcileSelectedRoutes(): void {
    const availableRouteIds = new Set(this.assignableRoutes.map((route) => route.routeId));
    const initialRouteIds = new Set((this.initialValue?.rutasAsignadas ?? []).map((route) => route.routeId));
    const nextSelections = this.form.controls.rutasAsignadas.value.filter(
      (routeId) => availableRouteIds.has(routeId) || initialRouteIds.has(routeId),
    );

    if (nextSelections.length !== this.form.controls.rutasAsignadas.value.length) {
      this.form.controls.rutasAsignadas.setValue(nextSelections, { emitEvent: false });
      this.form.controls.rutasAsignadas.updateValueAndValidity({ emitEvent: false });
    }
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

function optionalPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return /^\+?[0-9]{7,15}$/.test(value) ? null : { invalidPhone: true };
  };
}

function optionalDocumentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return /^[A-Z0-9-]{5,20}$/i.test(value) ? null : { invalidDocument: true };
  };
}

function optionalDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return Number.isNaN(new Date(value).getTime()) ? { invalidDate: true } : null;
  };
}

function requiredArrayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { requiredArray: true };
  };
}