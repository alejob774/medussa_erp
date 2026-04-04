import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';

@Component({
  selector: 'app-module-placeholder-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    @let activeCompany = (activeCompany$ | async);

    <section class="space-y-6">
      <header class="erp-page-header">
        <div class="erp-page-header__content flex flex-wrap items-start justify-between gap-6">
          <div>
            <p class="erp-page-eyebrow">Módulo preparado</p>
            <h1 class="erp-page-title">{{ title }}</h1>
            <p class="erp-page-description">{{ description }}</p>
          </div>

          <div class="erp-meta-card min-w-[260px]">
            <p class="erp-meta-card__label">Empresa activa</p>
            <p class="erp-meta-card__value flex items-center gap-3">
              <span
                class="inline-block h-3 w-3 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#0052cc'"
              ></span>
              <span>{{ activeCompany?.name ?? 'Sin empresa activa' }}</span>
            </p>
            <p class="erp-meta-card__hint">La ruta está protegida y lista para evolucionar con lógica real.</p>
          </div>
        </div>
      </header>

      <div class="grid gap-4 lg:grid-cols-3">
        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Estado</p>
          <p class="mt-4 text-base font-semibold text-slate-900">Vista base disponible</p>
          <p class="erp-kpi-card__hint">Ya navega dentro del shell y mantiene permisos y contexto.</p>
        </article>

        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Siguiente historia</p>
          <p class="mt-4 text-base font-semibold text-slate-900">Conectar datos y componentes</p>
          <p class="erp-kpi-card__hint">No hace falta rehacer layout ni navegación para seguir creciendo.</p>
        </article>

        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">Siguiente paso sugerido</p>
          <p class="mt-4 text-base font-semibold text-slate-900">{{ hint }}</p>
        </article>
      </div>

      <section class="erp-panel border-dashed">
        <p class="text-sm leading-6 text-slate-600">
          Usa la nueva navegación lateral para moverte entre módulos o vuelve a
          <a routerLink="/dashboard" class="font-semibold text-[#0052CC]">Inicio</a>.
        </p>
      </section>
    </section>
  `,
})
export class ModulePlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly companyContextService = inject(CompanyContextService);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'Módulo';
  }

  get description(): string {
    return (
      this.route.snapshot.data['description'] ??
      'Base visual preparada para conectar la siguiente historia de usuario.'
    );
  }

  get hint(): string {
    return this.route.snapshot.data['hint'] ?? 'Conectar widgets y acciones del negocio.';
  }
}
