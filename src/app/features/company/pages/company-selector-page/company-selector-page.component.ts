import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';

@Component({
  selector: 'app-company-selector-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @let companies = (companies$ | async) ?? [];
    @let session = (session$ | async);

    <div class="min-h-screen p-6 text-slate-900">
      <div class="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.92fr_1.3fr]">
        <section class="erp-page-header erp-page-header--dark">
          <div class="erp-page-header__content space-y-6">
            <div class="flex items-center gap-4">
              <img
                src="assets/branding/logo-medussa-vertical-white.png"
                alt="Medussa ERP"
                class="w-28 max-w-full drop-shadow-xl"
              />

              <div>
                <p class="erp-page-eyebrow">Medussa ERP</p>
                <h1 class="erp-page-title text-[2.2rem]">Acceso por empresa</h1>
              </div>
            </div>

            <div class="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Usuario</p>
              <p class="mt-3 text-lg font-semibold text-white">{{ session?.user?.username ?? 'usuario' }}</p>
              <p class="mt-1 text-sm text-white/72">{{ session?.user?.email ?? 'sin correo mock' }}</p>
            </div>
          </div>
        </section>

        <section class="space-y-6">
          <header class="erp-page-header">
            <div class="erp-page-header__content">
              <p class="erp-page-eyebrow">Selecciona empresa</p>
              <h2 class="erp-page-title">¿Con cuál empresa quieres entrar?</h2>
              <p class="erp-page-description">
                Deja una sola decisión visible y clara: elige la empresa y entra al entorno corporativo de trabajo.
              </p>
            </div>
          </header>

          <section class="erp-panel">
            <div class="grid gap-4 md:grid-cols-2">
              @for (company of companies; track company.id) {
                <button
                  type="button"
                  class="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[#6293C5] hover:shadow-xl"
                  (click)="selectCompany(company.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        {{ company.code }}
                      </p>
                      <h3 class="mt-2 text-xl font-semibold text-slate-900">{{ company.name }}</h3>
                    </div>

                    <span
                      class="mt-1 inline-block h-3 w-3 rounded-full"
                      [style.background]="company.accentColor ?? '#0052cc'"
                    ></span>
                  </div>

                  <p class="mt-4 min-h-[3.75rem] text-sm leading-6 text-slate-600">
                    {{ company.description || 'Contexto operativo listo para continuar dentro del ERP.' }}
                  </p>

                  <div class="mt-5 flex items-center justify-between gap-3">
                    <span class="erp-chip erp-chip--neutral">ERP multiempresa</span>
                    <span class="inline-flex items-center gap-2 text-sm font-semibold text-[#0052CC]">
                      Entrar
                      <mat-icon class="text-base">arrow_forward</mat-icon>
                    </span>
                  </div>
                </button>
              }
            </div>
          </section>
        </section>
      </div>
    </div>
  `,
})
export class CompanySelectorPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly companyContextService = inject(CompanyContextService);

  readonly companies$ = this.companyContextService.companies$;
  readonly session$ = this.authSessionService.session$;

  ngOnInit(): void {
    const session = this.authSessionService.getSession();
    const companies = session?.companies ?? [];

    if (session?.activeCompanyId) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    if (companies.length >= 1) {
      this.companyContextService.setActiveCompany(companies[0].id);
      void this.router.navigate(['/dashboard']);
    }
  }

  selectCompany(companyId: string): void {
    this.companyContextService.setActiveCompany(companyId);
    void this.router.navigate(['/dashboard']);
  }
}
