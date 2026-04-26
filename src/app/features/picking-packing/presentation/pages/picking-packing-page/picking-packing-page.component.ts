import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PickingPackingFacadeService } from '../../../application/facade/picking-packing.facade';
import {
  DEFAULT_PICKING_FILTERS,
  PickingFilters,
} from '../../../domain/models/picking-filters.model';
import {
  EMPTY_PICKING_PACKING_DASHBOARD,
  PickingPackingDashboard,
} from '../../../domain/models/picking-packing-response.model';
import { PickingTask } from '../../../domain/models/picking-task.model';
import { PickingFiltersComponent } from '../../components/picking-filters/picking-filters.component';
import { PickingKpisComponent } from '../../components/picking-kpis/picking-kpis.component';
import { PickingBandejaComponent } from '../../components/picking-bandeja/picking-bandeja.component';
import {
  PickingDetailComponent,
  PickingLineSubmitEvent,
} from '../../components/picking-detail/picking-detail.component';
import { PickingAlertsComponent } from '../../components/picking-alerts/picking-alerts.component';
import { ClosePackingEvent, PackingDeskComponent } from '../../components/packing-desk/packing-desk.component';
import { PickingProductivityComponent } from '../../components/picking-productivity/picking-productivity.component';

@Component({
  selector: 'app-picking-packing-page',
  standalone: true,
  imports: [
    CommonModule,
    PickingFiltersComponent,
    PickingKpisComponent,
    PickingBandejaComponent,
    PickingDetailComponent,
    PickingAlertsComponent,
    PackingDeskComponent,
    PickingProductivityComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-032</p>
            <h1 class="erp-page-title">Picking y Packing</h1>
            <p class="erp-page-description">
              Opera la preparacion de pedidos de {{ activeCompanyName }} con picking guiado por ubicacion, control de
              faltantes, cierre de packing y productividad del turno de despacho.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Operacion de bodega y despacho conectada al layout de El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Turno actual</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ todayLabel }}</p>
              <p class="erp-meta-card__hint">Pedidos mock listos para preparar, empacar y despachar.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      @if (successMessage) {
        <div class="erp-alert erp-alert--success">{{ successMessage }}</div>
      }

      <app-picking-filters
        [catalogs]="dashboard.catalogs"
        [filters]="filters"
        (apply)="handleFilters($event)"
        (reset)="resetFilters()"
      />

      <app-picking-kpis [kpis]="dashboard.kpis" />

      <section class="erp-balanced-grid erp-balanced-grid--main">
        <app-picking-bandeja
          [tasks]="dashboard.tasks"
          [selectedTaskId]="selectedTask?.id ?? null"
          (selectTask)="selectTask($event)"
        />

        <app-picking-detail
          [task]="selectedTask"
          [details]="selectedDetails"
          [operators]="dashboard.catalogs.operators"
          (startPicking)="startPicking($event)"
          (confirmLine)="confirmLine($event)"
          (closePicking)="closePicking()"
        />
      </section>

      <section class="erp-balanced-grid erp-balanced-grid--split">
        <app-picking-alerts
          [alerts]="dashboard.alerts"
          [shortageDetails]="dashboard.details.filter(hasShortage)"
        />

        <app-packing-desk
          [readyTasks]="readyTasks"
          [selectedTask]="selectedPackingTask"
          [details]="selectedPackingDetails"
          [packing]="selectedPacking"
          [packageTypes]="dashboard.catalogs.packageTypes"
          (selectTask)="selectTask($event)"
          (closePacking)="closePacking($event)"
          (markReady)="markReadyForDispatch($event)"
        />
      </section>

      <app-picking-productivity [productivity]="dashboard.productivity" />
    </div>
  `,
})
export class PickingPackingPageComponent {
  private readonly facade = inject(PickingPackingFacadeService);

  dashboard: PickingPackingDashboard = EMPTY_PICKING_PACKING_DASHBOARD;
  filters: PickingFilters = { ...DEFAULT_PICKING_FILTERS };
  selectedTask: PickingTask | null = null;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';
  todayLabel = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.selectedTask = null;
      this.reload();
    });
  }

  readonly hasShortage = (detail: PickingPackingDashboard['details'][number]) => detail.tieneFaltante;

  get selectedDetails() {
    return this.dashboard.details.filter((detail) => detail.tareaId === this.selectedTask?.id);
  }

  get readyTasks() {
    return this.dashboard.tasks.filter((task) => task.estado === 'ALISTADO' || task.estado === 'CERRADO');
  }

  get selectedPackingTask(): PickingTask | null {
    if (this.selectedTask && (this.selectedTask.estado === 'ALISTADO' || this.selectedTask.estado === 'CERRADO')) {
      return this.selectedTask;
    }

    return this.readyTasks[0] ?? null;
  }

  get selectedPackingDetails() {
    return this.dashboard.details.filter((detail) => detail.tareaId === this.selectedPackingTask?.id);
  }

  get selectedPacking() {
    const pedidoId = this.selectedPackingTask?.pedidoId ?? null;
    return this.dashboard.packings.find((packing) => packing.pedidoId === pedidoId) ?? null;
  }

  handleFilters(filters: PickingFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_PICKING_FILTERS };
    this.reload();
  }

  selectTask(task: PickingTask): void {
    this.selectedTask = task;
  }

  startPicking(operatorName: string): void {
    if (!this.selectedTask) {
      return;
    }

    this.facade.startPicking(this.selectedTask.id, operatorName).subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.errorMessage = '';
        this.reload(false, result.task?.id ?? this.selectedTask?.id ?? null);
      },
      error: (error: unknown) => {
        this.successMessage = '';
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible iniciar la tarea.';
      },
    });
  }

  confirmLine(event: PickingLineSubmitEvent): void {
    if (!this.selectedTask) {
      return;
    }

    this.facade
      .confirmLine(this.selectedTask.id, event.detail.id, {
        cantidadConfirmada: event.cantidadConfirmada,
        observacion: event.observacion,
      })
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.errorMessage = '';
          this.reload(false, result.task?.id ?? this.selectedTask?.id ?? null);
        },
        error: (error: unknown) => {
          this.successMessage = '';
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible confirmar la linea.';
        },
      });
  }

  closePicking(): void {
    if (!this.selectedTask) {
      return;
    }

    this.facade
      .closePicking(this.selectedTask.id, {
        usuario: 'demo.supervisor-bodega',
        observacion: 'Pedido liberado desde el tablero de picking y packing.',
      })
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.errorMessage = '';
          this.reload(false, result.task?.id ?? this.selectedTask?.id ?? null);
        },
        error: (error: unknown) => {
          this.successMessage = '';
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cerrar el picking.';
        },
      });
  }

  closePacking(event: ClosePackingEvent): void {
    this.facade
      .closePacking(event.taskId, {
        tipoEmpaque: event.tipoEmpaque,
        pesoTotal: event.pesoTotal,
        volumenTotal: event.volumenTotal,
        usuarioCierre: 'demo.packing-desk',
      })
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.errorMessage = '';
          this.reload(false, result.task?.id ?? this.selectedPackingTask?.id ?? null);
        },
        error: (error: unknown) => {
          this.successMessage = '';
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible cerrar el packing.';
        },
      });
  }

  markReadyForDispatch(packingId: string): void {
    this.facade.markReadyForDispatch(packingId, 'demo.supervisor-despacho').subscribe({
      next: (result) => {
        this.successMessage = result.message;
        this.errorMessage = '';
        this.reload(false, result.task?.id ?? this.selectedPackingTask?.id ?? null);
      },
      error: (error: unknown) => {
        this.successMessage = '';
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible marcar listo para despacho.';
      },
    });
  }

  private reload(clearMessages = true, preferredTaskId?: string | null): void {
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }

    const currentTaskId = preferredTaskId ?? this.selectedTask?.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedTask =
          dashboard.tasks.find((task) => task.id === currentTaskId) ?? dashboard.selectedTask ?? null;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_PICKING_PACKING_DASHBOARD;
        this.selectedTask = null;
        this.errorMessage =
          error instanceof Error ? error.message : 'No fue posible cargar Picking y Packing.';
      },
    });
  }
}
