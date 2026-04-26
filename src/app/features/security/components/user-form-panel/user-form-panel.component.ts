import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Company } from '../../../../core/company/models/company.model';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import {
  ProfileRowVm,
  RoleRowVm,
  UserCompanyAssignmentVm,
  UserFormValue,
  UserRowVm,
} from '../../models/security-administration.model';

function assignedCompaniesValidator(control: AbstractControl): ValidationErrors | null {
  const formArray = control as FormArray<FormGroup>;

  if (!formArray.length) {
    return { required: true };
  }

  const selectedCompanies = formArray.controls
    .map((group) => group.get('companyId')?.value as string)
    .filter(Boolean);

  if (new Set(selectedCompanies).size !== selectedCompanies.length) {
    return { duplicateCompany: true };
  }

  return null;
}

@Component({
  selector: 'app-user-form-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" (click)="close()"></div>

    <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1180px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="erp-section-eyebrow">
              Seguridad
            </p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">
              {{ initialValue ? 'Editar usuario' : 'Nuevo usuario' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Completa los datos del usuario y define su acceso por empresa.
            </p>
          </div>

          <button
            mat-icon-button
            type="button"
            aria-label="Cerrar panel"
            (click)="close()"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        @if (activeCompanyName) {
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <mat-icon class="!h-4 !w-4 !text-base">apartment</mat-icon>
            La tabla principal refleja rol y perfil de {{ activeCompanyName }}
          </div>
        }
      </header>

      <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="submit()">
        <div class="flex-1 overflow-auto px-6 py-6">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div class="space-y-6">
              <section class="erp-form-section">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Datos generales
                  </p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Informacion base del usuario</h3>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="firstName" />
                    @if (isInvalid('firstName')) {
                      <mat-error>{{ getErrorMessage('firstName') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Apellido</mat-label>
                    <input matInput formControlName="lastName" />
                    @if (isInvalid('lastName')) {
                      <mat-error>{{ getErrorMessage('lastName') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Cargo</mat-label>
                    <input matInput formControlName="position" />
                    @if (isInvalid('position')) {
                      <mat-error>{{ getErrorMessage('position') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="md:col-span-2">
                    <mat-label>Correo</mat-label>
                    <input matInput type="email" formControlName="email" />
                    @if (isInvalid('email')) {
                      <mat-error>{{ getErrorMessage('email') }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Celular</mat-label>
                    <input matInput formControlName="mobilePhone" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Telefono fijo</mat-label>
                    <input matInput formControlName="landlinePhone" />
                    <mat-hint>Opcional</mat-hint>
                  </mat-form-field>
                </div>
              </section>

              <section class="erp-form-section">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Empresas asignadas
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Acceso por empresa</h3>
                    <p class="mt-1 text-sm text-slate-500">
                      Cada empresa debe tener un rol y un perfil de acceso.
                    </p>
                  </div>

                  <button mat-stroked-button type="button" (click)="addAssignment()">
                    <mat-icon>add</mat-icon>
                    Agregar empresa
                  </button>
                </div>

                <div class="mt-4 space-y-4" formArrayName="assignedCompanies">
                  @for (assignmentGroup of assignmentArray.controls; track $index; let index = $index) {
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4" [formGroupName]="index">
                      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px] xl:items-start">
                        <mat-form-field appearance="outline">
                          <mat-label>Empresa</mat-label>
                          <mat-select formControlName="companyId" (selectionChange)="onAssignmentCompanyChange(index)">
                            @for (company of companies; track company.id) {
                              <mat-option [value]="company.id" [disabled]="isCompanyTaken(company.id, index)">
                                {{ company.name }}
                              </mat-option>
                            }
                          </mat-select>
                          @if (isAssignmentInvalid(index, 'companyId')) {
                            <mat-error>Selecciona una empresa.</mat-error>
                          }
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Rol</mat-label>
                          <mat-select formControlName="roleId">
                            @for (role of rolesFor(index); track role.id) {
                              <mat-option
                                [value]="role.id"
                                [disabled]="role.status === 'inactive' && role.id !== assignmentGroup.get('roleId')?.value"
                              >
                                {{ role.name }}
                              </mat-option>
                            }
                          </mat-select>
                          @if (isAssignmentInvalid(index, 'roleId')) {
                            <mat-error>Selecciona un rol valido para la empresa.</mat-error>
                          }
                        </mat-form-field>

                        <mat-form-field appearance="outline">
                          <mat-label>Perfil de acceso</mat-label>
                          <mat-select formControlName="profileId">
                            @for (profile of profilesFor(index); track profile.id) {
                              <mat-option
                                [value]="profile.id"
                                [disabled]="profile.status === 'inactive' && profile.id !== assignmentGroup.get('profileId')?.value"
                              >
                                {{ profile.name }}
                              </mat-option>
                            }
                          </mat-select>
                          @if (isAssignmentInvalid(index, 'profileId')) {
                            <mat-error>Selecciona un perfil valido para la empresa.</mat-error>
                          }
                        </mat-form-field>

                        <button
                          type="button"
                          class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                          (click)="removeAssignment(index)"
                          [attr.aria-label]="'Quitar empresa ' + (assignmentCompanyName(index) || '')"
                          title="Quitar empresa"
                        >
                          <mat-icon>delete_outline</mat-icon>
                        </button>
                      </div>
                    </div>
                  }

                  @if (assignmentArray.hasError('required') && (assignmentArray.dirty || assignmentArray.touched)) {
                    <p class="text-sm text-rose-600">Debes asignar al menos una empresa para guardar.</p>
                  }

                  @if (assignmentArray.hasError('duplicateCompany') && (assignmentArray.dirty || assignmentArray.touched)) {
                    <p class="text-sm text-rose-600">No puedes repetir una empresa dentro del mismo usuario.</p>
                  }
                </div>
              </section>
            </div>

            <div class="space-y-6">
              <section class="erp-form-section">
                <div class="mb-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Foto
                  </p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Imagen del usuario</h3>
                </div>

                <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div class="flex flex-col items-center gap-4 text-center">
                    <div class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
                      @if (form.controls.photoUrl.value) {
                        <img
                          [src]="form.controls.photoUrl.value"
                          [alt]="(form.controls.firstName.value || 'Usuario') + ' foto'"
                          class="h-full w-full object-cover"
                        />
                      } @else {
                        <div class="flex flex-col items-center gap-2 text-slate-400">
                          <mat-icon class="!h-8 !w-8 !text-3xl">person</mat-icon>
                          <span class="text-xs">Sin foto cargada</span>
                        </div>
                      }
                    </div>

                    <div>
                      <p class="text-sm font-semibold text-slate-800">Preview local</p>
                      <p class="mt-1 text-sm text-slate-500">
                        Puedes cargar, reemplazar o quitar la foto antes de guardar.
                      </p>
                    </div>

                    <div class="flex flex-wrap justify-center gap-2">
                      <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                        <mat-icon class="text-base">upload</mat-icon>
                        {{ form.controls.photoUrl.value ? 'Reemplazar foto' : 'Cargar foto' }}
                        <input type="file" accept="image/*" class="hidden" (change)="onPhotoSelected($event)" />
                      </label>

                      <button mat-stroked-button type="button" (click)="removePhoto()" [disabled]="!form.controls.photoUrl.value">
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section class="erp-form-section">
                <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Estado
                </p>
                <h3 class="mt-2 text-lg font-semibold text-slate-900">Resumen operativo</h3>

                <mat-form-field appearance="outline" class="mt-4 w-full">
                  <mat-label>Estado</mat-label>
                  <mat-select formControlName="status">
                    <mat-option value="active">Activo</mat-option>
                    <mat-option value="inactive">Inactivo</mat-option>
                  </mat-select>
                </mat-form-field>

                <dl class="mt-4 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <dt>Empresas asignadas</dt>
                    <dd class="font-semibold text-slate-900">{{ assignmentArray.length }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Empresa activa</dt>
                    <dd class="text-right font-semibold text-slate-900">{{ activeCompanyName || 'Sin empresa activa' }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Modo</dt>
                    <dd class="font-semibold text-slate-900">Acceso multiempresa</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>

        <footer class="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <button mat-stroked-button type="button" (click)="close()" [disabled]="saving">
            Cancelar
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            {{ saving ? 'Guardando...' : initialValue ? 'Guardar cambios' : 'Crear usuario' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
})
export class UserFormPanelComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() companies: Company[] = [];
  @Input() roleCatalogs: Record<string, RoleRowVm[]> = {};
  @Input() profileCatalogs: Record<string, ProfileRowVm[]> = {};
  @Input() initialValue: UserRowVm | null = null;
  @Input() activeCompanyName = '';
  @Input() saving = false;

  @Output() saveUser = new EventEmitter<UserFormValue>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    position: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    mobilePhone: [''],
    landlinePhone: [''],
    photoUrl: this.fb.control<string | null>(null),
    status: this.fb.nonNullable.control<'active' | 'inactive'>('active'),
    assignedCompanies: this.fb.array<FormGroup>([], { validators: [assignedCompaniesValidator] }),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en el usuario. Si cierras el panel, se descartaran. Deseas continuar?',
      );
    });
  }

  get assignmentArray(): FormArray<FormGroup> {
    return this.form.controls.assignedCompanies;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.resetForm(this.initialValue);
    }
  }

  ngOnDestroy(): void {
    this.pendingChangesService.clear();
  }

  addAssignment(assignment?: UserCompanyAssignmentVm): void {
    this.assignmentArray.push(
      this.fb.group({
        companyId: this.fb.nonNullable.control(assignment?.companyId ?? '', Validators.required),
        roleId: this.fb.nonNullable.control(assignment?.roleId ?? '', Validators.required),
        profileId: this.fb.nonNullable.control(assignment?.profileId ?? '', Validators.required),
      }),
    );
    this.assignmentArray.markAsDirty();
    this.assignmentArray.updateValueAndValidity();
  }

  removeAssignment(index: number): void {
    this.assignmentArray.removeAt(index);
    this.assignmentArray.markAsDirty();
    this.assignmentArray.markAsTouched();
    this.assignmentArray.updateValueAndValidity();
  }

  onAssignmentCompanyChange(index: number): void {
    const group = this.assignmentArray.at(index);
    const roleControl = group.get('roleId');
    const profileControl = group.get('profileId');
    const roleIds = new Set(this.rolesFor(index).map((role) => role.id));
    const profileIds = new Set(this.profilesFor(index).map((profile) => profile.id));

    if (roleControl && !roleIds.has(String(roleControl.value || ''))) {
      roleControl.setValue('');
    }

    if (profileControl && !profileIds.has(String(profileControl.value || ''))) {
      profileControl.setValue('');
    }

    group.markAsDirty();
    group.markAsTouched();
    this.assignmentArray.updateValueAndValidity();
  }

  rolesFor(index: number): RoleRowVm[] {
    const companyId = String(this.assignmentArray.at(index).get('companyId')?.value ?? '');
    return this.roleCatalogs[companyId] ?? [];
  }

  profilesFor(index: number): ProfileRowVm[] {
    const companyId = String(this.assignmentArray.at(index).get('companyId')?.value ?? '');
    return this.profileCatalogs[companyId] ?? [];
  }

  isCompanyTaken(companyId: string, currentIndex: number): boolean {
    return this.assignmentArray.controls.some(
      (group, index) => index !== currentIndex && group.get('companyId')?.value === companyId,
    );
  }

  assignmentCompanyName(index: number): string {
    const companyId = String(this.assignmentArray.at(index).get('companyId')?.value ?? '');
    return this.companies.find((company) => company.id === companyId)?.name ?? '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.form.controls.photoUrl.setValue(reader.result as string);
      this.form.controls.photoUrl.markAsDirty();
    };

    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.form.controls.photoUrl.setValue(null);
    this.form.controls.photoUrl.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.assignmentArray.controls.forEach((group) => group.markAllAsTouched());
      this.assignmentArray.markAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.pendingChangesService.clear();
    this.saveUser.emit({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      position: value.position.trim(),
      email: value.email.trim(),
      mobilePhone: value.mobilePhone.trim(),
      landlinePhone: value.landlinePhone.trim(),
      photoUrl: value.photoUrl,
      assignedCompanies: value.assignedCompanies.map((assignment) => ({
        companyId: assignment['companyId'] as string,
        roleId: assignment['roleId'] as string,
        profileId: assignment['profileId'] as string,
      })),
      status: value.status,
    });
  }

  close(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el usuario. Si cierras el panel, se descartaran. Deseas continuar?',
      )
    ) {
      return;
    }

    this.closePanel.emit();
  }

  isInvalid(controlName: 'firstName' | 'lastName' | 'position' | 'email'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  isAssignmentInvalid(index: number, controlName: 'companyId' | 'roleId' | 'profileId'): boolean {
    const control = this.assignmentArray.at(index).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: 'firstName' | 'lastName' | 'position' | 'email'): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo valido.';
    }

    if (control.hasError('minlength')) {
      return 'El valor es demasiado corto.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(user: UserRowVm | null): void {
    this.form.reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      position: user?.position ?? '',
      email: user?.email ?? '',
      mobilePhone: user?.mobilePhone ?? '',
      landlinePhone: user?.landlinePhone ?? '',
      photoUrl: user?.photoUrl ?? null,
      status: user?.status ?? 'active',
    });

    this.assignmentArray.clear();

    if (user?.assignedCompanies.length) {
      user.assignedCompanies.forEach((assignment) => this.addAssignment(assignment));
    } else {
      this.addAssignment();
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.assignmentArray.markAsPristine();
    this.assignmentArray.markAsUntouched();
    this.pendingChangesService.clear();
  }
}
