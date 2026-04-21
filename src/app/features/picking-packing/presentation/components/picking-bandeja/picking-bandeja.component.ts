import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PickingTask } from '../../../domain/models/picking-task.model';

@Component({
  selector: 'app-picking-bandeja',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="erp-panel">
      <div>
        <p class="erp-section-eyebrow">Picking floor</p>
        <h3 class="erp-section-title">Bandeja de pedidos por alistar</h3>
        <p class="erp-section-description">
          Ordena el turno por prioridad, fecha compromiso, zona, ruta y nivel de avance del alistamiento.
        </p>
      </div>

      @if (tasks.length) {
        <div class="erp-table-shell mt-5 overflow-x-auto">
          <table class="erp-data-table min-w-[78rem]">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Ruta</th>
                <th>Zona</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Operario</th>
                <th>Compromiso</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              @for (task of tasks; track task.id) {
                <tr
                  class="cursor-pointer"
                  [class.bg-sky-50]="task.id === selectedTaskId"
                  (click)="selectTask.emit(task)"
                >
                  <td class="font-semibold text-slate-900">{{ task.pedidoId }}</td>
                  <td>{{ task.clienteNombre }}</td>
                  <td>{{ task.rutaNombre }}</td>
                  <td>{{ task.zona }}</td>
                  <td>
                    <span class="erp-chip" [ngClass]="priorityClass(task.prioridad)">
                      {{ task.prioridad }}
                    </span>
                  </td>
                  <td>
                    <span class="erp-chip" [ngClass]="stateClass(task.estado)">
                      {{ task.estado }}
                    </span>
                  </td>
                  <td>{{ task.operarioNombre || 'Sin asignar' }}</td>
                  <td>{{ task.fechaCompromiso | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    {{ task.lineasConfirmadas }}/{{ task.lineasTotales }}
                    @if (task.lineasConFaltante > 0) {
                      <span class="ml-1 text-xs font-semibold text-amber-700">
                        · {{ task.lineasConFaltante }} faltante(s)
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state mt-5 min-h-[16rem]">
          <div>
            <p class="text-slate-600">No hay pedidos para el filtro actual.</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class PickingBandejaComponent {
  @Input() tasks: PickingTask[] = [];
  @Input() selectedTaskId: string | null = null;

  @Output() readonly selectTask = new EventEmitter<PickingTask>();

  priorityClass(priority: PickingTask['prioridad']): string {
    if (priority === 'ALTA') {
      return 'erp-chip--warning';
    }

    if (priority === 'MEDIA') {
      return 'erp-chip--info';
    }

    return 'erp-chip--neutral';
  }

  stateClass(state: PickingTask['estado']): string {
    if (state === 'ALISTADO' || state === 'CERRADO') {
      return 'erp-chip--success';
    }

    if (state === 'CON_FALTANTE') {
      return 'erp-chip--warning';
    }

    if (state === 'EN_PROCESO') {
      return 'erp-chip--info';
    }

    return 'erp-chip--neutral';
  }
}
