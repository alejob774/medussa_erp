import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthSessionService } from '../../../auth/services/auth-session.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    @let session = (session$ | async);

    <section class="space-y-6">
      <header class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content">
          <div>
            <p class="erp-page-eyebrow">Inicio</p>
            <h1 class="erp-page-title">Centro operativo del ERP</h1>
            <p class="erp-page-description">
              El entorno de trabajo está organizado para operar por empresa, con navegación compacta y foco en los módulos activos del ERP.
            </p>
          </div>
        </div>
      </header>

      <section class="erp-panel">
        <div class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p class="erp-page-eyebrow">Resumen ejecutivo</p>
            <h2 class="mt-3 text-2xl font-semibold text-slate-900">Inicio del entorno corporativo</h2>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              La sesión conserva la empresa activa, el rol principal del usuario y la disponibilidad de módulos según permisos. El área de trabajo queda lista para continuar con operación, configuración y seguimiento sin elementos de relleno.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresas</p>
              <p class="erp-meta-card__value text-2xl">{{ session?.companies?.length ?? 0 }}</p>
              <p class="erp-meta-card__hint">Disponibles en esta sesión.</p>
            </article>

            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Permisos</p>
              <p class="erp-meta-card__value text-2xl">{{ session?.user?.permissions?.length ?? 0 }}</p>
              <p class="erp-meta-card__hint">Aplicados al menú y rutas.</p>
            </article>

            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Rol principal</p>
              <p class="erp-meta-card__value">{{ session?.user?.roles?.[0] ?? 'operador' }}</p>
              <p class="erp-meta-card__hint">Contexto de trabajo actual.</p>
            </article>
          </div>
        </div>
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly authSessionService = inject(AuthSessionService);

  readonly session$ = this.authSessionService.session$;
}
