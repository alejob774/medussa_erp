import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { AuthSessionService } from '../../../auth/services/auth-session.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @let activeCompany = (activeCompany$ | async);
    @let session = (session$ | async);

    <section class="space-y-6">
      <div class="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">Dashboard</p>
        <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold">Bienvenido al shell principal del ERP</h1>
            <p class="mt-2 max-w-2xl text-sm text-slate-300">
              La navegación ya responde a la empresa activa y a permisos mock locales.
            </p>
          </div>

          <div class="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Empresa activa</p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#14b8a6'"
              ></span>
              <span class="font-semibold">{{ activeCompany?.name ?? 'Sin empresa activa' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Empresas disponibles</p>
          <p class="mt-3 text-3xl font-bold text-slate-900">{{ session?.companies?.length ?? 0 }}</p>
          <p class="mt-1 text-sm text-slate-500">La empresa activa persiste durante la sesión.</p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Permisos mock</p>
          <p class="mt-3 text-3xl font-bold text-slate-900">{{ session?.user?.permissions?.length ?? 0 }}</p>
          <p class="mt-1 text-sm text-slate-500">Se usan para filtrar menú y proteger rutas internas.</p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Siguiente HU</p>
          <p class="mt-3 text-sm text-slate-500">
            La base está lista para conectar widgets y CRUD reales por módulo.
          </p>
        </article>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Accesos rápidos</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <a routerLink="/ventas" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Ventas</a>
          <a routerLink="/compras" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Compras</a>
          <a routerLink="/finanzas" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Finanzas</a>
          <a routerLink="/gestion-almacen" class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Gestión de almacén</a>
        </div>
      </div>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly authSessionService = inject(AuthSessionService);

  readonly activeCompany$ = this.companyContextService.activeCompany$;
  readonly session$ = this.authSessionService.session$;
}
