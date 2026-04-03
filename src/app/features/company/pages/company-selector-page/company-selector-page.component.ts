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

    <div class="min-h-screen bg-slate-950 p-6 text-white">
      <div class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section class="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-xl font-black">
              M
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">Medussa ERP</p>
              <h1 class="text-2xl font-semibold">Base multiempresa</h1>
            </div>
          </div>

          <div class="mt-8 space-y-4 text-sm text-slate-200">
            <div class="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Usuario</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ session?.user?.username ?? 'usuario' }}</p>
              <p class="text-slate-300">{{ session?.user?.email ?? 'sin correo mock' }}</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Qué cambia al seleccionar empresa</p>
              <ul class="mt-2 space-y-2 text-slate-200">
                <li>• Menú lateral dinámico según empresa y permisos.</li>
                <li>• Contexto visual y navegación interna protegida.</li>
                <li>• Empresa activa persistida durante toda la sesión.</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
          <div class="mb-6">
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">Selecciona empresa</p>
            <h2 class="mt-2 text-3xl font-bold">¿Con cuál empresa quieres entrar?</h2>
            <p class="mt-2 text-sm text-slate-500">
              El shell recalculará módulos, submódulos y permisos mock automáticamente.
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            @for (company of companies; track company.id) {
              <button
                type="button"
                class="rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                (click)="selectCompany(company.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      {{ company.code }}
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">{{ company.name }}</h3>
                  </div>
                  <span
                    class="inline-block h-3 w-3 rounded-full"
                    [style.background]="company.accentColor ?? '#0f172a'"
                  ></span>
                </div>

                <p class="mt-3 text-sm text-slate-500">
                  {{ company.description || 'Contexto operativo listo para continuar.' }}
                </p>

                <div class="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                  Entrar con esta empresa
                  <mat-icon class="text-base">arrow_forward</mat-icon>
                </div>
              </button>
            }
          </div>
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

    if (companies.length === 1) {
      this.companyContextService.setActiveCompany(companies[0].id);
      void this.router.navigate(['/dashboard']);
    }
  }

  selectCompany(companyId: string): void {
    this.companyContextService.setActiveCompany(companyId);
    void this.router.navigate(['/dashboard']);
  }
}
