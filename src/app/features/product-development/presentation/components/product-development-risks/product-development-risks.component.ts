import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProductDevelopmentProjectAggregate } from '../../../domain/models/product-development-project.model';

@Component({
  selector: 'app-product-development-risks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Viabilidad y riesgos</p>
        <h3 class="erp-section-title">Lectura ejecutiva del proyecto</h3>
      </div>
      @if (project) {
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Viabilidad</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">{{ project.project.viabilidadGeneral || 'Pendiente' }}</p>
            <p class="mt-2 text-sm text-slate-600">Costo estimado: {{ project.project.costoEstimado || 0 | number: '1.0-0' }}</p>
            <p class="mt-1 text-sm text-slate-600">Margen estimado: {{ project.project.margenEstimado ?? 0 }}%</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Riesgos</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span class="erp-chip" [ngClass]="riskClass(project.project.riesgoAbastecimiento)">{{ project.project.riesgoAbastecimiento || 'Pendiente' }} abastecimiento</span>
              <span class="erp-chip" [ngClass]="riskClass(project.project.riesgoOperativo)">{{ project.project.riesgoOperativo || 'Pendiente' }} operativo</span>
              <span class="erp-chip" [ngClass]="riskClass(project.project.riesgoLogistico)">{{ project.project.riesgoLogistico || 'Pendiente' }} logistico</span>
            </div>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
            <div class="flex flex-wrap gap-2">
              <span class="erp-chip" [ngClass]="project.risks.bomIncompleta ? 'erp-chip--warning' : 'erp-chip--success'">BOM {{ project.risks.bomIncompleta ? 'incompleta' : 'lista' }}</span>
              <span class="erp-chip" [ngClass]="project.risks.skuDuplicado ? 'erp-chip--warning' : 'erp-chip--success'">SKU {{ project.risks.skuDuplicado ? 'duplicado' : 'disponible' }}</span>
              <span class="erp-chip" [ngClass]="project.risks.proveedorCriticoUnico ? 'erp-chip--warning' : 'erp-chip--success'">Proveedor critico {{ project.risks.proveedorCriticoUnico ? 'unico' : 'cubierto' }}</span>
              <span class="erp-chip" [ngClass]="project.risks.insumoNoCubierto ? 'erp-chip--warning' : 'erp-chip--success'">Insumos {{ project.risks.insumoNoCubierto ? 'no cubiertos' : 'cubiertos' }}</span>
              <span class="erp-chip" [ngClass]="project.risks.lanzamientoProximo ? 'erp-chip--info' : 'erp-chip--neutral'">Lanzamiento {{ project.risks.lanzamientoProximo ? 'proximo' : 'planificado' }}</span>
            </div>
          </article>
        </div>
      } @else {
        <div class="erp-empty-state mt-4 min-h-[14rem]"><div><p class="text-slate-600">Selecciona un proyecto para revisar riesgos.</p></div></div>
      }
    </section>
  `,
})
export class ProductDevelopmentRisksComponent {
  @Input() project: ProductDevelopmentProjectAggregate | null = null;

  riskClass(level: string | null): string {
    if (level === 'ALTO') return 'erp-chip--warning';
    if (level === 'MEDIO') return 'erp-chip--info';
    if (level === 'BAJO') return 'erp-chip--success';
    return 'erp-chip--neutral';
  }
}
