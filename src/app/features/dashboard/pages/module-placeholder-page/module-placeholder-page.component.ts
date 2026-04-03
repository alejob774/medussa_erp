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
      <div class="rounded-3xl bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-teal-600">HU-000 / Placeholder</p>
            <h1 class="mt-2 text-3xl font-bold text-slate-900">{{ title }}</h1>
            <p class="mt-2 max-w-2xl text-sm text-slate-500">{{ description }}</p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Empresa activa</p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#0f172a'"
              ></span>
              <span class="font-medium text-slate-800">{{ activeCompany?.name ?? 'Sin empresa activa' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Estado</p>
          <p class="mt-2 text-sm text-slate-500">Vista base creada y protegida por auth/permisos.</p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Listo para HU siguiente</p>
          <p class="mt-2 text-sm text-slate-500">Se puede conectar data real o componentes de negocio sin rehacer el shell.</p>
        </article>

        <article class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-700">Siguiente paso sugerido</p>
          <p class="mt-2 text-sm text-slate-500">{{ hint }}</p>
        </article>
      </div>

      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Usa el menú lateral para navegar entre módulos mock o vuelve al
        <a routerLink="/dashboard" class="font-semibold text-teal-700">dashboard</a>.
      </div>
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
