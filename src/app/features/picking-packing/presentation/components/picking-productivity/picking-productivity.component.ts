import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PickingProductivity } from '../../../domain/models/picking-productivity.model';

@Component({
  selector: 'app-picking-productivity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Productividad y OTIF</p>
        <h3 class="erp-section-title">Desempeno del turno</h3>
        <p class="erp-section-description">
          Mide pedidos preparados, lineas por hora y cumplimiento interno del equipo de alistamiento.
        </p>
      </div>

      @if (productivity.length) {
        <div class="mt-5 grid gap-4 xl:grid-cols-3">
          @for (item of productivity; track item.id) {
            <article class="erp-detail-card">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-lg font-semibold text-slate-900">{{ item.operario }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ item.fechaOperacion | date: 'dd/MM/yyyy' }}</p>
                </div>
                <span class="erp-chip erp-chip--info">{{ item.lineasPorHora }} lineas/h</span>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pedidos</p>
                  <p class="mt-2 text-2xl font-semibold text-slate-900">{{ item.pedidosPreparados }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lineas</p>
                  <p class="mt-2 text-2xl font-semibold text-slate-900">{{ item.lineasPreparadas }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">OTIF</p>
                  <p class="mt-2 text-2xl font-semibold text-slate-900">{{ item.otifInterno }}%</p>
                </div>
              </div>

              <div class="mt-4">
                <div class="h-2 rounded-full bg-slate-100">
                  <div
                    class="h-2 rounded-full bg-emerald-500"
                    [style.width.%]="item.otifInterno"
                  ></div>
                </div>
                <p class="mt-2 text-sm text-slate-500">Tiempo total turno: {{ item.tiempoTotal }} min</p>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[15rem]">
          <div>
            <p class="text-slate-600">Aun no hay productividad disponible para el filtro seleccionado.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class PickingProductivityComponent {
  @Input() productivity: PickingProductivity[] = [];
}
