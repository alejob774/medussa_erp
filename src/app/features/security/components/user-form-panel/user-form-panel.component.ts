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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import {
  ProfileRowVm,
  RoleRowVm,
  UserFormValue,
  UserRowVm,
} from '../../models/security-administration.model';

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

    <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              Seguridad
            </p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">
              {{ initialValue ? 'Editar usuario' : 'Nuevo usuario' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Completa los datos del usuario y define su acceso.
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
      </header>

      <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="submit()">
        <div class="flex-1 space-y-5 overflow-auto px-6 py-6">
          <div class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <p class="font-semibold text-slate-900">Rol</p>
              <p class="mt-1">Cargo o categoría del usuario.</p>
            </div>
            <div>
              <p class="font-semibold text-slate-900">Perfil de acceso</p>
              <p class="mt-1">Conjunto de permisos asignados.</p>
            </div>
          </div>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre del usuario</mat-label>
            <input matInput formControlName="name" />
            @if (isInvalid('name')) {
              <mat-error>{{ getErrorMessage('name') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
            @if (isInvalid('email')) {
              <mat-error>{{ getErrorMessage('email') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="roleId">
              <mat-option [value]="null">Sin rol asignado</mat-option>
              @for (role of roles; track role.id) {
                <mat-option
                  [value]="role.id"
                  [disabled]="role.status === 'inactive' && role.id !== form.controls.roleId.value"
                >
                  {{ role.name }}
                  @if (role.scope === 'global') {
                    <span class="text-slate-400"> · Global</span>
                  }
                </mat-option>
              }
            </mat-select>
            <mat-hint>Cargo o categoría del usuario.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Perfil de acceso</mat-label>
            <mat-select formControlName="profileId">
              <mat-option [value]="null">Sin asignar</mat-option>
              @for (profile of profiles; track profile.id) {
                <mat-option
                  [value]="profile.id"
                  [disabled]="profile.status === 'inactive' && profile.id !== form.controls.profileId.value"
                >
                  {{ profile.name }}
                </mat-option>
              }
            </mat-select>
            <mat-hint>Define los permisos disponibles para el usuario.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Activo</mat-option>
              <mat-option value="inactive">Inactivo</mat-option>
            </mat-select>
          </mat-form-field>
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

  @Input() roles: RoleRowVm[] = [];
  @Input() profiles: ProfileRowVm[] = [];
  @Input() initialValue: UserRowVm | null = null;
  @Input() activeCompanyName = '';
  @Input() saving = false;

  @Output() saveUser = new EventEmitter<UserFormValue>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    roleId: this.fb.control<string | null>(null),
    profileId: this.fb.control<string | null>(null),
    status: this.fb.nonNullable.control<'active' | 'inactive'>('active'),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en el usuario. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      );
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.resetForm(this.initialValue);
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
    this.saveUser.emit({
      name: value.name.trim(),
      email: value.email.trim(),
      roleId: value.roleId,
      profileId: value.profileId,
      status: value.status,
    });
  }

  close(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el usuario. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.closePanel.emit();
  }

  isInvalid(controlName: 'name' | 'email'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: 'name' | 'email'): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('minlength')) {
      return 'El nombre es demasiado corto.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(user: UserRowVm | null): void {
    this.form.reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      roleId: user?.roleId ?? null,
      profileId: user?.profileId ?? null,
      status: user?.status ?? 'active',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.pendingChangesService.clear();
  }
}