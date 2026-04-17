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
import { SaveVendorPayload, VendorFormMode } from '../../../domain/models/vendor-form.model';
import {
  EMPTY_VENDOR_CATALOGS,
  Vendor,
  VendorAssignableClient,
  VendorAssignedClient,
  VendorCatalogs,
  VendorStatus,
} from '../../../domain/models/vendor.model';

@Component({
  selector: 'app-vendor-form',
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
            La ficha superior trabaja sobre la empresa activa y restringe la asignación de clientes a la misma zona comercial del vendedor.
          </p>
        </div>

        <div class="erp-meta-card min-w-[260px]">
          <p class="erp-meta-card__label">Empresa activa</p>
          <p class="erp-meta-card__value">{{ activeCompanyName || 'Sin empresa activa' }}</p>
          <p class="erp-meta-card__hint">
            {{
              initialValue?.idVendedor
                ? 'ID actual: ' + initialValue?.idVendedor
                : 'Los nuevos vendedores se crearán en este contexto.'
            }}
          </p>
        </div>
      </div>

      @if (loading) {
        <div class="erp-empty-state !min-h-[22rem]">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando vendedor...</p>
          </div>
        </div>
      } @else {
        <form class="mt-6 space-y-6" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
            <div class="space-y-6">
              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identificación</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos maestros del vendedor</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>ID vendedor</mat-label>
                    <input matInput formControlName="idVendedor" />
                    @if (isInvalid('idVendedor')) {
                      <mat-error>{{ getErrorMessage('idVendedor') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombre vendedor</mat-label>
                    <input matInput formControlName="nombreVendedor" />
                    @if (isInvalid('nombreVendedor')) {
                      <mat-error>{{ getErrorMessage('nombreVendedor') }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </section>

              <section class="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Comercial</p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Clasificación y meta</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo vendedor</mat-label>
                    <mat-select formControlName="tipoVendedor">
                      @for (type of catalogs.vendorTypes; track type.value) {
                        <mat-option [value]="type.value">{{ type.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('tipoVendedor')) {
                      <mat-error>{{ getErrorMessage('tipoVendedor') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Zona</mat-label>
                    <mat-select formControlName="zona">
                      @for (zone of catalogs.zones; track zone.value) {
                        <mat-option [value]="zone.value">{{ zone.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('zona')) {
                      <mat-error>{{ getErrorMessage('zona') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Canal</mat-label>
                    <mat-select formControlName="canal">
                      @for (channel of catalogs.channels; track channel.value) {
                        <mat-option [value]="channel.value">{{ channel.label }}</mat-option>
                      }
                    </mat-select>
                    @if (isInvalid('canal')) {
                      <mat-error>{{ getErrorMessage('canal') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Cuota mensual</mat-label>
                    <input matInput type="number" formControlName="cuotaMensual" />
                    <mat-hint>Opcional</mat-hint>
                    @if (isInvalid('cuotaMensual')) {
                      <mat-error>{{ getErrorMessage('cuotaMensual') }}</mat-error>
                    }
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
                <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Clientes asignados</p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Asignación comercial por zona</h3>
                  </div>

                  <div class="erp-meta-card min-w-[180px] px-4 py-3">
                    {{ assignedClientsCount }} clientes asignados
                  </div>
                </div>

                <div class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
                  <div class="space-y-4">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Clientes disponibles</mat-label>
                      <mat-select formControlName="clientesAsignados" multiple [disabled]="!selectedZone || mode === 'view'">
                        @for (client of assignableClients; track client.clientId) {
                          <mat-option [value]="client.clientId">
                            {{ client.idCliente }} · {{ client.nombre }}
                          </mat-option>
                        }
                      </mat-select>
                      @if (!selectedZone) {
                        <mat-hint>Selecciona una zona para habilitar los clientes.</mat-hint>
                      } @else {
                        <mat-hint>Solo se muestran clientes activos de la misma zona y empresa.</mat-hint>
                      }
                      @if (isInvalid('clientesAsignados')) {
                        <mat-error>{{ getErrorMessage('clientesAsignados') }}</mat-error>
                      }
                    </mat-form-field>

                    @if (zoneChangeMessage) {
                      <div class="erp-alert erp-alert--warning">{{ zoneChangeMessage }}</div>
                    }
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
                    } @else {
                      <div class="erp-empty-state !min-h-[10rem] !rounded-[1rem] !border-dashed !bg-white">
                        <mat-icon class="erp-empty-state__icon !h-8 !w-8 !text-3xl">person_add</mat-icon>
                        <div>
                          <p class="text-sm font-semibold text-slate-700">No hay clientes asignados.</p>
                          <p class="mt-1 text-xs text-slate-500">Selecciona la zona y luego los clientes compatibles.</p>
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
                    <dt>ID vendedor único por empresa</dt>
                    <dd class="font-semibold text-slate-900">Activo</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Clientes alineados por zona</dt>
                    <dd class="font-semibold text-slate-900">{{ selectedZone || 'Pendiente' }}</dd>
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
                    Este vendedor tiene dependencias activas. La acción eliminar lo dejará inactivo.
                  </div>
                }
              </section>
            </div>
          </div>

          <div class="erp-action-bar !px-0 !pb-0">
            @if (mode === 'view') {
              <button mat-stroked-button type="button" (click)="closePanel.emit()">Cerrar ficha</button>
              <button mat-stroked-button type="button" (click)="resetToCreate()">Crear nuevo</button>
              <button mat-flat-button color="primary" type="button" (click)="requestEdit.emit()">Editar vendedor</button>
            } @else {
              <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">
                {{ mode === 'edit' ? 'Cancelar' : 'Cerrar' }}
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading || !activeCompanyId">
                {{ saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar vendedor' }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class VendorFormComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: VendorCatalogs = EMPTY_VENDOR_CATALOGS;
  @Input() existingVendors: Vendor[] = [];
  @Input() initialValue: Vendor | null = null;
  @Input() mode: VendorFormMode = 'create';
  @Input() activeCompanyId = '';
  @Input() activeCompanyName = '';
  @Input() loading = false;
  @Input() saving = false;
  @Input() assignableClients: VendorAssignableClient[] = [];

  @Output() saveVendor = new EventEmitter<SaveVendorPayload>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() zoneChanged = new EventEmitter<string | null>();

  zoneChangeMessage = '';

  readonly form = this.fb.nonNullable.group({
    idVendedor: ['', [Validators.required, Validators.minLength(2)]],
    nombreVendedor: ['', [Validators.required, Validators.minLength(3)]],
    tipoVendedor: ['', [Validators.required]],
    zona: ['', [Validators.required]],
    canal: ['', [Validators.required]],
    cuotaMensual: this.fb.control<number | null>(null, [nonNegativeOptionalValidator()]),
    ciudadId: this.fb.control<string | null>(null),
    direccion: this.fb.control<string | null>(null),
    celular: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null, [Validators.email]),
    clientesAsignados: this.fb.nonNullable.control<string[]>([], [requiredArrayValidator()]),
    estado: this.fb.nonNullable.control<VendorStatus>('ACTIVO', Validators.required),
  });

  constructor() {
    this.form.controls.zona.valueChanges.pipe(takeUntilDestroyed()).subscribe((zone) => {
      this.handleZoneChange(zone?.trim() || null);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.mode !== 'view' && this.form.dirty,
        'Hay cambios sin guardar en el maestro de vendedores. Si continúas, se descartarán. ¿Deseas seguir?',
      );
    });
  }

  get titleLabel(): string {
    switch (this.mode) {
      case 'edit':
        return 'Editar vendedor';
      case 'view':
        return 'Detalle del vendedor';
      default:
        return 'Crear vendedor';
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

  get selectedZone(): string | null {
    return this.form.controls.zona.value?.trim() || null;
  }

  get selectedAssignedClients(): VendorAssignedClient[] {
    const selectedIds = new Set(this.form.controls.clientesAsignados.value);
    const availableMap = new Map(this.assignableClients.map((client) => [client.clientId, client]));
    const initialMap = new Map(
      (this.initialValue?.clientesAsignados ?? []).map((client) => [client.clientId, client]),
    );

    return Array.from(selectedIds)
      .map((clientId) => availableMap.get(clientId) ?? initialMap.get(clientId))
      .filter((client): client is VendorAssignedClient => client !== undefined);
  }

  get assignedClientsCount(): number {
    return this.form.controls.clientesAsignados.value.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingVendors']) {
      this.applyDynamicValidators();
    }

    if (changes['initialValue'] || changes['mode'] || changes['catalogs']) {
      this.resetForm();
    }

    if (changes['assignableClients']) {
      this.reconcileSelectedClients();
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
    this.saveVendor.emit({
      empresaId: this.activeCompanyId,
      empresaNombre: this.activeCompanyName,
      idVendedor: value.idVendedor.trim().toUpperCase(),
      nombreVendedor: value.nombreVendedor.trim(),
      tipoVendedor: value.tipoVendedor,
      zona: value.zona,
      canal: value.canal,
      cuotaMensual: value.cuotaMensual,
      ciudadId: value.ciudadId,
      ciudadNombre: selectedCity?.name ?? null,
      direccion: value.direccion?.trim() || null,
      celular: value.celular?.trim() || null,
      email: value.email?.trim().toLowerCase() || null,
      clientesAsignados: this.selectedAssignedClients.map((client) => ({ ...client })),
      estado: value.estado,
    });
  }

  cancel(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el maestro de vendedores. Si continúas, se descartarán. ¿Deseas seguir?',
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
        'Hay cambios sin guardar en el maestro de vendedores. Si continúas, se descartarán. ¿Deseas seguir?',
      )
    ) {
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

  isInvalid(controlName: keyof VendorFormComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof VendorFormComponent['form']['controls']): string {
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

    if (control.hasError('duplicateIdVendedor')) {
      return 'Ya existe otro vendedor con ese ID en la empresa activa.';
    }

    if (control.hasError('nonNegative')) {
      return 'El valor no puede ser negativo.';
    }

    if (control.hasError('requiredArray')) {
      return 'Debes asignar al menos un cliente.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(): void {
    this.applyDynamicValidators();

    this.form.reset({
      idVendedor: this.initialValue?.idVendedor ?? '',
      nombreVendedor: this.initialValue?.nombreVendedor ?? '',
      tipoVendedor: this.initialValue?.tipoVendedor ?? '',
      zona: this.initialValue?.zona ?? '',
      canal: this.initialValue?.canal ?? '',
      cuotaMensual: this.initialValue?.cuotaMensual ?? null,
      ciudadId: this.initialValue?.ciudadId ?? null,
      direccion: this.initialValue?.direccion ?? null,
      celular: this.initialValue?.celular ?? null,
      email: this.initialValue?.email ?? null,
      clientesAsignados: this.initialValue?.clientesAsignados.map((client) => client.clientId) ?? [],
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

    this.zoneChanged.emit(this.form.controls.zona.value?.trim() || null);
    this.pendingChangesService.clear();
  }

  private applyDynamicValidators(): void {
    this.form.controls.idVendedor.setValidators([
      Validators.required,
      Validators.minLength(2),
      this.uniqueVendorIdValidator(),
    ]);
    this.form.controls.idVendedor.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueVendorIdValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);

      if (!normalizedValue) {
        return null;
      }

      const duplicated = this.existingVendors.some((vendor) => {
        if (vendor.id === this.initialValue?.id) {
          return false;
        }

        return normalizeFieldValue(vendor.idVendedor) === normalizedValue;
      });

      return duplicated ? { duplicateIdVendedor: true } : null;
    };
  }

  private handleZoneChange(zone: string | null): void {
    this.zoneChanged.emit(zone);

    if (!zone) {
      if (this.form.controls.clientesAsignados.value.length) {
        this.form.controls.clientesAsignados.setValue([]);
        this.form.controls.clientesAsignados.markAsDirty();
      }

      this.zoneChangeMessage = 'Selecciona una zona para habilitar la asignación de clientes.';
      return;
    }

    const availableClientIds = new Set(this.assignableClients.map((client) => client.clientId));
    const currentSelections = this.form.controls.clientesAsignados.value;
    const compatibleSelections = currentSelections.filter((clientId) => availableClientIds.has(clientId));

    if (compatibleSelections.length !== currentSelections.length) {
      this.form.controls.clientesAsignados.setValue(compatibleSelections);
      this.form.controls.clientesAsignados.markAsDirty();
      this.zoneChangeMessage =
        'La zona cambió y se removieron clientes incompatibles con la nueva selección.';
    } else {
      this.zoneChangeMessage = '';
    }

    this.form.controls.clientesAsignados.updateValueAndValidity({ emitEvent: false });
  }

  private reconcileSelectedClients(): void {
    const selectedZone = this.selectedZone;

    if (!selectedZone) {
      return;
    }

    const availableClientIds = new Set(this.assignableClients.map((client) => client.clientId));
    const nextSelections = this.form.controls.clientesAsignados.value.filter((clientId) => availableClientIds.has(clientId));

    if (nextSelections.length !== this.form.controls.clientesAsignados.value.length) {
      this.form.controls.clientesAsignados.setValue(nextSelections, { emitEvent: false });
      this.form.controls.clientesAsignados.updateValueAndValidity({ emitEvent: false });
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

function nonNegativeOptionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number(value) >= 0 ? null : { nonNegative: true };
  };
}

function requiredArrayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { requiredArray: true };
  };
}