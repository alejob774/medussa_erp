import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../../../../features/auth/services/auth-session.service';
import { CompanyContextService } from '../../../company/services/company-context.service';
import { NavigationItem, NavigationSection } from '../../../navigation/models/navigation-item.model';
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

    <div class="flex min-h-screen bg-slate-100 text-slate-800">
      <aside class="flex w-20 flex-col items-center gap-4 bg-slate-950 py-4 text-slate-200">
        <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
          <img [src]="medussaLogo" alt="Medussa" class="h-9 w-auto object-contain" />
        </div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400 [writing-mode:vertical-rl] rotate-180">
          Medussa
        </div>

        <div class="mt-4 flex flex-col gap-3">
          @for (section of sections; track section.id) {
            <button
              type="button"
              class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 transition hover:border-teal-400 hover:bg-slate-800"
              [class.border-teal-400]="selectedSectionId === section.id"
              [class.bg-slate-800]="selectedSectionId === section.id"
              (click)="setSelectedSection(section.id)"
              [attr.aria-label]="section.label"
              [title]="section.label"
            >
              <mat-icon>{{ section.icon }}</mat-icon>
            </button>
          }
        </div>
      </aside>

      <aside class="hidden w-80 shrink-0 border-r border-slate-200 bg-white xl:block">
        <div class="border-b border-slate-200 px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-teal-600">Módulos</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">
            {{ selectedSectionLabel(sections) }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">{{ selectedSectionHint(sections) }}</p>
        </div>

        <nav class="space-y-3 p-4">
          @for (item of selectedSectionItems(sections); track item.id) {
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
              @if (item.children?.length) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-white"
                  (click)="toggleItem(item.id)"
                >
                  <span class="flex items-center gap-3">
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <mat-icon>{{ item.icon }}</mat-icon>
                    </span>
                    <span>
                      <span class="block">{{ item.label }}</span>
                      <span class="text-xs font-normal text-slate-500">{{ item.description || 'Submódulos disponibles por empresa' }}</span>
                    </span>
                  </span>
                  <mat-icon>{{ expandedItemId === item.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>

                @if (expandedItemId === item.id) {
                  <div class="mt-2 space-y-1 pl-3">
                    @for (child of item.children; track child.id) {
                      <a
                        class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white hover:text-slate-900"
                        [routerLink]="child.route ?? '/dashboard'"
                        routerLinkActive="bg-white font-semibold text-slate-900 shadow-sm"
                      >
                        <mat-icon class="text-base">{{ child.icon }}</mat-icon>
                        <span>{{ child.label }}</span>
                      </a>
                    }
                  </div>
                }
              } @else {
                <a
                  class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                  [routerLink]="item.route ?? '/dashboard'"
                  routerLinkActive="bg-white text-slate-900 shadow-sm"
                >
                  <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <mat-icon>{{ item.icon }}</mat-icon>
                  </span>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div class="flex min-w-0 items-center gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Medussa ERP</p>
                <h1 class="text-lg font-semibold text-slate-900">Shell multiempresa</h1>
              </div>

              <label class="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
                <mat-icon class="text-slate-400">search</mat-icon>
                <input
                  type="text"
                  class="w-72 bg-transparent text-sm outline-none"
                  placeholder="Buscar módulo, acción o empresa"
                />
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Empresa activa
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <span
                    class="inline-block h-2.5 w-2.5 rounded-full"
                    [style.background]="activeCompany?.accentColor ?? '#0f172a'"
                  ></span>
                  <select
                    class="bg-transparent text-sm font-medium text-slate-700 outline-none"
                    [value]="activeCompany?.id ?? ''"
                    (change)="switchCompany(($any($event.target)).value)"
                  >
                    @for (company of companies; track company.id) {
                      <option [value]="company.id">{{ company.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              >
                <mat-icon>notifications</mat-icon>
              </button>

              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              >
                <mat-icon>help</mat-icon>
              </button>

              <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div class="hidden text-right sm:block">
                  <p class="text-sm font-semibold text-slate-800">
                    {{ session?.user?.username ?? 'usuario' }}
                  </p>
                  <p class="text-xs text-slate-500">{{ session?.user?.roles?.[0] ?? 'operador' }}</p>
                </div>
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {{ userInitials(session?.user?.username) }}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-auto p-6">
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
  readonly medussaLogo = 'assets/login/Logo1.png';
  readonly companies$ = this.companyContextService.companies$;
  readonly activeCompany$ = this.companyContextService.activeCompany$;
  readonly session$ = this.authSessionService.session$;

  selectedSectionId = '';
  expandedItemId: string | null = null;

  constructor() {
    this.sections$.pipe(takeUntilDestroyed()).subscribe((sections) => {
      if (!sections.length) {
        this.selectedSectionId = '';
        this.expandedItemId = null;
        return;
      }

      const selectedSection = sections.find(
        (section) => section.id === this.selectedSectionId,
      );

      if (!selectedSection) {
        this.selectedSectionId = sections[0].id;
      }

      const currentSection = this.getSelectedSection(sections);
      const firstExpandable = currentSection?.items.find((item) => item.children?.length);

      if (!currentSection?.items.some((item) => item.id === this.expandedItemId)) {
        this.expandedItemId = firstExpandable?.id ?? null;
      }
    });
  }

  setSelectedSection(sectionId: string): void {
    this.selectedSectionId = sectionId;
  }

  switchCompany(companyId: string): void {
    this.companyContextService.setActiveCompany(companyId);
  }

  toggleItem(itemId: string): void {
    this.expandedItemId = this.expandedItemId === itemId ? null : itemId;
  }

  selectedSectionLabel(sections: NavigationSection[]): string {
    return this.getSelectedSection(sections)?.label ?? 'Módulos';
  }

  selectedSectionHint(sections: NavigationSection[]): string {
    return this.getSelectedSection(sections)?.hint ?? 'Navegación dinámica por empresa';
  }

  selectedSectionItems(sections: NavigationSection[]): NavigationItem[] {
    return this.getSelectedSection(sections)?.items ?? [];
  }

  userInitials(username?: string | null): string {
    return (username ?? 'MS')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? '')
      .join('');
  }

  private getSelectedSection(
    sections: NavigationSection[],
  ): NavigationSection | undefined {
    return sections.find((section) => section.id === this.selectedSectionId) ?? sections[0];
  }
}
