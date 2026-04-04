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
      <header class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-wrap items-start justify-between gap-6">
          <div>
            <p class="erp-page-eyebrow">Inicio</p>
            <h1 class="erp-page-title">Centro operativo del ERP</h1>
            <p class="erp-page-description">
              El shell ya responde a la empresa activa, la navegación está ordenada por dominios y el área de trabajo conserva una jerarquía visual consistente.
            </p>
          </div>

          <div class="min-w-[260px] rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-sm backdrop-blur-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Empresa activa</p>
            <div class="mt-3 flex items-center gap-3">
              <span
                class="inline-block h-3 w-3 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#6293C5'"
              ></span>
              <span class="text-base font-semibold text-white">{{ activeCompany?.name ?? 'Sin empresa activa' }}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Empresas disponibles</p>
          <p class="erp-kpi-card__value">{{ session?.companies?.length ?? 0 }}</p>
          <p class="erp-kpi-card__hint">La empresa activa se mantiene estable durante la sesión.</p>
        </article>

        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Permisos cargados</p>
          <p class="erp-kpi-card__value">{{ session?.user?.permissions?.length ?? 0 }}</p>
          <p class="erp-kpi-card__hint">Filtran navegación, vistas y rutas internas del shell.</p>
        </article>

        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Estado del frontend</p>
          <p class="mt-4 text-base font-semibold text-slate-900">Listo para conectar negocio real</p>
          <p class="erp-kpi-card__hint">La base visual ya quedó preparada para iteraciones por módulo.</p>
        </article>
      </div>

      <section class="erp-panel">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="erp-page-eyebrow">Accesos rápidos</p>
            <h2 class="mt-3 text-2xl font-semibold text-slate-900">Módulos más consultados</h2>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <a routerLink="/atencion" class="erp-ghost-link">Atención al cliente</a>
          <a routerLink="/produccion" class="erp-ghost-link">Producción</a>
          <a routerLink="/compras" class="erp-ghost-link">Compras</a>
          <a routerLink="/inventarios" class="erp-ghost-link">Inventarios</a>
          <a routerLink="/gestion-almacen" class="erp-ghost-link">Almacén</a>
          <a routerLink="/finanzas" class="erp-ghost-link">Finanzas</a>
        </div>
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly authSessionService = inject(AuthSessionService);

  readonly activeCompany$ = this.companyContextService.activeCompany$;
  readonly session$ = this.authSessionService.session$;
}
