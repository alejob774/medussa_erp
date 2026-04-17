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
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { RouteFormMode, SaveRoutePayload } from '../../../domain/models/route-form.model';
import {
  EMPTY_ROUTE_CATALOGS,
  Route,
  RouteAssignableClient,
  RouteAssignedClient,
  RouteCatalogs,
  RouteStatus,
  RouteVendorOption,
} from '../../../domain/models/route.model';

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
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
            La ficha superior mantiene la coherencia entre zona, vendedor, conductor, clientes y calendario, siempre dentro de la empresa activa.
          </p>
        </div>

        <div class="erp-meta-card min-w-[260px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{ initialValue?.idRuta ? 'ID actual: ' + initialValue?.idRuta : 'Las nuevas rutas se crearán en este contexto.' }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando ruta...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros de la ruta</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>ID ruta</mat-label>
                    <input matInput formControlName="idRuta" />
                    @if (isInvalid('idRuta')) { <mat-error>{{ getErrorMessage('idRuta') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombre ruta</mat-label>
                    <input matInput formControlName="nombreRuta" />
                    @if (isInvalid('nombreRuta')) { <mat-error>{{ getErrorMessage('nombreRuta') }}</mat-error> }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Asignación operativa</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Zona, vendedor y conductor</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Zona</mat-label>
                    <mat-select formControlName="zona">
                      @for (zone of catalogs.zones; track zone.value) {
                        <mat-option [value]="zone.value">{{ zone.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('zona')) { <mat-error>{{ getErrorMessage('zona') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Vendedor</mat-label>
                    <mat-select formControlName="vendedorId" [disabled]="!selectedZone || mode === 'view'">
                      @for (vendor of compatibleVendors; track vendor.vendorId) {
                        <mat-option [value]="vendor.vendorId">{{ vendor.idVendedor }} · {{ vendor.nombre }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>{{ selectedZone ? 'Solo se muestran vendedores activos de la misma zona.' : 'Selecciona una zona para habilitar los vendedores.' }}</mat-hint>
                    @if (isInvalid('vendedorId')) { <mat-error>{{ getErrorMessage('vendedorId') }}</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Conductor</mat-label>
                    <mat-select formControlName="conductorId">
                      @for (driver of catalogs.drivers; track driver.driverId) {
                        <mat-option [value]="driver.driverId">{{ driver.idConductor }} · {{ driver.nombre }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('conductorId')) { <mat-error>{{ getErrorMessage('conductorId') }}</mat-error> }
                  </mat-form-field>

                  <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    La zona gobierna la compatibilidad del vendedor y del grupo de clientes.
                  </div>
                </div>

                @if (zoneChangeMessage) {
                  <div class="erp-alert erp-alert--warning mt-4">{{ zoneChangeMessage }}</div>
                }
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Clientes de la ruta</p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Asignación comercial homogénea</h3>
                  </div>

                  <div class="erp-meta-card min-w-[190px] px-4 py-3">
                    {{ assignedClientsCount }} clientes asignados
                  </div>
                </div>

                <div class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
                  <div class="space-y-4">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Clientes disponibles</mat-label>
                      <mat-select formControlName="clientesAsignados" multiple [disabled]="!selectedZone || mode === 'view'">
                        @for (client of compatibleClients; track client.clientId) {
                          <mat-option [value]="client.clientId">{{ client.idCliente }} · {{ client.nombre }}{{ client.ciudadNombre ? ' · ' + client.ciudadNombre : '' }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>{{ selectedZone ? 'Solo se muestran clientes activos de la misma zona.' : 'Selecciona una zona para habilitar los clientes.' }}</mat-hint>
                      @if (isInvalid('clientesAsignados')) { <mat-error>{{ getErrorMessage('clientesAsignados') }}</mat-error> }
                    </mat-form-field>
                  </div>

                  <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm font-semibold text-slate-800">Clientes seleccionados</p>

                    @if (selectedAssignedClients.length) {
                      <mat-chip-set class="mt-3 flex flex-wrap gap-2">
                        @for (client of selectedAssignedClients; track client.clientId) {
                          <mat-chip-row [removable]="mode !== 'view'" (removed)="removeAssignedClient(client.clientId)">
                            {{ client.idCliente }} · {{ client.nombre }}
                            @if (mode !== 'view') {
                              <button matChipRemove type="button" aria-label="Remover cliente asignado">
                                <mat-icon>cancel</mat-icon>
                              </button>
                            }
                          </mat-chip-row>
                        }
                      </mat-chip-set>

                      <div class="mt-4 grid gap-3">
                        @for (client of selectedAssignedClients; track client.clientId) {
                          <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p class="text-sm font-semibold text-slate-900">{{ client.nombre }}</p>
                            <p class="mt-1 text-xs text-slate-500">{{ client.idCliente }} · {{ client.zona }}</p>
                            @if (client.ciudadNombre) { <p class="mt-2 text-xs text-slate-500">{{ client.ciudadNombre }}</p> }
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="erp-empty-state !min-h-[10rem] !rounded-[1rem] !border-dashed !bg-white">
                        <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">groups</mat-icon>
                        <div>
                          <p class="text-sm font-semibold text-slate-700">No hay clientes asignados.</p>
                          <p class="mt-1 text-xs text-slate-500">Selecciona la zona y luego el grupo de clientes compatible.</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Calendario</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Días de ruta y despacho</h3>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm font-semibold text-slate-800">Días de ruta</p>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      @for (day of catalogs.weekDays; track day.value) {
                        <mat-checkbox [checked]="hasSelectedDay('diasRuta', day.value)" [disabled]="mode === 'view'" (change)="toggleDay('diasRuta', day.value, $event.checked)">
                          {{ day.label }}
                        </mat-checkbox>
                      }
                    </div>
                  </div>

                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm font-semibold text-slate-800">Días de despacho</p>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      @for (day of catalogs.weekDays; track day.value) {
                        <mat-checkbox [checked]="hasSelectedDay('diasDespacho', day.value)" [disabled]="mode === 'view'" (change)="toggleDay('diasDespacho', day.value, $event.checked)">
                          {{ day.label }}
                        </mat-checkbox>
                      }
                    </div>
                  </div>
                </div>

                @if (form.hasError('missingSchedule') && (form.dirty || form.touched)) {
                  <div class="erp-alert erp-alert--warning mt-4">Debes seleccionar al menos un día entre ruta y despacho.</div>
                }
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
                  <div class="flex items-center justify-between gap-3"><dt>ID ruta único por empresa</dt><dd class="font-semibold text-slate-900">Activo</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Zona homogénea</dt><dd class="text-right font-semibold text-slate-900">{{ selectedZone || 'Pendiente' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Clientes asignados</dt><dd class="font-semibold text-slate-900">{{ assignedClientsCount }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Días configurados</dt><dd class="font-semibold text-slate-900">{{ totalScheduledDays }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Eliminación inteligente</dt><dd class="text-right font-semibold text-slate-900">{{ initialValue?.tieneDependenciasActivas ? 'Pasa a inactivo' : 'Eliminación física permitida' }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Auditoría preparada</dt><dd class="font-semibold text-slate-900">Sí</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Creado</dt><dd class="text-right font-semibold text-slate-900">{{ createdAtLabel }}</dd></div>
                  <div class="flex items-center justify-between gap-3"><dt>Actualizado</dt><dd class="text-right font-semibold text-slate-900">{{ updatedAtLabel }}</dd></div>
                </dl>

                @if (initialValue?.tieneDependenciasActivas) {
                  <div class="erp-alert erp-alert--warning mt-5">Esta ruta tiene dependencias activas. La acción eliminar la dejará inactiva.</div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar ruta</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">{{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar ruta' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class RouteFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: RouteCatalogs = EMPTY_ROUTE_CATALOGS;
  @Input() existingRoutes: Route[] = [];
  @Input() initialValue: Route | null = null;
  @Input() mode: RouteFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveRoute = new EventEmitter<SaveRoutePayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();

  zoneChangeMessage = '';

  readonly form = this.fb.nonNullable.group(
    {
      idRuta: ['', [Validators.required, Validators.minLength(2)]],
      nombreRuta: ['', [Validators.required, Validators.minLength(3)]],
      zona: ['', [Validators.required]],
      vendedorId: ['', [Validators.required]],
      conductorId: ['', [Validators.required]],
      clientesAsignados: this.fb.nonNullable.control<string[]>([], [requiredArrayValidator()]),
      diasRuta: this.fb.nonNullable.control<string[]>([]),
      diasDespacho: this.fb.nonNullable.control<string[]>([]),
      estado: this.fb.nonNullable.control<RouteStatus>('ACTIVO', Validators.required),
    },
    { validators: [atLeastOneScheduleValidator()] },
  );

  constructor() {
    this.form.controls.zona.valueChanges.pipe(takeUntilDestroyed()).subscribe((zone) => {
      this.handleZoneChange(zone?.trim() || null);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de rutas. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    return this.mode === 'edit' ? 'Editar ruta' : this.mode === 'view' ? 'Detalle de la ruta' : 'Crear ruta';
  }

  get modeLabel(): string {
    return this.mode === 'edit' ? 'Modo edición' : this.mode === 'view' ? 'Modo visualización' : 'Modo creación';
  }

  get createdAtLabel(): string {
    return this.formatDate(this.initialValue?.createdAt, 'Se asignará al guardar');
  }

  get updatedAtLabel(): string {
    return this.formatDate(this.initialValue?.updatedAt, 'Pendiente');
  }

  get selectedZone(): string | null {
    return this.form.controls.zona.value?.trim() || null;
  }

  get compatibleVendors(): RouteVendorOption[] {
    return this.catalogs.vendors.filter((vendor) => vendor.zona === this.selectedZone);
  }

  get compatibleClients(): RouteAssignableClient[] {
    return this.catalogs.clients.filter((client) => client.zona === this.selectedZone);
  }

  get selectedAssignedClients(): RouteAssignedClient[] {
    const selectedIds = new Set(this.form.controls.clientesAsignados.value);
    const availableMap = new Map(this.compatibleClients.map((client) => [client.clientId, client]));
    const initialMap = new Map((this.initialValue?.clientesAsignados ?? []).map((client) => [client.clientId, client]));

    return Array.from(selectedIds)
      .map((clientId) => availableMap.get(clientId) ?? initialMap.get(clientId))
      .filter((client): client is RouteAssignedClient => client !== undefined);
  }

  get assignedClientsCount(): number {
    return this.form.controls.clientesAsignados.value.length;
  }

  get totalScheduledDays(): number {
    return this.form.controls.diasRuta.value.length + this.form.controls.diasDespacho.value.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingRoutes']) {
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
    const selectedVendor = this.catalogs.vendors.find((vendor) => vendor.vendorId === value.vendedorId) ?? null;
    const selectedDriver = this.catalogs.drivers.find((driver) => driver.driverId === value.conductorId) ?? null;

    this.pendingChangesService.clear();
    this.saveRoute.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      idRuta: value.idRuta.trim().toUpperCase(),
      nombreRuta: value.nombreRuta.trim(),
      zona: value.zona,
      vendedorId: value.vendedorId,
      vendedorNombre: selectedVendor?.nombre ?? '',
      conductorId: value.conductorId,
      conductorNombre: selectedDriver?.nombre ?? '',
      clientesAsignados: this.selectedAssignedClients.map((client) => ({ ...client })),
      diasRuta: [...value.diasRuta],
      diasDespacho: [...value.diasDespacho],
      estado: value.estado,
    });
  }

  cancel(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de rutas. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    if (this.mode === 'edit') {
      this.cancelEdit.emit();
      return;
    }

    this.closePanel.emit();
  }

  resetToCreate(): void {
    if (!this.pendingChangesService.confirmDiscard('Hay cambios sin guardar en el maestro de rutas. Si continúas, se descartarán. ¿Deseas seguir?')) {
      return;
    }

    this.cancelEdit.emit();
  }

  removeAssignedClient(clientId: string): void {
    if (this.mode === 'view') {
      return;
    }

    const nextValue = this.form.controls.clientesAsignados.value.filter((currentId) => currentId !== clientId);
    this.form.controls.clientesAsignados.setValue(nextValue);
    this.form.controls.clientesAsignados.markAsDirty();
    this.form.controls.clientesAsignados.updateValueAndValidity();
  }

  toggleDay(controlName: 'diasRuta' | 'diasDespacho', day: string, checked: boolean): void {
    if (this.mode === 'view') {
      return;
    }

    const currentValues = this.form.controls[controlName].value;
    const nextValues = checked ? Array.from(new Set([...currentValues, day])) : currentValues.filter((currentDay) => currentDay !== day);
    this.form.controls[controlName].setValue(nextValues);
    this.form.controls[controlName].markAsDirty();
    this.form.updateValueAndValidity();
  }

  hasSelectedDay(controlName: 'diasRuta' | 'diasDespacho', day: string): boolean {
    return this.form.controls[controlName].value.includes(day);
  }

  isInvalid(controlName: keyof RouteFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof RouteFormComponent['form']['controls']): string {
    const control = this.form.controls[controlName];
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return controlName === 'idRuta' ? 'Debe contener al menos 2 caracteres.' : 'Debe contener al menos 3 caracteres.';
    if (control.hasError('duplicateIdRuta')) return 'Ya existe otra ruta con ese ID en la empresa activa.';
    if (control.hasError('requiredArray')) return 'Debes asignar al menos un cliente.';
    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();
    this.form.reset({
      idRuta: this.initialValue?.idRuta ?? '',
      nombreRuta: this.initialValue?.nombreRuta ?? '',
      zona: this.initialValue?.zona ?? '',
      vendedorId: this.initialValue?.vendedorId ?? '',
      conductorId: this.initialValue?.conductorId ?? '',
      clientesAsignados: this.initialValue?.clientesAsignados.map((client) => client.clientId) ?? [],
      diasRuta: this.initialValue?.diasRuta ?? [],
      diasDespacho: this.initialValue?.diasDespacho ?? [],
      estado: this.initialValue?.estado ?? 'ACTIVO',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.zoneChangeMessage = '';

    if (this.mode === 'view') {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }

    this.handleZoneChange(this.form.controls.zona.value?.trim() || null, false);
    this.pendingChangesService.clear();
  }

  private applyDynamicValidators(): void {
    this.form.controls.idRuta.setValidators([Validators.required, Validators.minLength(2), this.uniqueRouteIdValidator()]);
    this.form.controls.idRuta.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueRouteIdValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);
      if (!normalizedValue) return null;
      const duplicated = this.existingRoutes.some((route) => route.id !== this.initialValue?.id && normalizeFieldValue(route.idRuta) === normalizedValue);
      return duplicated ? { duplicateIdRuta: true } : null;
    };
  }

  private handleZoneChange(zone: string | null, emitDirty = true): void {
    if (!zone) {
      const hadVendor = !!this.form.controls.vendedorId.value;
      const hadClients = this.form.controls.clientesAsignados.value.length > 0;
      if (hadVendor) this.form.controls.vendedorId.setValue('', { emitEvent: false });
      if (hadClients) this.form.controls.clientesAsignados.setValue([], { emitEvent: false });
      if (emitDirty && hadVendor) this.form.controls.vendedorId.markAsDirty();
      if (emitDirty && hadClients) this.form.controls.clientesAsignados.markAsDirty();
      this.zoneChangeMessage = 'Selecciona una zona para habilitar vendedor y clientes.';
      return;
    }

    const availableVendorIds = new Set(this.compatibleVendors.map((vendor) => vendor.vendorId));
    const availableClientIds = new Set(this.compatibleClients.map((client) => client.clientId));
    const selectedVendorId = this.form.controls.vendedorId.value;
    const selectedClients = this.form.controls.clientesAsignados.value;
    let message = '';

    if (selectedVendorId && !availableVendorIds.has(selectedVendorId)) {
      this.form.controls.vendedorId.setValue('', { emitEvent: false });
      if (emitDirty) this.form.controls.vendedorId.markAsDirty();
      message = 'La zona cambió y se removió el vendedor incompatible.';
    }

    const compatibleClients = selectedClients.filter((clientId) => availableClientIds.has(clientId));
    if (compatibleClients.length !== selectedClients.length) {
      this.form.controls.clientesAsignados.setValue(compatibleClients, { emitEvent: false });
      if (emitDirty) this.form.controls.clientesAsignados.markAsDirty();
      message = message ? `${message} También se removieron clientes incompatibles.` : 'La zona cambió y se removieron clientes incompatibles.';
    }

    this.zoneChangeMessage = message;
    this.form.controls.vendedorId.updateValueAndValidity({ emitEvent: false });
    this.form.controls.clientesAsignados.updateValueAndValidity({ emitEvent: false });
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

function requiredArrayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { requiredArray: true };
  };
}

function atLeastOneScheduleValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const diasRuta = (control.get('diasRuta')?.value as string[] | null) ?? [];
    const diasDespacho = (control.get('diasDespacho')?.value as string[] | null) ?? [];
    return diasRuta.length || diasDespacho.length ? null : { missingSchedule: true };
  };
}
