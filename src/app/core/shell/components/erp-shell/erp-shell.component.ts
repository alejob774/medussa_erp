import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize, map } from 'rxjs';
import { AuthLogoutService } from '../../../../features/auth/services/auth-logout.service';
import { AuthSessionService } from '../../../../features/auth/services/auth-session.service';
import { CompanyContextService } from '../../../company/services/company-context.service';
import { NavigationItem } from '../../../navigation/models/navigation-item.model';
import { NavigationFacadeService } from '../../../navigation/services/navigation-facade.service';

@Component({
  selector: 'app-erp-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    @let navItems = (navigationItems$ | async) ?? [];
    @let companies = (companies$ | async) ?? [];
    @let activeCompany = (activeCompany$ | async);
    @let session = (session$ | async);

    <div class="erp-shell-layout">
      <aside class="erp-shell-sidebar">
        <div class="erp-shell-sidebar__content">
          <div class="erp-shell-brand">
            <img [src]="medussaLogo" alt="Medussa ERP" class="erp-shell-brand__logo" />
          </div>

          <nav class="erp-shell-nav" aria-label="Navegacion principal">
            <div class="erp-nav-list">
              @for (item of navItems; track item.id) {
                @if (item.children?.length) {
                  <div
                    class="erp-nav-group"
                    [class.erp-nav-group--open]="isGroupExpanded(item)"
                    [class.erp-nav-group--active]="groupHasActiveChild(item)"
                  >
                    <button
                      type="button"
                      class="erp-nav-group__button"
                      (click)="toggleGroup(item.id)"
                      [attr.aria-expanded]="isGroupExpanded(item)"
                    >
                      <span class="erp-nav-group__title">
                        <mat-icon>{{ item.icon }}</mat-icon>
                        <span class="erp-nav-group__text">
                          <span>{{ item.label }}</span>
                        </span>
                      </span>

                      <mat-icon class="erp-nav-group__chevron">
                        {{ isGroupExpanded(item) ? 'expand_less' : 'expand_more' }}
                      </mat-icon>
                    </button>

                    @if (isGroupExpanded(item)) {
                      <div class="erp-nav-sublist">
                        @for (child of item.children; track child.id) {
                          <a
                            class="erp-nav-sublink"
                            [routerLink]="child.route ?? '/dashboard'"
                            routerLinkActive="active"
                            [routerLinkActiveOptions]="{ exact: true }"
                          >
                            <mat-icon>{{ child.icon }}</mat-icon>
                            <span>{{ child.label }}</span>
                          </a>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <a
                    class="erp-nav-link"
                    [routerLink]="item.route ?? '/dashboard'"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: true }"
                  >
                    <mat-icon>{{ item.icon }}</mat-icon>
                    <span>{{ item.label }}</span>
                  </a>
                }
              }
            </div>
          </nav>
        </div>
      </aside>

      <div class="erp-shell-content">
        <header class="erp-topbar">
          <div class="erp-topbar__intro">
            <p class="erp-topbar__eyebrow">Medussa ERP</p>
            <h1 class="erp-topbar__title">Operacion multiempresa centralizada</h1>
            <p class="erp-topbar__subtitle">
              Navegacion compacta, contexto por empresa activa y una superficie de trabajo mas clara para la operacion diaria.
            </p>
          </div>

          <div class="erp-topbar__controls">
            <div class="erp-company-switcher">
              <span
                class="erp-company-switcher__indicator"
                [style.background]="activeCompany?.accentColor ?? '#0052cc'"
              ></span>

              <div class="erp-company-switcher__details">
                <p class="erp-company-switcher__label">Empresa activa</p>
                <p class="erp-company-switcher__value">
                  {{ activeCompany?.name ?? 'Selecciona una empresa' }}
                </p>
              </div>

              <button
                type="button"
                class="erp-company-switcher__action"
                [matMenuTriggerFor]="companyMenu"
                [disabled]="companies.length < 2 || logoutLoading"
                aria-label="Cambiar empresa activa"
              >
                <span>Cambiar</span>
                <mat-icon>expand_more</mat-icon>
              </button>
            </div>

            <mat-menu #companyMenu="matMenu" xPosition="before">
              @for (company of companies; track company.id) {
                <button type="button" mat-menu-item (click)="switchCompany(company.id)">
                  <span
                    class="erp-company-menu__swatch"
                    [style.background]="company.accentColor ?? '#0052cc'"
                  ></span>
                  <span>{{ company.name }}</span>
                </button>
              }
            </mat-menu>

            <div class="erp-user-badge">
              <div>
                <p class="erp-user-badge__label">Sesion activa</p>
                <p class="m-0 mt-1 text-sm font-semibold text-slate-900">
                  {{ session?.user?.username ?? 'usuario' }}
                </p>
                <p class="m-0 mt-1 text-xs text-slate-500">
                  {{ session?.user?.roles?.[0] ?? 'operador' }}
                </p>
              </div>

              <button
                type="button"
                class="erp-company-switcher__action"
                [matMenuTriggerFor]="sessionMenu"
                [disabled]="logoutLoading"
                aria-label="Abrir acciones de sesion"
              >
                <span>{{ logoutLoading ? 'Cerrando...' : 'Cuenta' }}</span>
                <mat-icon>{{ logoutLoading ? 'hourglass_top' : 'expand_more' }}</mat-icon>
              </button>

              <div class="erp-user-badge__avatar">
                {{ userInitials(session?.user?.username) }}
              </div>
            </div>

            <mat-menu #sessionMenu="matMenu" xPosition="before">
              <button type="button" mat-menu-item disabled>
                <mat-icon>person</mat-icon>
                <span>{{ session?.user?.username ?? 'usuario' }}</span>
              </button>
              <button type="button" mat-menu-item (click)="logout()" [disabled]="logoutLoading">
                <mat-icon>{{ logoutLoading ? 'hourglass_top' : 'logout' }}</mat-icon>
                <span>{{ logoutLoading ? 'Cerrando sesion...' : 'Cerrar sesion' }}</span>
              </button>
            </mat-menu>
          </div>
        </header>

        @if (feedbackMessage) {
          <div class="px-6 pt-4">
            <div class="erp-alert erp-alert--warning flex items-center justify-between gap-3">
              <span>{{ feedbackMessage }}</span>
              <button
                type="button"
                class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700"
                (click)="dismissFeedbackMessage()"
              >
                Cerrar
              </button>
            </div>
          </div>
        }

        <main class="erp-shell-main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ErpShellComponent {
  private readonly navigationFacade = inject(NavigationFacadeService);
  private readonly companyContextService = inject(CompanyContextService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authLogoutService = inject(AuthLogoutService);
  private readonly router = inject(Router);

  readonly sections$ = this.navigationFacade.sections$;
  readonly navigationItems$ = this.sections$.pipe(
    map((sections) => sections.flatMap((section) => section.items)),
  );
  readonly medussaLogo = 'assets/branding/logo-medussa-vertical-white.png';
  readonly companies$ = this.companyContextService.companies$;
  readonly activeCompany$ = this.companyContextService.activeCompany$;
  readonly session$ = this.authSessionService.session$;
  readonly expandedGroupIds = new Set<string>();
  logoutLoading = false;
  feedbackMessage = this.readNavigationFeedbackMessage();

  switchCompany(companyId: string): void {
    this.companyContextService.setActiveCompany(companyId);
  }

  toggleGroup(groupId: string): void {
    if (this.expandedGroupIds.has(groupId)) {
      this.expandedGroupIds.delete(groupId);
      return;
    }

    this.expandedGroupIds.add(groupId);
  }

  isGroupExpanded(item: NavigationItem): boolean {
    return this.expandedGroupIds.has(item.id) || this.groupHasActiveChild(item);
  }

  groupHasActiveChild(item: NavigationItem): boolean {
    return item.children?.some((child) => this.isRouteActive(child.route)) ?? false;
  }

  logout(): void {
    if (this.logoutLoading) {
      return;
    }

    this.logoutLoading = true;

    this.authLogoutService
      .logout()
      .pipe(
        finalize(() => {
          this.logoutLoading = false;
        }),
      )
      .subscribe();
  }

  dismissFeedbackMessage(): void {
    this.feedbackMessage = '';
  }

  private isRouteActive(route?: string): boolean {
    return !!route && this.router.url === route;
  }

  userInitials(username?: string | null): string {
    return (username ?? 'MS')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? '')
      .join('');
  }

  private readNavigationFeedbackMessage(): string {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const historyState =
      typeof window !== 'undefined' ? (window.history.state as { loginInfoMessage?: unknown }) : null;
    const loginInfoMessage =
      navigationState?.['loginInfoMessage'] ?? historyState?.loginInfoMessage ?? '';

    return typeof loginInfoMessage === 'string' ? loginInfoMessage : '';
  }
}
