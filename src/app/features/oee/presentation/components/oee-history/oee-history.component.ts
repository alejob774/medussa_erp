import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { OeeHistory } from '../../../domain/models/oee-history.model';
import { OeeRecordAggregate } from '../../../domain/models/oee-response.model';

@Component({
  selector: 'app-oee-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Detalle tecnico</p>
          <h3 class="erp-section-title">Historico del registro seleccionado</h3>
          <p class="erp-section-description">
            Consulta datos tecnicos, calculos base y trazabilidad del registro operativo.
          </p>
        </div>
      </div>

      @if (record) {
        <div class="mt-5 grid gap-4 xl:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Contexto</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex justify-between gap-3">
                <dt>Fecha</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.fechaOperacion }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Planta</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.planta }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Linea</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.lineaProduccion }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Maquina</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.maquinaCodigo }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Turno</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.turno }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>OP</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.ordenProduccion || 'Sin OP' }}</dd>
              </div>
            </dl>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Produccion</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex justify-between gap-3">
                <dt>Tiempo programado</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.tiempoProgramado }} min</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Tiempo parado</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.tiempoParado }} min</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Neto operativo</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.tiempoNetoOperativo }} min</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Producidas</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.unidadesProducidas }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Objetivo</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.unidadesObjetivo }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Rechazadas</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.unidadesRechazadas }}</dd>
              </div>
            </dl>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Calculo OEE</p>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex justify-between gap-3">
                <dt>Disponibilidad</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.disponibilidad | percent: '1.0-1' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Rendimiento</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.rendimiento | percent: '1.0-1' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Calidad</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.calidad | percent: '1.0-1' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>OEE</dt>
                <dd class="font-semibold text-slate-900">{{ record.record.oee | percent: '1.0-1' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt>Causa de paro</dt>
                <dd class="text-right font-semibold text-slate-900">{{ record.record.causaParo || 'Sin paro' }}</dd>
              </div>
            </dl>
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
              @for (item of histories; track item.id) {
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
            <p class="text-lg font-semibold text-slate-900">Selecciona un registro para revisar su historico</p>
            <p class="mt-2 text-slate-600">
              Desde aqui veras la bitacora operativa, el detalle tecnico y el resultado del calculo OEE.
            </p>
          </div>
        </div>
      }
    </section>
  `,
})
export class OeeHistoryComponent {
  @Input() record: OeeRecordAggregate | null = null;
  @Input() histories: OeeHistory[] = [];
}
