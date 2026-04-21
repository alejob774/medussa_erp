import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TpmAssetAggregate } from '../../../domain/models/tpm-response.model';
import { TpmWorkOrder } from '../../../domain/models/tpm-work-order.model';

@Component({
  selector: 'app-tpm-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Trazabilidad tecnica</p>
          <h3 class="erp-section-title">Historial del activo</h3>
          <p class="erp-section-description">
            Revisa eventos tecnicos, estado del equipo, OT seleccionada y consistencia con operacion.
          </p>
        </div>
      </div>

      @if (asset) {
        <div class="mt-5 grid gap-4 xl:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Activo</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex justify-between gap-3">
                <dt>Equipo</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.codigoEquipo }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Marca / modelo</dt>
                <dd class="text-right font-semibold text-slate-900">{{ asset.asset.marca }} / {{ asset.asset.modelo }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Serie</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.serie }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Ubicacion</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.ubicacion }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Horas uso</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.horasUso }}</dd>
              </div>
            </dl>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mantenimiento</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex justify-between gap-3">
                <dt>Estado tecnico</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.estadoEquipo }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Ultimo mantenimiento</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.fechaUltimoMantenimiento || 'Sin cierre' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Proximo mantenimiento</dt>
                <dd class="font-semibold text-slate-900">{{ asset.asset.fechaProximoMantenimiento || 'Por definir' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Planes activos</dt>
                <dd class="font-semibold text-slate-900">{{ activePlans }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>OTs abiertas</dt>
                <dd class="font-semibold text-slate-900">{{ openOrders }}</dd>
              </div>
            </dl>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">OT seleccionada</p>
            @if (workOrder) {
              <dl class="mt-3 space-y-2 text-sm text-slate-600">
                <div class="flex justify-between gap-3">
                  <dt>Tipo</dt>
                  <dd class="font-semibold text-slate-900">{{ workOrder.tipo }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Estado</dt>
                  <dd class="font-semibold text-slate-900">{{ workOrder.estado }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Tecnico</dt>
                  <dd class="font-semibold text-slate-900">{{ workOrder.tecnico }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Costo</dt>
                  <dd class="font-semibold text-slate-900">{{ workOrder.costo | currency: 'COP':'symbol':'1.0-0' }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>Impacto OEE</dt>
                  <dd class="text-right font-semibold text-slate-900">{{ workOrder.impactoOee || 'Sin impacto' }}</dd>
                </div>
              </dl>
            } @else {
              <p class="mt-3 text-sm text-slate-600">Selecciona una OT para revisar su detalle tecnico.</p>
            }
          </article>
        </div>

        <div class="mt-6 erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[56rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Usuario</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              @for (item of asset.history; track item.id) {
                <tr>
                  <td>{{ item.fecha | date: 'yyyy-MM-dd HH:mm' }}</td>
                  <td>{{ item.evento }}</td>
                  <td>{{ item.usuario }}</td>
                  <td>{{ item.observacion }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-lg font-semibold text-slate-900">Selecciona un activo para revisar el historial</p>
            <p class="mt-2 text-slate-600">Desde aqui veras su hoja de vida, OTs y eventos tecnicos relevantes.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class TpmHistoryComponent {
  @Input() asset: TpmAssetAggregate | null = null;
  @Input() workOrder: TpmWorkOrder | null = null;

  get activePlans(): number {
    return this.asset?.plans.filter((plan) => plan.activo).length ?? 0;
  }

  get openOrders(): number {
    return this.asset?.workOrders.filter((order) => order.estado !== 'CERRADA' && order.estado !== 'CANCELADA').length ?? 0;
  }
}
