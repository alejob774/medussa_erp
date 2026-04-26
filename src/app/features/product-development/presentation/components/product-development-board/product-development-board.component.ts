import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductDevelopmentProjectAggregate } from '../../../domain/models/product-development-project.model';

@Component({
  selector: 'app-product-development-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Pipeline</p>
          <h3 class="erp-section-title">Tablero de proyectos</h3>
          <p class="erp-section-description">Portafolio actual de innovación y lanzamiento.</p>
        </div>
      </div>
      <div class="mt-4 grid gap-4 xl:grid-cols-2">
        @for (item of projects; track item.project.id) {
          <button
            type="button"
            class="erp-selectable-card"
            [class.erp-selectable-card--active]="selectedProjectId === item.project.id"
            (click)="select.emit(item.project.id)"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="erp-chip erp-chip--strong">{{ item.project.estadoProyecto }}</span>
              @if (item.project.viabilidadGeneral) {
                <span class="erp-chip" [ngClass]="viabilityClass(item.project.viabilidadGeneral)">{{ item.project.viabilidadGeneral }}</span>
              }
              @if (item.project.productoMaestroCreado) {
                <span class="erp-chip erp-chip--success">Producto creado</span>
              }
            </div>
            <p class="mt-3 text-base font-semibold text-slate-900">{{ item.project.nombreProducto }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ item.project.skuPropuesto }} · {{ item.project.categoria }}</p>
            <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <span>Mercado: {{ item.project.mercadoObjetivo }}</span>
              <span>Lanzamiento: {{ item.project.fechaLanzamiento }}</span>
              <span>BOM: {{ item.bom.length }} items</span>
              <span>Responsable: {{ item.project.responsableProyecto }}</span>
            </div>
          </button>
        }
      </div>
    </section>
  `,
})
export class ProductDevelopmentBoardComponent {
  @Input() projects: ProductDevelopmentProjectAggregate[] = [];
  @Input() selectedProjectId: string | null = null;

  @Output() readonly select = new EventEmitter<string>();

  viabilityClass(level: string): string {
    if (level === 'ALTA') return 'erp-chip--success';
    if (level === 'MEDIA') return 'erp-chip--info';
    return 'erp-chip--warning';
  }
}
