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
import { ProfileFormPanelComponent } from '../../components/profile-form-panel/profile-form-panel.component';
import {
  ModulePermissionVm,
  ProfileDetailVm,
  ProfileFormValue,
  ProfileRowVm,
  SecurityListFilters,
  SecurityRecordStatus,
} from '../../models/security-administration.model';
import { SecurityAdministrationFacadeService } from '../../services/security-administration.facade';

@Component({
  selector: 'app-profiles-permissions-page',
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
    ProfileFormPanelComponent,
  ],
  template: `
    @let activeCompany = (activeCompany$ | async);

    <section class="space-y-6">
      <header class="rounded-3xl bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <mat-icon>badge</mat-icon>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
                Seguridad
              </p>
              <h1 class="mt-2 text-3xl font-bold text-slate-900">Gestión de Perfiles y Permisos</h1>
              <p class="mt-2 max-w-3xl text-sm text-slate-500">
                El perfil autoriza por módulo y acción dentro de la empresa activa. Los permisos granulares quedan listos para reemplazar el mock por backend real.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Empresa activa
            </p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#0f172a'"
              ></span>
              <span class="font-semibold text-slate-900">{{ activeCompany?.name ?? 'Sin empresa seleccionada' }}</span>
            </div>
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
          <div class="flex flex-wrap items-center gap-3">
            <mat-form-field appearance="outline" class="min-w-[260px] flex-1">
              <mat-label>Buscar perfiles</mat-label>
              <input matInput formControlName="search" placeholder="Nombre, descripción o módulo" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <button mat-flat-button color="primary" type="button" (click)="openNewProfile()">
              Nuevo Perfil
            </button>

            <button mat-stroked-button type="button" (click)="toggleInsights()">
              {{ showInsights ? 'Ocultar Resumen' : 'Resumen de Accesos' }}
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

            <button mat-stroked-button type="submit">Filtrar</button>
          </div>
        </form>

        @if (showInsights) {
          <section class="mt-6 grid gap-4 md:grid-cols-3">
            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Perfiles activos</p>
              <p class="mt-3 text-3xl font-bold text-slate-900">{{ activeProfilesCount() }}</p>
            </article>

            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Perfiles inactivos</p>
              <p class="mt-3 text-3xl font-bold text-slate-900">{{ inactiveProfilesCount() }}</p>
            </article>

            <article class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Permisos activos</p>
              <p class="mt-3 text-3xl font-bold text-slate-900">{{ activePermissionsCount() }}</p>
            </article>
          </section>
        }

        <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          @if (loadingProfiles) {
            <div class="flex min-h-[280px] items-center justify-center bg-slate-50">
              <div class="flex flex-col items-center gap-3 text-slate-500">
                <mat-spinner diameter="34"></mat-spinner>
                <p class="text-sm">Cargando perfiles de la empresa activa...</p>
              </div>
            </div>
          } @else if (!profiles.length) {
            <div class="flex min-h-[280px] flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-slate-500">
              <mat-icon class="!h-10 !w-10 !text-4xl text-slate-300">shield_person</mat-icon>
              <div>
                <p class="text-base font-semibold text-slate-700">No hay perfiles para este criterio.</p>
                <p class="mt-1 text-sm">Crea un perfil reusable y configura su matriz de permisos.</p>
              </div>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm">
                <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th class="px-4 py-4">Nombre del Perfil</th>
                    <th class="px-4 py-4">Módulo</th>
                    <th class="px-4 py-4">Permisos</th>
                    <th class="px-4 py-4">Estado</th>
                    <th class="px-4 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  @for (profile of profiles; track profile.id) {
                    <tr class="hover:bg-slate-50/70">
                      <td class="px-4 py-4">
                        <div class="font-semibold text-slate-900">{{ profile.name }}</div>
                        <div class="text-xs text-slate-500">{{ profile.description || 'Sin descripción' }}</div>
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex flex-wrap gap-2">
                          @for (moduleName of visibleModules(profile); track moduleName) {
                            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {{ moduleName }}
                            </span>
                          }
                          @if (remainingModules(profile) > 0) {
                            <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                              +{{ remainingModules(profile) }}
                            </span>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-4 text-slate-600">
                        <div class="font-medium text-slate-900">{{ profile.permissionCount || 0 }} permisos activos</div>
                        <div class="mt-1 text-xs text-slate-500">
                          {{ profile.permissionsSummary?.[0] || 'Sin permisos asignados' }}
                        </div>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="rounded-full px-3 py-1 text-xs font-semibold"
                          [class.bg-emerald-100]="profile.status === 'active'"
                          [class.text-emerald-700]="profile.status === 'active'"
                          [class.bg-slate-200]="profile.status === 'inactive'"
                          [class.text-slate-600]="profile.status === 'inactive'"
                        >
                          {{ profile.status === 'active' ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                            (click)="editProfile(profile)"
                            [attr.aria-label]="'Editar ' + profile.name"
                            title="Editar"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>

                          <button
                            type="button"
                            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-100"
                            [class.text-amber-600]="profile.status === 'active'"
                            [class.text-emerald-600]="profile.status === 'inactive'"
                            (click)="toggleProfileStatus(profile)"
                            [attr.aria-label]="profile.status === 'active' ? 'Inactivar perfil' : 'Activar perfil'"
                            [title]="profile.status === 'active' ? 'Inactivar' : 'Activar'"
                          >
                            <mat-icon>{{ profile.status === 'active' ? 'toggle_off' : 'toggle_on' }}</mat-icon>
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

      <footer class="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <p class="text-sm text-slate-500">
          Aceptar limpia mensajes y confirma el estado visual actual. Cancelar restablece filtros locales y descarta edición abierta.
        </p>

        <div class="flex items-center gap-3">
          <button mat-flat-button color="primary" type="button" (click)="acceptPageState()" [disabled]="!canAcceptPageState()">
            Aceptar
          </button>
          <button mat-stroked-button type="button" (click)="cancelPageState()">
            Cancelar
          </button>
        </div>
      </footer>

      @if (profilePanelOpen) {
        <app-profile-form-panel
          [initialValue]="selectedProfile"
          [basePermissions]="basePermissions"
          [activeCompanyName]="activeCompany?.name ?? ''"
          [saving]="savingProfile"
          (saveProfile)="saveProfile($event)"
          (closePanel)="closeProfilePanel()"
        ></app-profile-form-panel>
      }
    </section>
  `,
})
export class ProfilesPermissionsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly securityFacade = inject(SecurityAdministrationFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  readonly activeCompany$ = this.securityFacade.activeCompany$;
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>('all'),
  });

  profiles: ProfileRowVm[] = [];
  basePermissions: ModulePermissionVm[] = [];
  selectedProfile: ProfileDetailVm | null = null;
  loadingProfiles = true;
  loadingBasePermissions = false;
  loadingProfileDetail = false;
  savingProfile = false;
  profilePanelOpen = false;
  showInsights = false;
  errorMessage = '';
  successMessage = '';

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

        this.closeProfilePanel(true);
        this.loadProfiles();
        this.loadPermissionModules();
      });
  }

  applyFilters(): void {
    this.loadProfiles();
  }

  toggleInsights(): void {
    this.showInsights = !this.showInsights;
  }

  openNewProfile(): void {
    this.ensureBasePermissions(() => {
      this.selectedProfile = null;
      this.profilePanelOpen = true;
    });
  }

  editProfile(profile: ProfileRowVm): void {
    this.ensureBasePermissions(() => {
      this.loadingProfileDetail = true;
      this.securityFacade
        .getProfile(profile.id)
        .pipe(finalize(() => (this.loadingProfileDetail = false)))
        .subscribe({
          next: (detail) => {
            this.selectedProfile = detail;
            this.profilePanelOpen = true;
          },
          error: (error: unknown) => {
            this.errorMessage = this.resolveErrorMessage(error);
          },
        });
    });
  }

  closeProfilePanel(force: boolean = false): void {
    if (
      !force &&
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el perfil. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.profilePanelOpen = false;
    this.selectedProfile = null;
    this.pendingChangesService.clear();
  }

  saveProfile(payload: ProfileFormValue): void {
    this.savingProfile = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.securityFacade
      .saveProfile(payload, this.selectedProfile?.id)
      .pipe(finalize(() => (this.savingProfile = false)))
      .subscribe({
        next: () => {
          this.successMessage = this.selectedProfile
            ? 'El perfil se actualizó correctamente.'
            : 'El perfil se creó correctamente.';
          this.closeProfilePanel(true);
          this.loadProfiles();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  toggleProfileStatus(profile: ProfileRowVm): void {
    const nextStatus: SecurityRecordStatus =
      profile.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'inactive' ? 'inactivar' : 'activar';

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Deseas ${actionLabel} el perfil ${profile.name}? Esta acción es reversible.`)
    ) {
      return;
    }

    this.loadingProfiles = true;
    this.securityFacade
      .updateProfileStatus(profile.id, nextStatus)
      .pipe(finalize(() => (this.loadingProfiles = false)))
      .subscribe({
        next: () => {
          this.successMessage = `El perfil ${profile.name} ahora está ${nextStatus === 'active' ? 'activo' : 'inactivo'}.`;
          this.loadProfiles(false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  visibleModules(profile: ProfileRowVm): string[] {
    return (profile.modulesSummary ?? []).slice(0, 2);
  }

  remainingModules(profile: ProfileRowVm): number {
    return Math.max((profile.modulesSummary?.length ?? 0) - 2, 0);
  }

  activeProfilesCount(): number {
    return this.profiles.filter((profile) => profile.status === 'active').length;
  }

  inactiveProfilesCount(): number {
    return this.profiles.filter((profile) => profile.status === 'inactive').length;
  }

  activePermissionsCount(): number {
    return this.profiles.reduce(
      (total, profile) => total + (profile.permissionCount ?? 0),
      0,
    );
  }

  acceptPageState(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.profilePanelOpen) {
      this.closeProfilePanel();
    }
  }

  cancelPageState(): void {
    if (
      this.profilePanelOpen &&
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el perfil. Si cancelas, se descartarán. ¿Deseas continuar?',
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
    this.closeProfilePanel(true);
    this.loadProfiles();
  }

  canAcceptPageState(): boolean {
    return !!this.successMessage || !!this.errorMessage || this.profilePanelOpen;
  }

  private ensureBasePermissions(onReady: () => void): void {
    if (this.basePermissions.length) {
      onReady();
      return;
    }

    this.loadingBasePermissions = true;
    this.securityFacade
      .listPermissionModules()
      .pipe(finalize(() => (this.loadingBasePermissions = false)))
      .subscribe({
        next: (permissions) => {
          this.basePermissions = permissions;
          onReady();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private loadProfiles(showLoader: boolean = true): void {
    if (showLoader) {
      this.loadingProfiles = true;
    }

    this.securityFacade
      .listProfiles(this.buildFilters())
      .pipe(finalize(() => (this.loadingProfiles = false)))
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

  private loadPermissionModules(): void {
    if (this.basePermissions.length) {
      return;
    }

    this.ensureBasePermissions(() => undefined);
  }

  private buildFilters(): SecurityListFilters {
    const value = this.filterForm.getRawValue();

    return {
      search: value.search.trim(),
      status: value.status,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as { error?: { detail?: string }; message?: string };

    return (
      httpError?.error?.detail ??
      httpError?.message ??
      'No fue posible completar la operación de perfiles y permisos.'
    );
  }
}