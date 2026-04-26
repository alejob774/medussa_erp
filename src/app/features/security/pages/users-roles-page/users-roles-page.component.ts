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
import { forkJoin } from 'rxjs';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { Company } from '../../../../core/company/models/company.model';
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
      <header class="erp-page-header">
        <div class="flex flex-wrap items-start gap-4">
          <div class="flex items-start gap-4">
            <div class="erp-page-icon">
              <mat-icon>manage_accounts</mat-icon>
            </div>

            <div>
              <p class="erp-page-eyebrow">Configuración</p>
              <h1 class="erp-page-title">Usuarios y roles</h1>
              <p class="erp-page-description max-w-3xl">
                Administra usuarios del sistema y su acceso por empresa.
              </p>
            </div>
          </div>
        </div>
      </header>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">
          {{ errorMessage }}
        </div>
      }

      @if (successMessage) {
        <div class="erp-alert erp-alert--success">
          {{ successMessage }}
        </div>
      }

      <section class="erp-filter-panel">
        <form class="space-y-4" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <mat-form-field appearance="outline" class="min-w-[280px] flex-1">
              <mat-label>Buscar usuarios</mat-label>
              <input matInput formControlName="search" placeholder="Nombre, correo, cargo o empresa asignada" />
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

        <div class="erp-table-shell mt-6">
          @if (loadingUsers) {
            <div class="erp-empty-state">
              <div class="flex flex-col items-center gap-3 text-slate-500">
                <mat-spinner diameter="34"></mat-spinner>
                <p class="text-sm">Cargando usuarios...</p>
              </div>
            </div>
          } @else if (!users.length) {
            <div class="erp-empty-state">
              <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">group_off</mat-icon>
              <div>
                <p class="text-base font-semibold text-slate-700">No hay usuarios para este criterio.</p>
                <p class="mt-1 text-sm">Ajusta los filtros o registra el primer usuario multiempresa.</p>
              </div>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="erp-data-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th class="px-4 py-4">Nombre del usuario</th>
                    <th class="px-4 py-4">Correo</th>
                    <th class="px-4 py-4">Rol en empresa activa</th>
                    <th class="px-4 py-4">Perfil de acceso en empresa activa</th>
                    <th class="px-4 py-4">Empresas asignadas</th>
                    <th class="px-4 py-4">Estado</th>
                    <th class="w-[176px] px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users; track user.userId) {
                    <tr>
                      <td class="px-4 py-4">
                        <div class="flex items-center gap-3">
                          <div class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-600">
                            @if (user.photoUrl) {
                              <img [src]="user.photoUrl" [alt]="user.name" class="h-full w-full object-cover" />
                            } @else {
                              <mat-icon>person</mat-icon>
                            }
                          </div>

                          <div>
                            <div class="font-semibold text-slate-900">{{ user.name }}</div>
                            <div class="text-xs text-slate-500">{{ user.position }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4 text-slate-600">{{ user.email }}</td>
                      <td class="px-4 py-4">
                        <span
                          class="erp-chip"
                          [class.erp-chip--neutral]="!user.roleName"
                          [class.erp-chip--strong]="!!user.roleName"
                        >
                          {{ user.roleName || 'Sin asignacion' }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="erp-chip"
                          [class.erp-chip--neutral]="!user.profileName"
                          [class.erp-chip--info]="!!user.profileName"
                        >
                          {{ user.profileName || 'Sin asignacion' }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex min-w-[220px] max-w-[280px] flex-wrap gap-2">
                          @for (assignment of visibleAssignedCompanies(user); track assignment.companyId) {
                            <span class="erp-chip erp-chip--neutral">
                              {{ assignment.companyName }}
                            </span>
                          }

                          @if (remainingAssignedCompanies(user) > 0) {
                            <span class="erp-chip erp-chip--strong">
                              +{{ remainingAssignedCompanies(user) }}
                            </span>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="erp-chip"
                          [class.erp-chip--success]="user.status === 'active'"
                          [class.erp-chip--warning]="user.status === 'inactive'"
                        >
                          {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="w-[176px] px-4 py-4">
                        <div class="grid grid-cols-[36px_120px] items-center justify-end gap-2">
                          <button
                            type="button"
                            class="erp-icon-button"
                            (click)="editUser(user)"
                            [attr.aria-label]="'Editar ' + user.name"
                            title="Editar"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>

                          <button
                            type="button"
                            class="erp-row-action"
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
        <section class="erp-panel">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Roles</p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-900">Catalogo de roles</h2>
              <p class="mt-2 max-w-3xl text-sm text-slate-500">
                Gestiona los roles de {{ activeCompany?.name ?? 'la empresa activa' }} sin seleccionar empresa manualmente.
              </p>
            </div>

            <button mat-flat-button color="primary" type="button" class="min-h-12" (click)="openNewRole()">
              Nuevo Rol
            </button>
          </div>

          <div class="erp-table-shell mt-6">
            @if (loadingRoles) {
              <div class="erp-empty-state min-h-[220px]">
                <div class="flex flex-col items-center gap-3 text-slate-500">
                  <mat-spinner diameter="32"></mat-spinner>
                  <p class="text-sm">Cargando roles...</p>
                </div>
              </div>
            } @else if (!roles.length) {
              <div class="erp-empty-state min-h-[220px]">
                <mat-icon class="erp-empty-state__icon !h-10 !w-10 !text-4xl">shield_person</mat-icon>
                <p class="text-base font-semibold text-slate-700">No hay roles configurados para la empresa activa.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="erp-data-table min-w-full text-sm">
                  <thead>
                    <tr>
                      <th class="px-4 py-4">Rol</th>
                      <th class="px-4 py-4">Descripcion</th>
                      <th class="px-4 py-4">Estado</th>
                      <th class="w-[176px] px-4 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (role of roles; track role.id) {
                      <tr>
                        <td class="px-4 py-4 font-semibold text-slate-900">{{ role.name }}</td>
                        <td class="px-4 py-4 text-slate-600">{{ role.description || 'Sin descripcion' }}</td>
                        <td class="px-4 py-4">
                          <span
                            class="erp-chip"
                            [class.erp-chip--success]="role.status === 'active'"
                            [class.erp-chip--warning]="role.status === 'inactive'"
                          >
                            {{ role.status === 'active' ? 'Activo' : 'Inactivo' }}
                          </span>
                        </td>
                        <td class="w-[176px] px-4 py-4">
                          <div class="grid grid-cols-[36px_120px] items-center justify-end gap-2">
                            <button
                              type="button"
                              class="erp-icon-button"
                              (click)="editRole(role)"
                              [attr.aria-label]="'Editar ' + role.name"
                              title="Editar"
                            >
                              <mat-icon>edit</mat-icon>
                            </button>

                            <button
                              type="button"
                              class="erp-row-action"
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

      <footer class="erp-action-bar">
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
          [companies]="availableCompanies"
          [roleCatalogs]="roleCatalogsByCompany"
          [profileCatalogs]="profileCatalogsByCompany"
          [initialValue]="selectedUser"
          [activeCompanyName]="activeCompanyName"
          [saving]="savingUser"
          (saveUser)="saveUser($event)"
          (closePanel)="closeUserPanel()"
        ></app-user-form-panel>
      }

      @if (rolePanelOpen) {
        <app-role-form-panel
          [initialValue]="selectedRole"
          [activeCompanyName]="activeCompanyName"
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
  readonly companies$ = this.securityFacade.companies$;
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>('all'),
  });

  users: UserRowVm[] = [];
  roles: RoleRowVm[] = [];
  profiles: ProfileRowVm[] = [];
  availableCompanies: Company[] = [];
  activeCompany: Company | null = null;
  roleCatalogsByCompany: Record<string, RoleRowVm[]> = {};
  profileCatalogsByCompany: Record<string, ProfileRowVm[]> = {};
  activeCompanyName = '';
  loadingUsers = true;
  loadingRoles = true;
  loadingProfilesCatalog = true;
  loadingAssignmentCatalogs = false;
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
    this.companies$.pipe(takeUntilDestroyed()).subscribe((companies) => {
      this.availableCompanies = companies;

      if (companies.length) {
        this.loadAssignmentCatalogs(false);
      }
    });

    this.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company?.id) {
          return;
        }

        this.activeCompany = company;
        this.activeCompanyName = company.name;
        this.closePanels(true);
        this.loadUsers();
        this.loadRoles();
        this.loadProfilesCatalog();

        if (this.availableCompanies.length) {
          this.loadAssignmentCatalogs(false);
        }
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

    this.ensureUserCatalogsReady(() => {
      this.userPanelOpen = true;
    });
  }

  editUser(user: UserRowVm): void {
    this.rolePanelOpen = false;
    this.selectedRole = null;
    this.selectedUser = user;

    this.ensureUserCatalogsReady(() => {
      this.userPanelOpen = true;
    });
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
      .saveUser(payload, this.selectedUser?.userId)
      .pipe(finalize(() => (this.savingUser = false)))
      .subscribe({
        next: () => {
          this.successMessage = this.selectedUser
            ? 'El usuario se actualizo localmente sobre el overlay de seguridad.'
            : 'El usuario se creo correctamente.';
          this.closeUserPanel();
          this.loadUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  toggleUserStatus(user: UserRowVm): void {
    const nextStatus: SecurityRecordStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionLabel = this.confirmActionLabel(user.status);

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Deseas ${actionLabel} al usuario ${user.name}? Esta accion es reversible.`)
    ) {
      return;
    }

    this.loadingUsers = true;
    this.securityFacade
      .updateUserStatus(user.userId, nextStatus)
      .pipe(finalize(() => (this.loadingUsers = false)))
      .subscribe({
        next: () => {
          this.successMessage =
            `El usuario ${user.name} fue ${this.successStatusLabel(nextStatus)} localmente.`;
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
            ? 'El rol se actualizo correctamente.'
            : 'El rol se creo correctamente.';
          this.closeRolePanel();
          this.showRolesSection = true;
          this.loadRoles();
          this.loadUsers(false);
          this.loadAssignmentCatalogs(false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  toggleRoleStatus(role: RoleRowVm): void {
    const nextStatus: SecurityRecordStatus = role.status === 'active' ? 'inactive' : 'active';
    const actionLabel = this.confirmActionLabel(role.status);

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Deseas ${actionLabel} el rol ${role.name}? Esta accion es reversible.`)
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
          this.loadAssignmentCatalogs(false);
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
        'Hay cambios sin guardar. Si cancelas, se cerraran las ediciones abiertas. Deseas continuar?',
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
    this.loadAssignmentCatalogs(false);
  }

  canAcceptPageState(): boolean {
    return !!this.successMessage || !!this.errorMessage || this.userPanelOpen || this.rolePanelOpen;
  }

  rowActionLabel(status: SecurityRecordStatus): string {
    return status === 'active' ? 'Inactivar' : 'Activar';
  }

  visibleAssignedCompanies(user: UserRowVm): Array<{ companyId: string; companyName: string }> {
    return user.assignedCompanies.slice(0, 2).map((assignment) => ({
      companyId: assignment.companyId,
      companyName: assignment.companyName,
    }));
  }

  remainingAssignedCompanies(user: UserRowVm): number {
    return Math.max(user.assignedCompanies.length - 2, 0);
  }

  private ensureUserCatalogsReady(onReady: () => void): void {
    if (!this.availableCompanies.length) {
      this.errorMessage = 'No hay empresas disponibles para asignar al usuario.';
      return;
    }

    if (
      Object.keys(this.roleCatalogsByCompany).length === this.availableCompanies.length &&
      Object.keys(this.profileCatalogsByCompany).length === this.availableCompanies.length
    ) {
      onReady();
      return;
    }

    this.loadAssignmentCatalogs(true, onReady);
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

  private loadAssignmentCatalogs(showLoader: boolean = true, onLoaded?: () => void): void {
    if (!this.availableCompanies.length) {
      return;
    }

    if (showLoader) {
      this.loadingAssignmentCatalogs = true;
    }

    const companyIds = this.availableCompanies.map((company) => company.id);

    forkJoin({
      roles: this.securityFacade.listRoleCatalogs(companyIds),
      profiles: this.securityFacade.listProfileCatalogs(companyIds),
    })
      .pipe(finalize(() => (this.loadingAssignmentCatalogs = false)))
      .subscribe({
        next: ({ roles, profiles }) => {
          this.roleCatalogsByCompany = roles;
          this.profileCatalogsByCompany = profiles;
          onLoaded?.();
        },
        error: (error: unknown) => {
          this.roleCatalogsByCompany = {};
          this.profileCatalogsByCompany = {};
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
      'No fue posible completar la operacion de usuarios y roles.'
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
