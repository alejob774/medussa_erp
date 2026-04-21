import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StorageLayoutKpis } from '../../../domain/models/storage-layout-kpi.model';

@Component({
  selector: 'app-storage-layout-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Bodegas activas</p>
        <p class="erp-metric-card__value">{{ kpis.activeWarehouses }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Ubicaciones</p>
        <p class="erp-metric-card__value">{{ kpis.totalLocations }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Ocupacion promedio</p>
        <p class="erp-metric-card__value">{{ kpis.averageOccupancyPct }}%</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Zonas saturadas</p>
        <p class="erp-metric-card__value text-amber-700">{{ kpis.saturatedZones }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">Zonas ociosas</p>
        <p class="erp-metric-card__value text-sky-700">{{ kpis.idleZones }}</p>
      </article>
      <article class="erp-metric-card">
        <p class="erp-metric-card__label">SKU clase A</p>
        <p class="erp-metric-card__value">{{ kpis.skuClassA }}</p>
      </article>
    </section>
  `,
})
export class StorageLayoutKpisComponent {
  @Input() kpis: StorageLayoutKpis = {
    activeWarehouses: 0,
    totalLocations: 0,
    averageOccupancyPct: 0,
    saturatedZones: 0,
    idleZones: 0,
    skuClassA: 0,
  };
}
