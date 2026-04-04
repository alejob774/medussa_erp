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
import { merge } from 'rxjs';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import {
  ModulePermissionVm,
  PermissionActionKey,
  ProfileDetailVm,
  ProfileFormValue,
} from '../../models/security-administration.model';
import {
  SECURITY_PERMISSION_ACTION_LABELS,
  clonePermissionMatrix,
  getEnabledActionKeys,
  normalizePermissionActionSet,
} from '../../utils/security-authorization.utils';

@Component({
  selector: 'app-profile-form-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" (click)="close()"></div>

    <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1100px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              Seguridad
            </p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">
              {{ initialValue ? 'Editar perfil de acceso' : 'Nuevo perfil de acceso' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Selecciona los permisos que formarán parte del perfil de acceso.
            </p>
          </div>

          <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </header>

      <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="submit()">
        <div class="flex-1 space-y-6 overflow-auto px-6 py-6">
          <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <section class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Nombre del perfil de acceso</mat-label>
                <input matInput formControlName="name" />
                @if (isInvalid('name')) {
                  <mat-error>{{ getErrorMessage('name') }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Descripción</mat-label>
                <textarea matInput rows="4" formControlName="description"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="active">Activo</mat-option>
                  <mat-option value="inactive">Inactivo</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Resumen
                </p>
                <dl class="mt-3 space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <dt>Módulos con acceso</dt>
                    <dd class="font-semibold text-slate-900">{{ selectedModulesCount() }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Permisos activos</dt>
                    <dd class="font-semibold text-slate-900">{{ selectedActionsCount() }}</dd>
                  </div>
                </dl>
              </div>

              <div class="flex flex-wrap gap-2">
                <button mat-stroked-button type="button" (click)="setViewBaseline()">
                  Marcar solo lectura
                </button>
                <button mat-stroked-button type="button" (click)="clearPermissions()">
                  Limpiar matriz
                </button>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">Permisos del perfil</h3>
                  <p class="text-sm text-slate-500">
                    Selecciona las acciones permitidas en cada módulo.
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                @for (permissionGroup of permissionArray.controls; track $index; let index = $index) {
                  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                      <div>
                        <h4 class="text-sm font-semibold text-slate-900">{{ moduleName(index) }}</h4>
                      </div>

                      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {{ enabledLabels(index).length }} acciones
                      </span>
                    </div>

                    <div class="grid gap-2 px-4 py-4 md:grid-cols-2">
                      @for (action of actionKeys; track action) {
                        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <mat-checkbox [formControl]="actionControl(index, action)"></mat-checkbox>
                          <span>{{ actionLabels[action] }}</span>
                        </label>
                      }
                    </div>
                  </section>
                }
              </div>
            </section>
          </div>
        </div>

        <footer class="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <button mat-stroked-button type="button" (click)="close()" [disabled]="saving">
            Cancelar
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            {{ saving ? 'Guardando...' : initialValue ? 'Guardar cambios' : 'Crear perfil' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
})
export class ProfileFormPanelComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() initialValue: ProfileDetailVm | null = null;
  @Input() basePermissions: ModulePermissionVm[] = [];
  @Input() activeCompanyName = '';
  @Input() saving = false;

  @Output() saveProfile = new EventEmitter<ProfileFormValue>();
  @Output() closePanel = new EventEmitter<void>();

  readonly actionKeys: PermissionActionKey[] = [
    'view',
    'create',
    'edit',
    'delete',
    'approve',
    'export',
    'manage',
  ];
  readonly actionLabels = SECURITY_PERMISSION_ACTION_LABELS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status: this.fb.nonNullable.control<'active' | 'inactive'>('active'),
    permissions: this.fb.array<FormGroup>([]),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en el perfil. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      );
    });
  }

  get permissionArray(): FormArray<FormGroup> {
    return this.form.controls.permissions;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['basePermissions']) {
      this.resetForm(this.initialValue, this.basePermissions);
    }
  }

  ngOnDestroy(): void {
    this.pendingChangesService.clear();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.pendingChangesService.clear();
    this.saveProfile.emit({
      name: value.name.trim(),
      description: value.description.trim(),
      status: value.status,
      permissions: value.permissions.map((permission) => ({
        moduleKey: permission['moduleKey'] as string,
        moduleName: permission['moduleName'] as string,
        actions: {
          view: !!permission['actions']['view'],
          create: !!permission['actions']['create'],
          edit: !!permission['actions']['edit'],
          delete: !!permission['actions']['delete'],
          approve: !!permission['actions']['approve'],
          export: !!permission['actions']['export'],
          manage: !!permission['actions']['manage'],
        },
      })),
    });
  }

  close(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el perfil. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.closePanel.emit();
  }

  isInvalid(controlName: 'name'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: 'name'): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'El nombre es demasiado corto.';
    }

    return 'Revisa el valor ingresado.';
  }

  moduleName(index: number): string {
    return this.permissionArray.at(index).get('moduleName')?.value as string;
  }

  enabledLabels(index: number): string[] {
    const actions = normalizePermissionActionSet(
      this.permissionArray.at(index).get('actions')?.value as Record<
        PermissionActionKey,
        boolean
      >,
    );

    return getEnabledActionKeys(actions).map((action) => this.actionLabels[action]);
  }

  actionControl(index: number, action: PermissionActionKey): FormControl<boolean> {
    return this.permissionArray.at(index).get(['actions', action]) as FormControl<boolean>;
  }

  selectedModulesCount(): number {
    return this.permissionArray.controls.filter(
      (_, index) => this.enabledLabels(index).length > 0,
    ).length;
  }

  selectedActionsCount(): number {
    return this.permissionArray.controls.reduce(
      (total, _, index) => total + this.enabledLabels(index).length,
      0,
    );
  }

  setViewBaseline(): void {
    this.permissionArray.controls.forEach((permissionGroup) => {
      const actionsGroup = permissionGroup.get('actions') as FormGroup;

      this.actionKeys.forEach((action) => {
        actionsGroup.get(action)?.setValue(action === 'view');
      });
    });
  }

  clearPermissions(): void {
    this.permissionArray.controls.forEach((permissionGroup) => {
      const actionsGroup = permissionGroup.get('actions') as FormGroup;

      this.actionKeys.forEach((action) => {
        actionsGroup.get(action)?.setValue(false);
      });
    });
  }

  private resetForm(
    profile: ProfileDetailVm | null,
    basePermissions: readonly ModulePermissionVm[],
  ): void {
    const permissionsSource = this.buildPermissionsSource(profile, basePermissions);

    this.form.controls.name.setValue(profile?.name ?? '');
    this.form.controls.description.setValue(profile?.description ?? '');
    this.form.controls.status.setValue(profile?.status ?? 'active');

    this.permissionArray.clear();
    permissionsSource.forEach((permission) => {
      this.permissionArray.push(this.buildPermissionGroup(permission));
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.pendingChangesService.clear();
  }

  private buildPermissionsSource(
    profile: ProfileDetailVm | null,
    basePermissions: readonly ModulePermissionVm[],
  ): ModulePermissionVm[] {
    const base = clonePermissionMatrix(basePermissions);

    if (!profile) {
      return base;
    }

    const profilePermissions = clonePermissionMatrix(profile.permissions);
    const merged = base.map((permission) => {
      const profilePermission = profilePermissions.find(
        (candidate) => candidate.moduleKey === permission.moduleKey,
      );

      return profilePermission ?? permission;
    });

    return merged.length ? merged : profilePermissions;
  }

  private buildPermissionGroup(permission: ModulePermissionVm): FormGroup {
    const normalizedActions = normalizePermissionActionSet(permission.actions);
    const actionsGroup = this.fb.group({
      view: this.fb.nonNullable.control(normalizedActions.view),
      create: this.fb.nonNullable.control(normalizedActions.create),
      edit: this.fb.nonNullable.control(normalizedActions.edit),
      delete: this.fb.nonNullable.control(normalizedActions.delete),
      approve: this.fb.nonNullable.control(normalizedActions.approve),
      export: this.fb.nonNullable.control(normalizedActions.export),
      manage: this.fb.nonNullable.control(normalizedActions.manage),
    });

    this.bindManageSelection(actionsGroup);

    return this.fb.group({
      moduleKey: this.fb.nonNullable.control(permission.moduleKey),
      moduleName: this.fb.nonNullable.control(permission.moduleName),
      actions: actionsGroup,
    });
  }

  private bindManageSelection(actionsGroup: FormGroup): void {
    const createControl = actionsGroup.get('create') as FormControl<boolean>;
    const editControl = actionsGroup.get('edit') as FormControl<boolean>;
    const deleteControl = actionsGroup.get('delete') as FormControl<boolean>;
    const manageControl = actionsGroup.get('manage') as FormControl<boolean>;

    merge(
      createControl.valueChanges,
      editControl.valueChanges,
      deleteControl.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const shouldEnableManage =
          !!createControl.value && !!editControl.value && !!deleteControl.value;

        manageControl.setValue(shouldEnableManage, { emitEvent: false });
      });

    manageControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((enabled) => {
      const nextValue = !!enabled;

      createControl.setValue(nextValue, { emitEvent: false });
      editControl.setValue(nextValue, { emitEvent: false });
      deleteControl.setValue(nextValue, { emitEvent: false });
      manageControl.setValue(nextValue, { emitEvent: false });
    });
  }
}