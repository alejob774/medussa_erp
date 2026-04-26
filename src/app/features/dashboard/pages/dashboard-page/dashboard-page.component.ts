import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthSessionService } from '../../../auth/services/auth-session.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @let session = (session$ | async);

    <section class="space-y-6">
      <header class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-wrap items-end justify-between gap-5">
          <div class="max-w-4xl">
            <p class="erp-page-eyebrow">Inicio</p>
            <h1 class="erp-page-title">Centro operativo del ERP</h1>
            <p class="erp-page-description">
              Un punto de entrada limpio para operar por empresa, revisar contexto y continuar el trabajo diario sin ruido visual.
            </p>
          </div>

          <div class="grid min-w-[18rem] gap-3 sm:grid-cols-3">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresas</p>
              <p class="erp-kpi-card__value">{{ session?.companies?.length ?? 0 }}</p>
            </article>

            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Permisos</p>
              <p class="erp-kpi-card__value">{{ session?.user?.permissions?.length ?? 0 }}</p>
            </article>

            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Rol</p>
              <p class="erp-meta-card__value">{{ session?.user?.roles?.[0] ?? 'operador' }}</p>
            </article>
          </div>
        </div>
      </header>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section class="erp-panel">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p class="erp-section-eyebrow">Resumen ejecutivo</p>
              <h2 class="erp-section-title">Entorno corporativo listo</h2>
              <p class="erp-section-description max-w-3xl">
                La sesion mantiene empresa activa, permisos y rutas disponibles. La navegacion lateral agrupa los modulos para sostener trabajo de escritorio con menos carga cognitiva.
              </p>
            </div>

            <span class="erp-chip erp-chip--success">Sesion activa</span>
          </div>

          <div class="mt-6 grid gap-3 md:grid-cols-3">
            <article class="erp-form-section">
              <mat-icon class="text-[#0052CC]">apartment</mat-icon>
              <h3 class="erp-section-title">Multiempresa</h3>
              <p class="erp-section-description">Cambio de contexto visible y acotado al usuario.</p>
            </article>

            <article class="erp-form-section">
              <mat-icon class="text-[#0052CC]">verified_user</mat-icon>
              <h3 class="erp-section-title">Permisos</h3>
              <p class="erp-section-description">Menu y rutas filtradas por perfil de acceso.</p>
            </article>

            <article class="erp-form-section">
              <mat-icon class="text-[#0052CC]">dashboard_customize</mat-icon>
              <h3 class="erp-section-title">Operaciones</h3>
              <p class="erp-section-description">Modulos preparados para operacion, maestros y seguridad.</p>
            </article>
          </div>
        </section>

        <aside class="erp-panel">
          <p class="erp-section-eyebrow">Accesos estructurales</p>
          <h2 class="erp-section-title">Areas principales</h2>

          <div class="mt-5 grid gap-3">
            <div class="erp-form-section flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-slate-900">Supply Chain Management</p>
                <p class="mt-1 text-sm text-slate-500">Maestros y operacion logistica.</p>
              </div>
              <mat-icon class="text-slate-400">local_shipping</mat-icon>
            </div>

            <div class="erp-form-section flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-slate-900">Configuracion</p>
                <p class="mt-1 text-sm text-slate-500">Parametros, usuarios, perfiles y auditoria.</p>
              </div>
              <mat-icon class="text-slate-400">tune</mat-icon>
            </div>

            <div class="erp-form-section flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-slate-900">Produccion</p>
                <p class="mt-1 text-sm text-slate-500">Calidad, OEE, formulas y mantenimiento.</p>
              </div>
              <mat-icon class="text-slate-400">precision_manufacturing</mat-icon>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly authSessionService = inject(AuthSessionService);

  readonly session$ = this.authSessionService.session$;
}
