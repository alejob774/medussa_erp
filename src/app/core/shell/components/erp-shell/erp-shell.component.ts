import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../../../../features/auth/services/auth-session.service';
import { CompanyContextService } from '../../../company/services/company-context.service';
import { NavigationFacadeService } from '../../../navigation/services/navigation-facade.service';

@Component({
  selector: 'app-erp-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    @let sections = (sections$ | async) ?? [];
    @let companies = (companies$ | async) ?? [];
    @let activeCompany = (activeCompany$ | async);
    @let session = (session$ | async);

    <div class="erp-shell-layout">
      <aside class="erp-shell-sidebar">
        <div class="erp-shell-sidebar__content">
          <div class="erp-shell-brand">
            <img [src]="medussaLogo" alt="Medussa ERP" class="erp-shell-brand__logo" />

            <div>
              <p class="erp-shell-brand__eyebrow">Medussa ERP</p>
              <p class="erp-shell-brand__name">ERP Integral System</p>
              <p class="erp-shell-brand__subline">
                Navegación corporativa clara para una operación multiempresa consistente.
              </p>
            </div>
          </div>

          <div class="erp-shell-sidecard">
            <p class="erp-shell-sidecard__label">Empresa en contexto</p>
            <p class="erp-shell-sidecard__value">{{ activeCompany?.name ?? 'Selecciona una empresa' }}</p>
            <p class="erp-shell-sidecard__hint">
              El menú visible responde a permisos y a la empresa activa de la sesión.
            </p>
          </div>

          <nav class="erp-shell-nav" aria-label="Navegación principal de Medussa ERP">
            @for (section of sections; track section.id) {
              <section class="erp-nav-section">
                <p class="erp-nav-section__label">{{ section.label }}</p>

                <div class="erp-nav-list">
                  @for (item of section.items; track item.id) {
                    @if (item.children?.length) {
                      <div class="erp-nav-group">
                        <div class="erp-nav-group__title">
                          <mat-icon>{{ item.icon }}</mat-icon>
                          <span class="erp-nav-group__text">
                            <span>{{ item.label }}</span>
                            <span class="erp-nav-group__hint">
                              {{ item.description || 'Submódulos disponibles' }}
                            </span>
                          </span>
                        </div>

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
              </section>
            }
          </nav>
        </div>
      </aside>

      <div class="erp-shell-content">
        <header class="erp-topbar">
          <div>
            <p class="erp-topbar__eyebrow">Plataforma corporativa</p>
            <h1 class="erp-topbar__title">Operación multiempresa</h1>
            <p class="erp-topbar__description">
              Header limpio, navegación clara y branding alineado al sistema visual de Medussa.
            </p>
          </div>

          <div class="erp-topbar__controls">
            <div class="erp-company-switcher">
              <span
                class="erp-company-switcher__indicator"
                [style.background]="activeCompany?.accentColor ?? '#0052cc'"
              ></span>

              <div>
                <p class="erp-company-switcher__label">Empresa activa</p>
                <select
                  class="erp-company-select"
                  [value]="activeCompany?.id ?? ''"
                  (change)="switchCompany(($any($event.target)).value)"
                >
                  @for (company of companies; track company.id) {
                    <option [value]="company.id">{{ company.name }}</option>
                  }
                </select>
              </div>
            </div>

            <a class="erp-ghost-link" routerLink="/select-company">
              <mat-icon>swap_horiz</mat-icon>
              <span>Cambiar empresa</span>
            </a>

            <div class="erp-user-badge">
              <div>
                <p class="erp-user-badge__label">Sesión activa</p>
                <p class="m-0 mt-1 text-sm font-semibold text-slate-900">
                  {{ session?.user?.username ?? 'usuario' }}
                </p>
                <p class="m-0 mt-1 text-xs text-slate-500">{{ session?.user?.roles?.[0] ?? 'operador' }}</p>
              </div>

              <div class="erp-user-badge__avatar">
                {{ userInitials(session?.user?.username) }}
              </div>
            </div>
          </div>
        </header>

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

  readonly sections$ = this.navigationFacade.sections$;
  readonly medussaLogo = 'assets/branding/logo-medussa-vertical-white.png';
  readonly companies$ = this.companyContextService.companies$;
  readonly activeCompany$ = this.companyContextService.activeCompany$;
  readonly session$ = this.authSessionService.session$;

  switchCompany(companyId: string): void {
    this.companyContextService.setActiveCompany(companyId);
  }

  userInitials(username?: string | null): string {
    return (username ?? 'MS')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? '')
      .join('');
  }
}
