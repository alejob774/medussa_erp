import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProductDevelopmentKpis } from '../../../domain/models/product-development-kpi.model';

@Component({
  selector: 'app-product-development-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      @for (card of cards; track card.label) {
        <article class="erp-kpi-card">
          <p class="erp-kpi-card__label">{{ card.label }}</p>
          <p class="erp-kpi-card__value">{{ card.value }}</p>
          <p class="erp-kpi-card__hint">{{ card.hint }}</p>
        </article>
      }
    </section>
  `,
})
export class ProductDevelopmentKpisComponent {
  @Input({ required: true }) kpis: ProductDevelopmentKpis = {
    activeProjects: 0,
    evaluatingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    blockedByHighRisk: 0,
    upcomingLaunches: 0,
  };

  get cards(): Array<{ label: string; value: string; hint: string }> {
    return [
      { label: 'Proyectos activos', value: `${this.kpis.activeProjects}`, hint: 'Portafolio en curso por empresa activa.' },
      { label: 'En evaluacion', value: `${this.kpis.evaluatingProjects}`, hint: 'Proyectos con viabilidad calculada.' },
      { label: 'Aprobados', value: `${this.kpis.approvedProjects}`, hint: 'Listos para lanzar producto maestro.' },
      { label: 'Rechazados', value: `${this.kpis.rejectedProjects}`, hint: 'Proyectos descartados con observacion.' },
      { label: 'Riesgo alto', value: `${this.kpis.blockedByHighRisk}`, hint: 'Bloqueados por riesgo supply chain alto.' },
      { label: 'Lanzamientos proximos', value: `${this.kpis.upcomingLaunches}`, hint: 'Ventana de lanzamiento en 45 dias.' },
    ];
  }
}
