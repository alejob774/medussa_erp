import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../../../environments/environment';
import { BiDashboardEmbedConfig } from '../../../domain/models/grafana-embed.model';

@Component({
  selector: 'app-bi-grafana-demo-embed',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block',
  },
  template: `
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Visualizacion Grafana preparada</p>
    <h2 class="mt-1 text-lg font-semibold text-slate-950">{{ title }}</h2>

    @if (iframeAllowed && iframeUrl) {
      <div class="mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-950 shadow-sm">
        <iframe
          class="h-[34rem] min-h-[28rem] w-full bg-slate-950"
          [src]="iframeUrl"
          [title]="title"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
        <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: demo local habilitado</span>
        <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: habilitado</span>
        <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Grafana: {{ demoBaseUrl }}</span>
      </div>
    } @else {
      <div class="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5">
        <p class="text-sm font-semibold text-slate-800">dashboardUid</p>
        <p class="mt-2 font-mono text-sm text-slate-700">{{ dashboardUid || 'pendiente' }}</p>
        <p class="mt-4 text-sm text-slate-600">
          {{ description }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Estado: pendiente de conexion</span>
          <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Iframe: no configurado</span>
          <span class="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Datasource futuro: DW/datamart</span>
        </div>
      </div>
    }
  `,
})
export class GrafanaDemoEmbedComponent implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly grafanaConfig = environment.grafana;

  @Input() embedConfig: BiDashboardEmbedConfig | null | undefined = null;
  @Input() fallbackDashboardUid = '';
  @Input() title = 'Dashboard Grafana';
  @Input() description =
    'La version final consultara Data Warehouse y datamarts via Grafana. Esta fase demo/local no crea token firmado, URL productiva, ETL ni conexion a backend.';

  iframeUrl: SafeResourceUrl | null = null;

  ngOnChanges(): void {
    const dashboardUrl = this.buildDashboardUrl();
    this.iframeUrl = dashboardUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(dashboardUrl) : null;
  }

  get demoBaseUrl(): string {
    return this.grafanaConfig.baseUrl;
  }

  get dashboardUid(): string {
    return this.embedConfig?.dashboardUid || this.fallbackDashboardUid;
  }

  get iframeAllowed(): boolean {
    return Boolean(this.grafanaConfig.demoEmbeddingEnabled && this.dashboardUid);
  }

  private buildDashboardUrl(): string | null {
    if (!this.iframeAllowed) {
      return null;
    }

    try {
      const url = new URL(`d/${encodeURIComponent(this.dashboardUid)}/medussa-bi-demo`, this.baseUrlWithSlash());
      url.searchParams.set('orgId', String(this.grafanaConfig.orgId));
      url.searchParams.set('theme', this.grafanaConfig.defaultTheme);
      url.searchParams.set('refresh', this.grafanaConfig.refresh);

      const filters = this.embedConfig?.filters;
      if (filters?.empresaId) {
        url.searchParams.set('var-empresaId', filters.empresaId);
      }
      if (filters?.sedeId) {
        url.searchParams.set('var-sedeId', filters.sedeId);
      }
      if (filters?.moneda) {
        url.searchParams.set('var-moneda', filters.moneda);
      }
      if (filters?.fechaDesde) {
        url.searchParams.set('from', this.grafanaDate(filters.fechaDesde, false));
        url.searchParams.set('var-fechaDesde', filters.fechaDesde);
      }
      if (filters?.fechaHasta) {
        url.searchParams.set('to', this.grafanaDate(filters.fechaHasta, true));
        url.searchParams.set('var-fechaHasta', filters.fechaHasta);
      }
      if (this.grafanaConfig.kiosk) {
        url.searchParams.set('kiosk', '');
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  private baseUrlWithSlash(): string {
    return this.grafanaConfig.baseUrl.endsWith('/') ? this.grafanaConfig.baseUrl : `${this.grafanaConfig.baseUrl}/`;
  }

  private grafanaDate(value: string, endOfDay: boolean): string {
    const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
    const time = new Date(`${value}${suffix}`).getTime();

    return Number.isFinite(time) ? String(time) : value;
  }
}
