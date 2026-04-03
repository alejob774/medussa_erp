import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import { RoleFormPanelComponent } from '../../components/role-form-panel/role-form-panel.component';
import { UserFormPanelComponent } from '../../components/user-form-panel/user-form-panel.component';
import {
  ProfileRowVm,
  RoleFormValue,
  RoleRowVm,
  SecurityListFilters,
  SecurityRecordStatus,
  UserFormValue,
  UserRowVm,
} from '../../models/security-administration.model';
import { SecurityAdministrationFacadeService } from '../../services/security-administration.facade';

@Component({
  selector: 'app-users-roles-page',
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
    UserFormPanelComponent,
    RoleFormPanelComponent,
  ],
  template: `
    <section class="space-y-6">
      <header class="rounded-3xl bg-white p-6 shadow-sm">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <mat-icon>manage_accounts</mat-icon>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              Seguridad
            </p>
            <h1 class="mt-2 text-3xl font-bold text-slate-900">Gestión de Usuarios y Roles</h1>
            <p class="mt-2 max-w-3xl text-sm text-slate-500">
              Administra usuarios, roles y perfiles de acceso.
            </p>
          </div>
        </div>
      </header>

      @if (errorMessage) {
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>
      }

      @if (successMessage) {
        <div class="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {{ successMessage }}
        </div>
      }

      <section class="rounded-3xl bg-white p-6 shadow-sm">
        <form class="space-y-4" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <mat-form-field appearance="outline" class="min-w-[280px] flex-1">
              <mat-label>Buscar usuarios</mat-label>
              <input matInput formControlName="search" placeholder="Nombre, correo, rol o perfil de acceso" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <button mat-flat-button color="primary" type="button" class="min-h-12" (click)="openNewUser()">
              Nuevo Usuario
            </button>

            <button mat-stroked-button type="button" class="min-h-12" (click)="toggleRolesSection()">
              {{ showRolesSection ? 'Ocultar Roles' : 'Gestionar Roles' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <mat-form-field appearance="outline" class="w-full max-w-xs">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="status">
                <mat-option value="all">Todos</mat-option>
                <mat-option value="active">Activos</mat-option>
                <mat-option value="inactive">Inactivos</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-stroked-button type="submit" class="min-h-12">Filtrar</button>
          </div>
        </form>

        <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          @if (loadingUsers) {
            <div class="flex min-h-[280px] items-center justify-center bg-slate-50">
              <div class="flex flex-col items-center gap-3 text-slate-500">
                <mat-spinner diameter="34"></mat-spinner>
                <p class="text-sm">Cargando usuarios...</p>
              </div>
            </div>
          } @else if (!users.length) {
            <div class="flex min-h-[280px] flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-slate-500">
              <mat-icon class="!h-10 !w-10 !text-4xl text-slate-300">group_off</mat-icon>
              <div>
                <p class="text-base font-semibold text-slate-700">No hay usuarios para este criterio.</p>
                <p class="mt-1 text-sm">Prueba otro filtro o crea el primer usuario de la empresa activa.</p>
              </div>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th class="px-4 py-4">Nombre del Usuario</th>
                    <th class="px-4 py-4">Correo</th>
                    <th class="px-4 py-4">Rol</th>
                    <th class="px-4 py-4">Perfil de acceso</th>
                    <th class="px-4 py-4">Estado</th>
                    <th class="w-[176px] px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (user of users; track user.assignmentId) {
                    <tr class="hover:bg-slate-50/70">
                      <td class="px-4 py-4 font-semibold text-slate-900">{{ user.name }}</td>
                      <td class="px-4 py-4 text-slate-600">{{ user.email }}</td>
                      <td class="px-4 py-4">
                        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {{ user.roleName || 'Sin rol asignado' }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="rounded-full px-3 py-1 text-xs font-semibold"
                          [class.bg-slate-100]="!user.profileName"
                          [class.text-slate-500]="!user.profileName"
                          [class.bg-teal-50]="!!user.profileName"
                          [class.text-teal-700]="!!user.profileName"
                        >
                          {{ user.profileName || 'Sin asignar' }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="rounded-full px-3 py-1 text-xs font-semibold"
                          [class.bg-emerald-100]="user.status === 'active'"
                          [class.text-emerald-700]="user.status === 'active'"
                          [class.bg-slate-200]="user.status === 'inactive'"
                          [class.text-slate-600]="user.status === 'inactive'"
                        >
                          {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="w-[176px] px-4 py-4">
                        <div class="grid grid-cols-[36px_120px] items-center justify-end gap-2">
                          <button
                            type="button"
                            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                            (click)="editUser(user)"
                            [attr.aria-label]="'Editar ' + user.name"
                            title="Editar"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>

                          <button
                            type="button"
                            class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                            [class.border-amber-200]="user.status === 'active'"
                            [class.text-amber-700]="user.status === 'active'"
                            [class.bg-amber-50]="user.status === 'active'"
                            [class.border-emerald-200]="user.status === 'inactive'"
                            [class.text-emerald-700]="user.status === 'inactive'"
                            [class.bg-emerald-50]="user.status === 'inactive'"
                            (click)="toggleUserStatus(user)"
                            [attr.aria-label]="rowActionLabel(user.status) + ' usuario'"
                            [title]="rowActionLabel(user.status)"
                          >
                            <mat-icon class="text-base">{{ user.status === 'active' ? 'person_off' : 'published_with_changes' }}</mat-icon>
                            <span>{{ rowActionLabel(user.status) }}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>

      @if (showRolesSection) {
        <section class="rounded-3xl bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Roles</p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-900">Catálogo de roles</h2>
              <p class="mt-2 max-w-3xl text-sm text-slate-500">
                Define los roles disponibles para clasificar a los usuarios.
              </p>
            </div>

            <button mat-flat-button color="primary" type="button" class="min-h-12" (click)="openNewRole()">
              Nuevo Rol
            </button>
          </div>

          <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            @if (loadingRoles) {
              <div class="flex min-h-[220px] items-center justify-center bg-slate-50">
                <div class="flex flex-col items-center gap-3 text-slate-500">
                  <mat-spinner diameter="32"></mat-spinner>
                  <p class="text-sm">Cargando roles...</p>
                </div>
              </div>
            } @else if (!roles.length) {
              <div class="flex min-h-[220px] flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-slate-500">
                <mat-icon class="!h-10 !w-10 !text-4xl text-slate-300">shield_person</mat-icon>
                <p class="text-base font-semibold text-slate-700">No hay roles configurados todavía.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200 text-sm">
                  <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th class="px-4 py-4">Rol</th>
                      <th class="px-4 py-4">Descripción</th>
                      <th class="px-4 py-4">Alcance</th>
                      <th class="px-4 py-4">Estado</th>
                      <th class="w-[176px] px-4 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    @for (role of roles; track role.id) {
                      <tr class="hover:bg-slate-50/70">
                        <td class="px-4 py-4 font-semibold text-slate-900">{{ role.name }}</td>
                        <td class="px-4 py-4 text-slate-600">{{ role.description || 'Sin descripción' }}</td>
                        <td class="px-4 py-4">
                          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {{ role.scope === 'global' ? 'Global' : 'Empresa' }}
                          </span>
                        </td>
                        <td class="px-4 py-4">
                          <span
                            class="rounded-full px-3 py-1 text-xs font-semibold"
                            [class.bg-emerald-100]="role.status === 'active'"
                            [class.text-emerald-700]="role.status === 'active'"
                            [class.bg-slate-200]="role.status === 'inactive'"
                            [class.text-slate-600]="role.status === 'inactive'"
                          >
                            {{ role.status === 'active' ? 'Activo' : 'Inactivo' }}
                          </span>
                        </td>
                        <td class="w-[176px] px-4 py-4">
                          <div class="grid grid-cols-[36px_120px] items-center justify-end gap-2">
                            <button
                              type="button"
                              class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                              (click)="editRole(role)"
                              [attr.aria-label]="'Editar ' + role.name"
                              title="Editar"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>

                            <button
                              type="button"
                              class="inline-flex min-h-9 w-[120px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-100"
                              [class.border-amber-200]="role.status === 'active'"
                              [class.text-amber-700]="role.status === 'active'"
                              [class.bg-amber-50]="role.status === 'active'"
                              [class.border-emerald-200]="role.status === 'inactive'"
                              [class.text-emerald-700]="role.status === 'inactive'"
                              [class.bg-emerald-50]="role.status === 'inactive'"
                              (click)="toggleRoleStatus(role)"
                              [attr.aria-label]="rowActionLabel(role.status) + ' rol'"
                              [title]="rowActionLabel(role.status)"
                            >
                              <mat-icon class="text-base">{{ role.status === 'active' ? 'toggle_off' : 'toggle_on' }}</mat-icon>
                              <span>{{ rowActionLabel(role.status) }}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>
      }

      <footer class="flex items-center justify-end gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <button mat-flat-button color="primary" type="button" (click)="acceptPageState()" [disabled]="!canAcceptPageState()">
            Aceptar
          </button>
          <button mat-stroked-button type="button" (click)="cancelPageState()">
            Cancelar
          </button>
        </div>
      </footer>

      @if (userPanelOpen) {
        <app-user-form-panel
          [roles]="roles"
          [profiles]="profiles"
          [initialValue]="selectedUser"
          [activeCompanyName]="''"
          [saving]="savingUser"
          (saveUser)="saveUser($event)"
          (closePanel)="closeUserPanel()"
        ></app-user-form-panel>
      }

      @if (rolePanelOpen) {
        <app-role-form-panel
          [initialValue]="selectedRole"
          [activeCompanyName]="''"
          [saving]="savingRole"
          (saveRole)="saveRole($event)"
          (closePanel)="closeRolePanel()"
        ></app-role-form-panel>
      }
    </section>
  `,
})
export class UsersRolesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly securityFacade = inject(SecurityAdministrationFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  readonly activeCompany$ = this.securityFacade.activeCompany$;
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>('all'),
  });

  users: UserRowVm[] = [];
  roles: RoleRowVm[] = [];
  profiles: ProfileRowVm[] = [];
  loadingUsers = true;
  loadingRoles = true;
  loadingProfilesCatalog = true;
  savingUser = false;
  savingRole = false;
  errorMessage = '';
  successMessage = '';
  showRolesSection = false;
  userPanelOpen = false;
  rolePanelOpen = false;
  selectedUser: UserRowVm | null = null;
  selectedRole: RoleRowVm | null = null;

  constructor() {
    this.activeCompany$
      .pipe(
        map((company) => company?.id ?? null),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((companyId) => {
        if (!companyId) {
          return;
        }

        this.closePanels(true);
        this.loadUsers();
        this.loadRoles();
        this.loadProfilesCatalog();
      });
  }

  applyFilters(): void {
    this.loadUsers();
  }

  toggleRolesSection(): void {
    this.showRolesSection = !this.showRolesSection;

    if (this.showRolesSection && !this.roles.length) {
      this.loadRoles();
    }
  }

  openNewUser(): void {
    this.rolePanelOpen = false;
    this.selectedRole = null;
    this.selectedUser = null;
    if (!this.roles.length) {
      this.loadRoles();
    }
    if (!this.profiles.length) {
      this.loadProfilesCatalog();
    }
    this.userPanelOpen = true;
  }

  editUser(user: UserRowVm): void {
    this.rolePanelOpen = false;
    this.selectedRole = null;
    this.selectedUser = user;
    if (!this.roles.length) {
      this.loadRoles();
    }
    if (!this.profiles.length) {
      this.loadProfilesCatalog();
    }
    this.userPanelOpen = true;
  }

  closeUserPanel(): void {
    this.userPanelOpen = false;
    this.selectedUser = null;
    this.pendingChangesService.clear();
  }

  saveUser(payload: UserFormValue): void {
    this.savingUser = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.securityFacade
      .saveUser(payload, this.selectedUser?.assignmentId)
      .pipe(finalize(() => (this.savingUser = false)))
      .subscribe({
        next: () => {
          this.successMessage = this.selectedUser
            ? 'El usuario se actualizó correctamente.'
            : 'El usuario se creó correctamente.';
          this.closeUserPanel();
          this.loadUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  toggleUserStatus(user: UserRowVm): void {
    const nextStatus: SecurityRecordStatus =
      user.status === 'active' ? 'inactive' : 'active';
    const actionLabel = this.confirmActionLabel(user.status);

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Deseas ${actionLabel} al usuario ${user.name}? Esta acción es reversible.`)
    ) {
      return;
    }

    this.loadingUsers = true;
    this.securityFacade
      .updateUserStatus(user.assignmentId, nextStatus)
      .pipe(finalize(() => (this.loadingUsers = false)))
      .subscribe({
        next: () => {
          this.successMessage = `El usuario ${user.name} fue ${this.successStatusLabel(nextStatus)}.`;
          this.loadUsers(false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  openNewRole(): void {
    this.userPanelOpen = false;
    this.selectedUser = null;
    this.selectedRole = null;
    this.rolePanelOpen = true;
  }

  editRole(role: RoleRowVm): void {
    this.userPanelOpen = false;
    this.selectedUser = null;
    this.selectedRole = role;
    this.rolePanelOpen = true;
  }

  closeRolePanel(): void {
    this.rolePanelOpen = false;
    this.selectedRole = null;
    this.pendingChangesService.clear();
  }

  saveRole(payload: RoleFormValue): void {
    this.savingRole = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.securityFacade
      .saveRole(payload, this.selectedRole?.id)
      .pipe(finalize(() => (this.savingRole = false)))
      .subscribe({
        next: (role) => {
          this.roles = this.upsertRole(role);
          this.successMessage = this.selectedRole
            ? 'El rol se actualizó correctamente.'
            : 'El rol se creó correctamente.';
          this.closeRolePanel();
          this.showRolesSection = true;
          this.loadRoles();
          this.loadUsers(false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  toggleRoleStatus(role: RoleRowVm): void {
    const nextStatus: SecurityRecordStatus =
      role.status === 'active' ? 'inactive' : 'active';
    const actionLabel = this.confirmActionLabel(role.status);

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Deseas ${actionLabel} el rol ${role.name}? Esta acción es reversible.`)
    ) {
      return;
    }

    this.loadingRoles = true;
    this.securityFacade
      .updateRoleStatus(role.id, nextStatus)
      .pipe(finalize(() => (this.loadingRoles = false)))
      .subscribe({
        next: (updatedRole) => {
          this.roles = this.upsertRole(updatedRole);
          this.successMessage = `El rol ${role.name} fue ${this.successStatusLabel(nextStatus)}.`;
          this.loadRoles(false);
          this.loadUsers(false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  acceptPageState(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.userPanelOpen) {
      this.closeUserPanel();
    }

    if (this.rolePanelOpen) {
      this.closeRolePanel();
    }
  }

  cancelPageState(): void {
    if (
      (this.userPanelOpen || this.rolePanelOpen) &&
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar. Si cancelas, se cerrarán las ediciones abiertas. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.filterForm.reset({
      search: '',
      status: 'all',
    });
    this.successMessage = '';
    this.errorMessage = '';
    this.closePanels(true);
    this.loadUsers();
    if (this.showRolesSection) {
      this.loadRoles();
    }
    this.loadProfilesCatalog(false);
  }

  canAcceptPageState(): boolean {
    return !!this.successMessage || !!this.errorMessage || this.userPanelOpen || this.rolePanelOpen;
  }

  rowActionLabel(status: SecurityRecordStatus): string {
    return status === 'active' ? 'Inactivar' : 'Activar';
  }

  private loadUsers(showLoader: boolean = true): void {
    if (showLoader) {
      this.loadingUsers = true;
    }

    this.securityFacade
      .listUsers(this.buildFilters())
      .pipe(finalize(() => (this.loadingUsers = false)))
      .subscribe({
        next: (users) => {
          this.users = users;
        },
        error: (error: unknown) => {
          this.users = [];
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private loadRoles(showLoader: boolean = true): void {
    if (showLoader) {
      this.loadingRoles = true;
    }

    this.securityFacade
      .listRoles()
      .pipe(finalize(() => (this.loadingRoles = false)))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
        },
        error: (error: unknown) => {
          this.roles = [];
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private loadProfilesCatalog(showLoader: boolean = true): void {
    if (showLoader) {
      this.loadingProfilesCatalog = true;
    }

    this.securityFacade
      .listProfiles({
        search: '',
        status: 'all',
      })
      .pipe(finalize(() => (this.loadingProfilesCatalog = false)))
      .subscribe({
        next: (profiles) => {
          this.profiles = profiles;
        },
        error: (error: unknown) => {
          this.profiles = [];
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private buildFilters(): SecurityListFilters {
    const value = this.filterForm.getRawValue();

    return {
      search: value.search.trim(),
      status: value.status,
    };
  }

  private closePanels(force: boolean = false): void {
    if (!force && !this.pendingChangesService.confirmDiscard()) {
      return;
    }

    this.userPanelOpen = false;
    this.rolePanelOpen = false;
    this.selectedUser = null;
    this.selectedRole = null;
    this.pendingChangesService.clear();
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as { error?: { detail?: string }; message?: string };

    return (
      httpError?.error?.detail ??
      httpError?.message ??
      'No fue posible completar la operación de usuarios y roles.'
    );
  }

  private confirmActionLabel(status: SecurityRecordStatus): string {
    return status === 'active' ? 'inactivar' : 'activar';
  }

  private successStatusLabel(status: SecurityRecordStatus): string {
    return status === 'active' ? 'activado' : 'inactivado';
  }

  private upsertRole(role: RoleRowVm): RoleRowVm[] {
    const nextRoles = this.roles.some((currentRole) => currentRole.id === role.id)
      ? this.roles.map((currentRole) => (currentRole.id === role.id ? role : currentRole))
      : [...this.roles, role];

    return nextRoles.sort((left, right) => left.name.localeCompare(right.name));
  }
}