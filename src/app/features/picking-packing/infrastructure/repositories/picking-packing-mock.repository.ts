import { Injectable, inject } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Client } from '../../../clients/domain/models/client.model';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { Driver } from '../../../drivers/domain/models/driver.model';
import { DriverStore } from '../../../drivers/domain/models/driver-response.model';
import { INITIAL_DRIVERS_STORE } from '../../../drivers/infrastructure/data/drivers.mock';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Route } from '../../../routes/domain/models/route.model';
import { RouteStore } from '../../../routes/domain/models/route-response.model';
import { INITIAL_ROUTES_STORE } from '../../../routes/infrastructure/data/routes.mock';
import {
  StorageLayoutLot,
  StorageLayoutStore,
} from '../../../storage-layout/domain/models/storage-layout-response.model';
import { ensureStorageLayoutBaseline } from '../../../storage-layout/infrastructure/data/storage-layout-store.utils';
import { InventoryBalance } from '../../../inventory-core/domain/models/inventory-balance.model';
import { InventoryReservation } from '../../../inventory-core/domain/models/inventory-reservation.model';
import { InventoryCoreMockRepository } from '../../../inventory-core/infrastructure/repositories/inventory-core-mock.repository';
import {
  projectStorageLayoutLotsToBalances,
  readInventoryCoreStore,
} from '../../../inventory-core/infrastructure/repositories/inventory-core-store.utils';
import { Packing, PackingState, PackingType } from '../../domain/models/packing.model';
import {
  PickingAlert,
  PickingAlertSeverity,
  PickingAlertType,
} from '../../domain/models/picking-alert.model';
import { PickingDetail, PickingDetailState } from '../../domain/models/picking-detail.model';
import {
  DEFAULT_PICKING_FILTERS,
  PickingFilters,
} from '../../domain/models/picking-filters.model';
import { PickingPackingKpis } from '../../domain/models/picking-packing-kpi.model';
import { PickingProductivity } from '../../domain/models/picking-productivity.model';
import {
  EMPTY_PICKING_PACKING_DASHBOARD,
  PickingPackingAuditDraft,
  PickingPackingDashboard,
  PickingPackingStore,
  PickingPackingMutationResult,
} from '../../domain/models/picking-packing-response.model';
import { PickingTask, PickingTaskPriority, PickingTaskState } from '../../domain/models/picking-task.model';
import {
  ClosePackingPayload,
  ClosePickingPayload,
  ConfirmPickingLinePayload,
  PickingPackingRepository,
} from '../../domain/repositories/picking-packing.repository';

const STORAGE_KEY = 'medussa.erp.mock.picking-packing';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const CLIENTS_STORAGE_KEY = 'medussa.erp.mock.clients';
const ROUTES_STORAGE_KEY = 'medussa.erp.mock.routes';
const DRIVERS_STORAGE_KEY = 'medussa.erp.mock.drivers';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

const OPERATOR_CATALOG = [
  'Luis Moreno',
  'Andrea Pardo',
  'Sergio Becerra',
  'Martha Ruiz',
  'Daniela Cruz',
];

type SeedLine = {
  lot: string;
  requested: number;
  confirmed: number;
  state: PickingDetailState;
  observation?: string | null;
};

type SeedTask = {
  pedidoId: string;
  clientId: string;
  routeId: string;
  priority: PickingTaskPriority;
  state: PickingTaskState;
  assignedAt: string;
  dueAt: string;
  operator: string | null;
  startedAt: string | null;
  closedAt: string | null;
  lines: SeedLine[];
  packing?: {
    type: PackingType;
    state: PackingState;
    weight: number;
    volume: number;
    closedAt: string | null;
    user: string | null;
  };
};

@Injectable({
  providedIn: 'root',
})
export class PickingPackingMockRepository implements PickingPackingRepository {
  private readonly inventoryCore = inject(InventoryCoreMockRepository);

  getDashboard(companyId: string, filters: PickingFilters): Observable<PickingPackingDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const hydrated = this.hydrateCompany(companyId, store, layoutStore);
    const alertsByOrder = hydrated.alerts.reduce<Record<string, PickingAlert[]>>((acc, alert) => {
      acc[alert.pedidoId] = [...(acc[alert.pedidoId] ?? []), alert];
      return acc;
    }, {});
    const tasks = hydrated.tasks.filter((task) => this.matchesFilters(task, normalizedFilters, alertsByOrder));
    const taskIds = new Set(tasks.map((task) => task.id));
    const pedidoIds = new Set(tasks.map((task) => task.pedidoId));
    const details = hydrated.details.filter((detail) => taskIds.has(detail.tareaId));
    const packings = hydrated.packings.filter((packing) => pedidoIds.has(packing.pedidoId));
    const alerts = hydrated.alerts
      .filter((alert) => pedidoIds.has(alert.pedidoId))
      .filter((alert) => normalizedFilters.severidad === 'TODAS' || alert.severidad === normalizedFilters.severidad);
    const productivity = hydrated.productivity.filter((item) =>
      normalizedFilters.operarioNombre ? item.operario === normalizedFilters.operarioNombre : true,
    );
    const selectedTask = tasks[0] ?? null;

    return of({
      filters: normalizedFilters,
      catalogs: this.buildCatalogs(companyId),
      tasks,
      details,
      alerts,
      packings,
      productivity,
      kpis: this.buildKpis(tasks, alerts, productivity),
      selectedTask,
    }).pipe(delay(180));
  }

  startPicking(
    companyId: string,
    taskId: string,
    operarioNombre: string,
  ): Observable<PickingPackingMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentTask = store.tasks.find((item) => item.empresaId === companyId && item.id === taskId) ?? null;

    if (!currentTask) {
      return throwError(() => new Error('No se encontro la tarea de picking solicitada.'));
    }

    if (currentTask.estado === 'CERRADO') {
      return throwError(() => new Error('La tarea ya fue cerrada y no admite cambios.'));
    }

    if (!operarioNombre.trim()) {
      return throwError(() => new Error('Debes indicar el operario responsable.'));
    }

    const now = new Date().toISOString();
    const nextTask: PickingTask = {
      ...currentTask,
      operarioNombre: operarioNombre.trim(),
      fechaInicio: currentTask.fechaInicio ?? now,
      estado: currentTask.estado === 'ALISTADO' ? 'ALISTADO' : 'EN_PROCESO',
    };
    const nextStore = this.replaceTask(store, nextTask);
    const auditDraft = this.buildAuditDraft(
      'pick-start',
      companyId,
      nextTask.id,
      nextTask.pedidoId,
      `Picking iniciado por ${nextTask.operarioNombre}.`,
      this.sanitizeTask(currentTask),
      this.sanitizeTask(nextTask),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<PickingPackingMutationResult>({
      action: 'task-started',
      task: { ...nextTask },
      packing: null,
      message: 'Tarea de picking iniciada correctamente.',
      auditDraft,
    }).pipe(delay(180));
  }

  confirmLine(
    companyId: string,
    taskId: string,
    detailId: string,
    payload: ConfirmPickingLinePayload,
  ): Observable<PickingPackingMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentTask = store.tasks.find((item) => item.empresaId === companyId && item.id === taskId) ?? null;
    const currentDetail = store.details.find((item) => item.tareaId === taskId && item.id === detailId) ?? null;

    if (!currentTask || !currentDetail) {
      return throwError(() => new Error('No se encontro la linea de picking solicitada.'));
    }

    if (currentTask.estado === 'PENDIENTE') {
      return throwError(() => new Error('Inicia el picking antes de confirmar cantidades.'));
    }

    if (currentTask.estado === 'CERRADO') {
      return throwError(() => new Error('La tarea ya fue cerrada y no admite cambios.'));
    }

    if (payload.cantidadConfirmada < 0) {
      return throwError(() => new Error('La cantidad confirmada no puede ser negativa.'));
    }

    const location = layoutStore.locations.find(
      (item) => item.empresaId === companyId && item.id === currentDetail.ubicacionId,
    );
    const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === currentDetail.loteId);
    const locationBlocked = !location || location.estado !== 'ACTIVA';
    const available = this.resolveAvailableStock(companyId, store, layoutStore, currentDetail, currentTask);

    if (!lot) {
      return throwError(() => new Error('El lote asociado ya no existe en el layout.'));
    }

    if (locationBlocked && payload.cantidadConfirmada > 0) {
      return throwError(() => new Error('La ubicacion esta bloqueada o no disponible para picking.'));
    }

    if (!this.canPickLot(companyId, currentDetail.loteId) && payload.cantidadConfirmada > 0) {
      return throwError(() => new Error('El lote esta bloqueado, retenido, en cuarentena o rechazado.'));
    }

    if (payload.cantidadConfirmada > available) {
      return throwError(
        () => new Error(`La cantidad confirmada supera el stock disponible (${available} unidades).`),
      );
    }

    const nextState = this.resolveDetailState(
      payload.cantidadConfirmada,
      currentDetail.cantidadSolicitada,
      locationBlocked,
      false,
    );
    const nextDetail: PickingDetail = {
      ...currentDetail,
      cantidadConfirmada: Math.round(payload.cantidadConfirmada),
      stockDisponible: available,
      tieneFaltante: locationBlocked || payload.cantidadConfirmada < currentDetail.cantidadSolicitada,
      observacion: payload.observacion?.trim() || null,
      estado: nextState,
    };
    const detailSnapshot = store.details.map((item) => (item.id === detailId ? nextDetail : { ...item }));
    const nextTask = this.rebuildTask(currentTask, detailSnapshot.filter((item) => item.tareaId === taskId));
    const nextStore = {
      ...store,
      tasks: store.tasks.map((item) => (item.id === taskId ? nextTask : { ...item })),
      details: detailSnapshot,
    };
    const auditDraft = this.buildAuditDraft(
      'line-confirm',
      companyId,
      nextDetail.id,
      `${nextTask.pedidoId} · ${nextDetail.sku}`,
      nextDetail.tieneFaltante
        ? 'Linea de picking actualizada con faltante.'
        : 'Linea de picking confirmada sin novedad.',
      this.sanitizeDetail(currentDetail),
      this.sanitizeDetail(nextDetail),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<PickingPackingMutationResult>({
      action: 'line-confirmed',
      task: { ...nextTask },
      packing: null,
      message: nextDetail.tieneFaltante
        ? 'Linea confirmada con faltante registrado.'
        : 'Linea confirmada correctamente.',
      auditDraft,
    }).pipe(delay(180));
  }

  closePicking(
    companyId: string,
    taskId: string,
    payload: ClosePickingPayload,
  ): Observable<PickingPackingMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentTask = store.tasks.find((item) => item.empresaId === companyId && item.id === taskId) ?? null;
    const taskDetails = store.details.filter((item) => item.tareaId === taskId);

    if (!currentTask) {
      return throwError(() => new Error('No se encontro la tarea de picking.'));
    }

    if (currentTask.estado === 'CERRADO') {
      return throwError(() => new Error('La tarea ya fue cerrada.'));
    }

    if (!taskDetails.length) {
      return throwError(() => new Error('La tarea no tiene lineas para cerrar.'));
    }

    if (taskDetails.some((detail) => detail.estado === 'PENDIENTE')) {
      return throwError(() => new Error('Debes confirmar o marcar faltante en todas las lineas.'));
    }

    if (!taskDetails.some((detail) => detail.cantidadConfirmada > 0)) {
      return throwError(() => new Error('Debes confirmar al menos una linea antes de cerrar el picking.'));
    }

    const reservationResult = this.reserveConfirmedPickingLines(
      companyId,
      currentTask,
      taskDetails,
      layoutStore,
      payload.usuario.trim(),
    );

    const reservationError = reservationResult.error;

    if (reservationError) {
      return throwError(() => new Error(reservationError));
    }

    const now = new Date().toISOString();
    const nextTask = this.rebuildTask(
      {
        ...currentTask,
        estado: 'ALISTADO',
        fechaCierre: now,
      },
      reservationResult.details,
    );
    const currentPacking = store.packings.find((item) => item.empresaId === companyId && item.pedidoId === currentTask.pedidoId) ?? null;
    const nextPacking: Packing = currentPacking ?? {
      id: `packing-${companyId}-${slugify(currentTask.pedidoId)}`,
      empresaId: companyId,
      pedidoId: currentTask.pedidoId,
      tipoEmpaque: 'Caja',
      pesoTotal: 0,
      volumenTotal: 0,
      fechaCierre: null,
      usuarioCierre: null,
      estado: 'PENDIENTE',
      packingListCodigo: null,
      packingListResumen: [],
    };
    const nextStore: PickingPackingStore = {
      ...store,
      tasks: store.tasks.map((item) => (item.id === taskId ? nextTask : { ...item })),
      details: store.details.map((item) =>
        item.tareaId === taskId
          ? reservationResult.details.find((detail) => detail.id === item.id) ?? { ...item }
          : { ...item },
      ),
      packings: currentPacking
        ? store.packings.map((item) => (item.id === currentPacking.id ? nextPacking : { ...item }))
        : [nextPacking, ...store.packings.map((item) => ({ ...item }))],
      alerts: [],
      productivity: [],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'pick-close',
      companyId,
      nextTask.id,
      nextTask.pedidoId,
      payload.observacion?.trim() || 'Picking cerrado y liberado para packing.',
      this.sanitizeTask(currentTask),
      this.sanitizeTask(nextTask),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<PickingPackingMutationResult>({
      action: 'picking-closed',
      task: { ...nextTask },
      packing: { ...nextPacking },
      message: 'Picking cerrado. El pedido ya puede pasar al packing desk.',
      auditDraft,
    }).pipe(delay(200));
  }

  closePacking(
    companyId: string,
    taskId: string,
    payload: ClosePackingPayload,
  ): Observable<PickingPackingMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentTask = store.tasks.find((item) => item.empresaId === companyId && item.id === taskId) ?? null;

    if (!currentTask) {
      return throwError(() => new Error('No se encontro la tarea seleccionada.'));
    }

    if (currentTask.estado !== 'ALISTADO') {
      return throwError(() => new Error('Solo los pedidos alistados pueden pasar a packing.'));
    }

    if (payload.pesoTotal <= 0 || payload.volumenTotal <= 0) {
      return throwError(() => new Error('Debes registrar peso y volumen mayores a cero.'));
    }

    const taskDetails = store.details.filter((item) => item.tareaId === taskId);
    const packing = store.packings.find((item) => item.empresaId === companyId && item.pedidoId === currentTask.pedidoId) ?? null;

    if (packing && (packing.estado === 'CERRADO' || packing.estado === 'LISTO_PARA_DESPACHO')) {
      return throwError(() => new Error('El packing ya fue cerrado previamente.'));
    }

    const issueResult = this.issueConfirmedPackingLines(
      companyId,
      currentTask,
      taskDetails,
      layoutStore,
      payload.usuarioCierre.trim(),
    );

    if (issueResult) {
      return throwError(() => new Error(issueResult));
    }

    const now = new Date().toISOString();
    const nextTask: PickingTask = {
      ...currentTask,
      estado: 'CERRADO',
    };
    const nextPacking: Packing = {
      id: packing?.id ?? `packing-${companyId}-${slugify(currentTask.pedidoId)}`,
      empresaId: companyId,
      pedidoId: currentTask.pedidoId,
      tipoEmpaque: payload.tipoEmpaque,
      pesoTotal: Number(payload.pesoTotal),
      volumenTotal: Number(payload.volumenTotal),
      fechaCierre: now,
      usuarioCierre: payload.usuarioCierre.trim(),
      estado: 'CERRADO',
      packingListCodigo: `PL-${currentTask.pedidoId}`,
      packingListResumen: this.buildPackingListSummary(taskDetails),
    };
    const nextStore: PickingPackingStore = {
      ...store,
      tasks: store.tasks.map((item) => (item.id === taskId ? nextTask : { ...item })),
      details: store.details.map((item) => ({ ...item })),
      packings: packing
        ? store.packings.map((item) => (item.id === packing.id ? nextPacking : { ...item }))
        : [nextPacking, ...store.packings.map((item) => ({ ...item }))],
      alerts: [],
      productivity: [],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'pack-close',
      companyId,
      nextPacking.id,
      nextTask.pedidoId,
      'Packing cerrado y stock descontado del layout compartido.',
      packing ? this.sanitizePacking(packing) : null,
      this.sanitizePacking(nextPacking),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<PickingPackingMutationResult>({
      action: 'packing-closed',
      task: { ...nextTask },
      packing: { ...nextPacking },
      message: 'Packing cerrado. El pedido quedo preparado para despacho.',
      auditDraft,
    }).pipe(delay(220));
  }

  markReadyForDispatch(
    companyId: string,
    packingId: string,
    usuario: string,
  ): Observable<PickingPackingMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentPacking = store.packings.find((item) => item.empresaId === companyId && item.id === packingId) ?? null;

    if (!currentPacking) {
      return throwError(() => new Error('No se encontro el packing solicitado.'));
    }

    if (currentPacking.estado !== 'CERRADO') {
      return throwError(() => new Error('Solo puedes marcar listo un packing ya cerrado.'));
    }

    const nextPacking: Packing = {
      ...currentPacking,
      estado: 'LISTO_PARA_DESPACHO',
      usuarioCierre: usuario.trim() || currentPacking.usuarioCierre,
    };
    const relatedTask = store.tasks.find(
      (item) => item.empresaId === companyId && item.pedidoId === currentPacking.pedidoId,
    ) ?? null;
    const nextStore: PickingPackingStore = {
      ...store,
      tasks: store.tasks.map((item) => ({ ...item })),
      details: store.details.map((item) => ({ ...item })),
      packings: store.packings.map((item) => (item.id === packingId ? nextPacking : { ...item })),
      alerts: [],
      productivity: [],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'dispatch-ready',
      companyId,
      nextPacking.id,
      nextPacking.pedidoId,
      'Packing marcado como listo para despacho.',
      this.sanitizePacking(currentPacking),
      this.sanitizePacking(nextPacking),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<PickingPackingMutationResult>({
      action: 'dispatch-ready',
      task: relatedTask ? { ...relatedTask } : null,
      packing: { ...nextPacking },
      message: 'Pedido marcado como listo para despacho.',
      auditDraft,
    }).pipe(delay(180));
  }

  private readStore(): PickingPackingStore {
    if (typeof window === 'undefined') {
      return createEmptyStore();
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const emptyStore = createEmptyStore();
      this.writeStore(emptyStore);
      return emptyStore;
    }

    try {
      const parsed = JSON.parse(raw) as PickingPackingStore;
      return {
        tasks: parsed.tasks ?? [],
        details: parsed.details ?? [],
        packings: parsed.packings ?? [],
        alerts: parsed.alerts ?? [],
        productivity: parsed.productivity ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const emptyStore = createEmptyStore();
      this.writeStore(emptyStore);
      return emptyStore;
    }
  }

  private writeStore(store: PickingPackingStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(
    store: PickingPackingStore,
    companyId: string,
    layoutStore: StorageLayoutStore,
  ): PickingPackingStore {
    if (store.tasks.some((item) => item.empresaId === companyId)) {
      return store;
    }

    const seeded = this.seedCompany(store, companyId, layoutStore);
    this.writeStore(seeded);
    return seeded;
  }

  private seedCompany(
    store: PickingPackingStore,
    companyId: string,
    layoutStore: StorageLayoutStore,
  ): PickingPackingStore {
    const clientsById = new Map(this.readCompanyClients(companyId).map((item) => [item.id, item]));
    const routesById = new Map(this.readCompanyRoutes(companyId).map((item) => [item.id, item]));
    const lotsByCode = new Map(
      layoutStore.lots
        .filter((item) => item.empresaId === companyId)
        .map((item) => [item.lote, item]),
    );
    const seeds = this.buildSeedTasks(companyId);
    const tasks: PickingTask[] = [];
    const details: PickingDetail[] = [];
    const packings: Packing[] = [];

    seeds.forEach((seed, index) => {
      const client = clientsById.get(seed.clientId);
      const route = routesById.get(seed.routeId);

      if (!client || !route) {
        return;
      }

      const taskId = `pick-task-${companyId}-${index + 1}`;
      const taskDetails = seed.lines
        .map((line, lineIndex): PickingDetail | null => {
          const lot = lotsByCode.get(line.lot);

          if (!lot) {
            return null;
          }

          const location = layoutStore.locations.find((item) => item.id === lot.ubicacionId);

          return {
            id: `pick-detail-${companyId}-${index + 1}-${lineIndex + 1}`,
            tareaId: taskId,
            skuId: lot.skuId,
            sku: lot.sku,
            productoNombre: lot.productoNombre,
            ubicacionId: lot.ubicacionId,
            ubicacionCodigo: location?.codigo ?? lot.ubicacionId,
            loteId: lot.id,
            lote: lot.lote,
            cantidadSolicitada: line.requested,
            cantidadConfirmada: line.confirmed,
            stockDisponible: lot.stockSistema,
            reservationId: null,
            tieneFaltante: line.state === 'FALTANTE' || line.state === 'BLOQUEADO' || line.confirmed < line.requested,
            observacion: line.observation ?? null,
            estado: line.state,
          } satisfies PickingDetail;
        })
        .filter((item): item is PickingDetail => !!item);

      const baseTask: PickingTask = {
        id: taskId,
        empresaId: companyId,
        pedidoId: seed.pedidoId,
        clienteId: client.id,
        clienteNombre: client.nombre,
        rutaId: route.id,
        rutaNombre: route.nombreRuta,
        conductorId: route.conductorId,
        conductorNombre: route.conductorNombre,
        zona: route.zona,
        operarioNombre: seed.operator,
        prioridad: seed.priority,
        estado: seed.state,
        fechaAsignacion: seed.assignedAt,
        fechaCompromiso: seed.dueAt,
        fechaInicio: seed.startedAt,
        fechaCierre: seed.closedAt,
        lineasTotales: taskDetails.length,
        lineasConfirmadas: 0,
        lineasConFaltante: 0,
      };
      const nextTask = this.rebuildTask(baseTask, taskDetails);
      tasks.push(nextTask);
      details.push(...taskDetails);

      if (seed.packing) {
        packings.push({
          id: `packing-${companyId}-${slugify(seed.pedidoId)}`,
          empresaId: companyId,
          pedidoId: seed.pedidoId,
          tipoEmpaque: seed.packing.type,
          pesoTotal: seed.packing.weight,
          volumenTotal: seed.packing.volume,
          fechaCierre: seed.packing.closedAt,
          usuarioCierre: seed.packing.user,
          estado: seed.packing.state,
          packingListCodigo: seed.packing.closedAt ? `PL-${seed.pedidoId}` : null,
          packingListResumen: seed.packing.closedAt ? this.buildPackingListSummary(taskDetails) : [],
        });
      }
    });

    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      `seed-${companyId}`,
      'Seed Picking y Packing',
      'Carga inicial de pedidos mock, picking activo, faltantes y packing desk.',
      null,
      {
        tasks: tasks.length,
        details: details.length,
        packings: packings.length,
      },
    );

    return {
      ...store,
      tasks: [...tasks, ...store.tasks.map((item) => ({ ...item }))],
      details: [...details, ...store.details.map((item) => ({ ...item }))],
      packings: [...packings, ...store.packings.map((item) => ({ ...item }))],
      alerts: [],
      productivity: [],
      auditTrail: [auditDraft, ...store.auditTrail],
    };
  }

  private buildSeedTasks(companyId: string): SeedTask[] {
    if (companyId !== 'medussa-holding') {
      return [];
    }

    return [
      {
        pedidoId: 'PED-ARB-240420-001',
        clientId: 'cli-ret-002',
        routeId: 'route-master-norte-1',
        priority: 'ALTA',
        state: 'CON_FALTANTE',
        assignedAt: '2026-04-20T05:40:00-05:00',
        dueAt: '2026-04-20T11:30:00-05:00',
        operator: 'Luis Moreno',
        startedAt: '2026-04-20T06:05:00-05:00',
        closedAt: null,
        lines: [
          {
            lot: 'UHT-2404-A',
            requested: 180,
            confirmed: 140,
            state: 'FALTANTE',
            observation: 'Faltan 40 unidades por reposicion en frontal.',
          },
          {
            lot: 'CAN-0402',
            requested: 8,
            confirmed: 8,
            state: 'CONFIRMADO',
          },
        ],
      },
      {
        pedidoId: 'PED-ARB-240420-002',
        clientId: 'cli-ret-005',
        routeId: 'route-master-norte-2',
        priority: 'MEDIA',
        state: 'PENDIENTE',
        assignedAt: '2026-04-20T05:55:00-05:00',
        dueAt: '2026-04-20T12:10:00-05:00',
        operator: null,
        startedAt: null,
        closedAt: null,
        lines: [
          {
            lot: 'UHT-2404-B',
            requested: 220,
            confirmed: 0,
            state: 'PENDIENTE',
          },
          {
            lot: 'YOG-0420-FR',
            requested: 72,
            confirmed: 0,
            state: 'PENDIENTE',
          },
        ],
      },
      {
        pedidoId: 'PED-ARB-240420-003',
        clientId: 'cli-ret-001',
        routeId: 'route-master-sur-1',
        priority: 'ALTA',
        state: 'ALISTADO',
        assignedAt: '2026-04-20T05:30:00-05:00',
        dueAt: '2026-04-20T10:45:00-05:00',
        operator: 'Andrea Pardo',
        startedAt: '2026-04-20T05:50:00-05:00',
        closedAt: '2026-04-20T07:05:00-05:00',
        lines: [
          {
            lot: 'YOG-0420-FR',
            requested: 120,
            confirmed: 120,
            state: 'CONFIRMADO',
          },
          {
            lot: 'QUE-0416-C',
            requested: 24,
            confirmed: 24,
            state: 'CONFIRMADO',
          },
        ],
      },
      {
        pedidoId: 'PED-ARB-240419-004',
        clientId: 'cli-ret-004',
        routeId: 'route-master-sur-2',
        priority: 'BAJA',
        state: 'CERRADO',
        assignedAt: '2026-04-19T13:30:00-05:00',
        dueAt: '2026-04-19T17:00:00-05:00',
        operator: 'Sergio Becerra',
        startedAt: '2026-04-19T14:00:00-05:00',
        closedAt: '2026-04-19T15:10:00-05:00',
        lines: [
          {
            lot: 'UHT-2404-A',
            requested: 96,
            confirmed: 96,
            state: 'CONFIRMADO',
          },
          {
            lot: 'CAN-0402',
            requested: 6,
            confirmed: 6,
            state: 'CONFIRMADO',
          },
        ],
        packing: {
          type: 'Caja',
          state: 'LISTO_PARA_DESPACHO',
          weight: 114,
          volume: 1.2,
          closedAt: '2026-04-19T15:40:00-05:00',
          user: 'demo.supervisor-despacho',
        },
      },
      {
        pedidoId: 'PED-ARB-240420-005',
        clientId: 'cli-hold-001',
        routeId: 'route-master-hold-001',
        priority: 'ALTA',
        state: 'PENDIENTE',
        assignedAt: '2026-04-20T05:20:00-05:00',
        dueAt: '2026-04-20T09:30:00-05:00',
        operator: null,
        startedAt: null,
        closedAt: null,
        lines: [
          {
            lot: 'UHT-2404-B',
            requested: 860,
            confirmed: 0,
            state: 'PENDIENTE',
            observation: 'Pedido institucional con demanda superior al frontal disponible.',
          },
          {
            lot: 'QUE-0321-R',
            requested: 20,
            confirmed: 0,
            state: 'BLOQUEADO',
            observation: 'Lote en cuarentena sanitaria, no apto para picking.',
          },
        ],
      },
      {
        pedidoId: 'PED-ARB-240420-006',
        clientId: 'cli-ret-006',
        routeId: 'route-master-sur-3',
        priority: 'MEDIA',
        state: 'ALISTADO',
        assignedAt: '2026-04-20T06:00:00-05:00',
        dueAt: '2026-04-20T12:45:00-05:00',
        operator: 'Martha Ruiz',
        startedAt: '2026-04-20T06:20:00-05:00',
        closedAt: '2026-04-20T07:10:00-05:00',
        lines: [
          {
            lot: 'UHT-2404-B',
            requested: 160,
            confirmed: 160,
            state: 'CONFIRMADO',
          },
          {
            lot: 'YOG-0420-FR',
            requested: 60,
            confirmed: 56,
            state: 'FALTANTE',
            observation: 'Se consolidan 56 und por control de cadena de frio.',
          },
        ],
      },
    ];
  }

  private hydrateCompany(
    companyId: string,
    store: PickingPackingStore,
    layoutStore: StorageLayoutStore,
  ): {
    tasks: PickingTask[];
    details: PickingDetail[];
    alerts: PickingAlert[];
    packings: Packing[];
    productivity: PickingProductivity[];
  } {
    const companyTasks = store.tasks
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }))
      .sort((left, right) => this.compareTasks(left, right));
    const companyDetails = store.details
      .filter((item) => companyTasks.some((task) => task.id === item.tareaId))
      .map((item) => ({ ...item }));
    const detailsByTask = new Map<string, PickingDetail[]>();

    companyDetails.forEach((detail) => {
      detailsByTask.set(detail.tareaId, [...(detailsByTask.get(detail.tareaId) ?? []), detail]);
    });

    const hydratedDetails = companyDetails.map((detail) => {
      const relatedTask = companyTasks.find((task) => task.id === detail.tareaId);
      const available = relatedTask
        ? this.resolveAvailableStock(companyId, store, layoutStore, detail, relatedTask)
        : 0;
      const location = layoutStore.locations.find((item) => item.id === detail.ubicacionId);
      const blocked = !location || location.estado !== 'ACTIVA';

      return {
        ...detail,
        stockDisponible: available,
        tieneFaltante: blocked || detail.cantidadConfirmada < detail.cantidadSolicitada,
        estado: this.resolveDetailState(detail.cantidadConfirmada, detail.cantidadSolicitada, blocked, detail.estado === 'PENDIENTE'),
      };
    });
    const hydratedDetailsByTask = new Map<string, PickingDetail[]>();

    hydratedDetails.forEach((detail) => {
      hydratedDetailsByTask.set(detail.tareaId, [...(hydratedDetailsByTask.get(detail.tareaId) ?? []), detail]);
    });

    const hydratedTasks = companyTasks.map((task) =>
      this.rebuildTask(task, hydratedDetailsByTask.get(task.id) ?? detailsByTask.get(task.id) ?? []),
    );
    const packings = store.packings
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }))
      .sort((left, right) => left.pedidoId.localeCompare(right.pedidoId, 'es-CO'));
    const alerts = this.buildAlerts(companyId, hydratedTasks, hydratedDetails, packings, layoutStore);
    const productivity = this.buildProductivity(companyId, hydratedTasks, hydratedDetails);

    return {
      tasks: hydratedTasks,
      details: hydratedDetails,
      alerts,
      packings,
      productivity,
    };
  }

  private buildCatalogs(companyId: string): PickingPackingDashboard['catalogs'] {
    const routes = this.readCompanyRoutes(companyId)
      .filter((item) => item.estado === 'ACTIVO')
      .sort((left, right) => left.nombreRuta.localeCompare(right.nombreRuta, 'es-CO'));
    const clients = this.readCompanyClients(companyId)
      .filter((item) => item.estado === 'ACTIVO')
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const zones = Array.from(new Set(routes.map((item) => item.zona))).sort((left, right) =>
      left.localeCompare(right, 'es-CO'),
    );

    return {
      routes: routes.map((item) => ({ value: item.id, label: `${item.idRuta} · ${item.nombreRuta}` })),
      clients: clients.map((item) => ({ value: item.id, label: `${item.idCliente} · ${item.nombre}` })),
      priorities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
      states: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'EN_PROCESO', label: 'En proceso' },
        { value: 'CON_FALTANTE', label: 'Con faltante' },
        { value: 'ALISTADO', label: 'Alistado' },
        { value: 'CERRADO', label: 'Cerrado' },
      ],
      operators: OPERATOR_CATALOG.map((item) => ({ value: item, label: item })),
      zones: zones.map((item) => ({ value: item, label: item })),
      packageTypes: [
        { value: 'Caja', label: 'Caja' },
        { value: 'Canastilla', label: 'Canastilla' },
        { value: 'Bolsa', label: 'Bolsa' },
        { value: 'Mixto', label: 'Mixto' },
      ],
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private buildAlerts(
    companyId: string,
    tasks: PickingTask[],
    details: PickingDetail[],
    packings: Packing[],
    layoutStore: StorageLayoutStore,
  ): PickingAlert[] {
    const alerts: PickingAlert[] = [];
    const packingsByOrder = new Map(packings.map((item) => [item.pedidoId, item]));
    const detailsByTask = new Map<string, PickingDetail[]>();

    details.forEach((detail) => {
      detailsByTask.set(detail.tareaId, [...(detailsByTask.get(detail.tareaId) ?? []), detail]);
    });

    tasks.forEach((task) => {
      const taskDetails = detailsByTask.get(task.id) ?? [];
      const hasBlocked = taskDetails.some((detail) => detail.estado === 'BLOQUEADO');
      const hasShortage = taskDetails.some((detail) => detail.tieneFaltante);

      taskDetails.forEach((detail) => {
        const location = layoutStore.locations.find((item) => item.id === detail.ubicacionId);

        if (!location || location.estado !== 'ACTIVA') {
          alerts.push(
            this.createAlert(
              companyId,
              task.pedidoId,
              'UBICACION_INVALIDA',
              'ALTA',
              `${detail.ubicacionCodigo} no esta disponible para picking del SKU ${detail.sku}.`,
            ),
          );
        }

        if (detail.cantidadSolicitada > detail.stockDisponible) {
          alerts.push(
            this.createAlert(
              companyId,
              task.pedidoId,
              'SKU_SIN_STOCK',
              detail.stockDisponible === 0 ? 'ALTA' : 'MEDIA',
              `${detail.sku} solicita ${detail.cantidadSolicitada} y solo dispone de ${detail.stockDisponible}.`,
            ),
          );
        }
      });

      if (hasShortage && task.estado !== 'CERRADO') {
        alerts.push(
          this.createAlert(
            companyId,
            task.pedidoId,
            'PICKING_INCOMPLETO',
            task.estado === 'ALISTADO' ? 'MEDIA' : 'ALTA',
            `El pedido tiene ${task.lineasConFaltante} linea(s) con faltante o restriccion operativa.`,
          ),
        );
      }

      if (hasBlocked) {
        alerts.push(
          this.createAlert(
            companyId,
            task.pedidoId,
            'PEDIDO_BLOQUEADO',
            'ALTA',
            'El pedido combina lineas en cuarentena o ubicaciones fuera de servicio.',
          ),
        );
      }

      if (task.estado === 'ALISTADO') {
        const packing = packingsByOrder.get(task.pedidoId);

        if (!packing || packing.estado === 'PENDIENTE' || packing.estado === 'EMPACANDO') {
          alerts.push(
            this.createAlert(
              companyId,
              task.pedidoId,
              'PACKING_PENDIENTE',
              task.lineasConFaltante > 0 ? 'MEDIA' : 'BAJA',
              'El pedido ya esta alistado y espera paso por packing desk.',
            ),
          );
        }
      }
    });

    return this.deduplicateAlerts(alerts).sort((left, right) => this.compareSeverity(right.severidad, left.severidad));
  }

  private buildProductivity(
    companyId: string,
    tasks: PickingTask[],
    details: PickingDetail[],
  ): PickingProductivity[] {
    const detailsByTask = new Map<string, PickingDetail[]>();

    details.forEach((detail) => {
      detailsByTask.set(detail.tareaId, [...(detailsByTask.get(detail.tareaId) ?? []), detail]);
    });

    const tasksByOperator = new Map<string, PickingTask[]>();

    tasks
      .filter((task) => !!task.operarioNombre && (task.estado === 'ALISTADO' || task.estado === 'CERRADO'))
      .forEach((task) => {
        const operator = task.operarioNombre ?? 'Sin asignar';
        tasksByOperator.set(operator, [...(tasksByOperator.get(operator) ?? []), task]);
      });

    return Array.from(tasksByOperator.entries())
      .map(([operario, operatorTasks]) => {
        const lineasPreparadas = operatorTasks.reduce((sum, task) => {
          const taskDetails = detailsByTask.get(task.id) ?? [];
          return sum + taskDetails.filter((detail) => detail.cantidadConfirmada > 0).length;
        }, 0);
        const tiempoTotal = operatorTasks.reduce((sum, task) => {
          if (!task.fechaInicio || !task.fechaCierre) {
            return sum;
          }

          return sum + Math.max(10, Math.round((Date.parse(task.fechaCierre) - Date.parse(task.fechaInicio)) / 60000));
        }, 0);
        const otifInterno = operatorTasks.length
          ? Math.round(
              (operatorTasks.filter(
                (task) =>
                  !!task.fechaCierre &&
                  Date.parse(task.fechaCierre) <= Date.parse(task.fechaCompromiso) &&
                  task.lineasConFaltante === 0,
              ).length /
                operatorTasks.length) *
                100,
            )
          : 0;

        return {
          id: `productivity-${companyId}-${slugify(operario)}`,
          empresaId: companyId,
          operario,
          fechaOperacion: new Date().toISOString().slice(0, 10),
          pedidosPreparados: operatorTasks.length,
          lineasPreparadas,
          tiempoTotal,
          otifInterno,
          lineasPorHora: tiempoTotal ? Number(((lineasPreparadas / tiempoTotal) * 60).toFixed(1)) : lineasPreparadas,
        } satisfies PickingProductivity;
      })
      .sort((left, right) => right.lineasPorHora - left.lineasPorHora);
  }

  private buildKpis(
    tasks: PickingTask[],
    alerts: PickingAlert[],
    productivity: PickingProductivity[],
  ): PickingPackingKpis {
    const closedOrReady = tasks.filter((task) => task.estado === 'ALISTADO' || task.estado === 'CERRADO');
    const averagePreparationMinutes = closedOrReady.length
      ? Math.round(
          closedOrReady.reduce((sum, task) => {
            if (!task.fechaInicio || !task.fechaCierre) {
              return sum;
            }

            return sum + Math.max(10, Math.round((Date.parse(task.fechaCierre) - Date.parse(task.fechaInicio)) / 60000));
          }, 0) / closedOrReady.length,
        )
      : 0;
    const topOperator = productivity[0] ?? null;

    return {
      pendingOrders: tasks.filter((task) => task.estado === 'PENDIENTE' || task.estado === 'EN_PROCESO').length,
      readyOrders: tasks.filter((task) => task.estado === 'ALISTADO').length,
      shortageOrders: tasks.filter((task) => task.lineasConFaltante > 0 && task.estado !== 'CERRADO').length,
      otifPreparationPct: closedOrReady.length
        ? Math.round(
            (closedOrReady.filter(
              (task) =>
                !!task.fechaCierre &&
                Date.parse(task.fechaCierre) <= Date.parse(task.fechaCompromiso) &&
                task.lineasConFaltante === 0,
            ).length /
              closedOrReady.length) *
              100,
          )
        : 0,
      topOperatorName: topOperator?.operario ?? 'Sin datos',
      topOperatorLinesPerHour: topOperator?.lineasPorHora ?? 0,
      averagePreparationMinutes,
    };
  }

  private buildPackingListSummary(details: PickingDetail[]): string[] {
    return details
      .filter((detail) => detail.cantidadConfirmada > 0)
      .map(
        (detail) =>
          `${detail.sku} · ${detail.cantidadConfirmada} und · Lote ${detail.lote} · Ubicacion ${detail.ubicacionCodigo}`,
      );
  }

  private reserveConfirmedPickingLines(
    companyId: string,
    task: PickingTask,
    details: PickingDetail[],
    layoutStore: StorageLayoutStore,
    usuario: string,
  ): { details: PickingDetail[]; error: string | null } {
    const nextDetails = details.map((item) => ({ ...item }));
    const currentDetailIds = new Set(nextDetails.map((item) => item.id));
    const baseStore = this.readStore();
    const availabilityStore: PickingPackingStore = {
      ...baseStore,
      details: [
        ...baseStore.details.filter((item) => !currentDetailIds.has(item.id)).map((item) => ({ ...item })),
        ...nextDetails,
      ],
    };

    for (const detail of nextDetails.filter((item) => item.cantidadConfirmada > 0)) {
      const available = this.resolveAvailableStock(
        companyId,
        availabilityStore,
        layoutStore,
        detail,
        task,
      );

      if (detail.cantidadConfirmada > available) {
        return {
          details: nextDetails,
          error: `La linea ${detail.sku} supera el stock disponible para reservar (${available} unidades).`,
        };
      }

      const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === detail.loteId) ?? null;

      if (!lot) {
        return { details: nextDetails, error: 'Uno de los lotes del pedido ya no existe en el layout.' };
      }

      const existing = this.findActiveReservationForDetail(companyId, detail, task);
      let reservation = existing;

      if (!reservation) {
        let error: string | null = null;
        this.inventoryCore.reserveStock(companyId, {
          productoId: detail.skuId,
          sku: detail.sku,
          productoNombre: detail.productoNombre,
          bodegaId: lot.bodegaId,
          ubicacionId: detail.ubicacionId,
          loteId: detail.loteId,
          lote: detail.lote,
          cantidad: detail.cantidadConfirmada,
          documentoOrigen: task.pedidoId,
          moduloOrigen: 'PICKING_PACKING',
          usuarioId: usuario,
          observacion: `Reserva por cierre de picking ${task.pedidoId}.`,
          origenTipo: 'PICKING',
          origenId: task.pedidoId,
        }).subscribe({
          error: (cause: unknown) => (error = cause instanceof Error ? cause.message : 'No fue posible reservar stock.'),
        });

        if (error) {
          return { details: nextDetails, error };
        }

        reservation = this.findActiveReservationForDetail(companyId, detail, task);
      }

      detail.reservationId = reservation?.id ?? detail.reservationId ?? null;
    }

    return { details: nextDetails, error: null };
  }

  private issueConfirmedPackingLines(
    companyId: string,
    task: PickingTask,
    details: PickingDetail[],
    layoutStore: StorageLayoutStore,
    usuario: string,
  ): string | null {
    for (const detail of details.filter((item) => item.cantidadConfirmada > 0)) {
      const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === detail.loteId) ?? null;

      if (!lot) {
        return 'Uno de los lotes del pedido ya no existe en el layout.';
      }

      if (!this.canPickLot(companyId, detail.loteId)) {
        return `El lote ${detail.lote} esta bloqueado, retenido, en cuarentena o rechazado.`;
      }

      let reservation = this.findActiveReservationForDetail(companyId, detail, task);

      if (!reservation) {
        const reservationResult = this.reserveConfirmedPickingLines(companyId, task, [detail], layoutStore, usuario);

        if (reservationResult.error) {
          return reservationResult.error;
        }

        reservation = this.findActiveReservationForDetail(companyId, reservationResult.details[0], task);
      }

      let issueError: string | null = null;
      this.inventoryCore.issueStock(companyId, {
        productoId: detail.skuId,
        sku: detail.sku,
        productoNombre: detail.productoNombre,
        bodegaId: lot.bodegaId,
        ubicacionId: detail.ubicacionId,
        loteId: detail.loteId,
        lote: detail.lote,
        cantidad: detail.cantidadConfirmada,
        documentoOrigen: task.pedidoId,
        moduloOrigen: 'PICKING_PACKING',
        usuarioId: usuario,
        observacion: `Despacho por cierre de packing ${task.pedidoId}.`,
        reservationId: reservation?.id ?? detail.reservationId ?? null,
        origenTipo: 'PICKING',
        origenId: task.pedidoId,
      }).subscribe({
        error: (cause: unknown) => (issueError = cause instanceof Error ? cause.message : 'No fue posible despachar stock.'),
      });

      if (issueError) {
        return issueError;
      }

      if (reservation) {
        let releaseError: string | null = null;
        this.inventoryCore.releaseReservation(companyId, {
          reservationId: reservation.id,
          usuarioId: usuario,
          documentoOrigen: task.pedidoId,
          moduloOrigen: 'PICKING_PACKING',
          estadoFinal: 'CONSUMIDA',
          registrarMovimiento: false,
          observacion: `Reserva consumida por packing ${task.pedidoId}.`,
        }).subscribe({
          error: (cause: unknown) => (releaseError = cause instanceof Error ? cause.message : 'No fue posible consumir la reserva.'),
        });

        if (releaseError) {
          return releaseError;
        }
      }
    }

    return null;
  }

  private resolveAvailableStock(
    companyId: string,
    store: PickingPackingStore,
    layoutStore: StorageLayoutStore,
    detail: PickingDetail,
    task: PickingTask,
  ): number {
    const lot = layoutStore.lots.find((item) => item.id === detail.loteId);
    const location = layoutStore.locations.find((item) => item.id === detail.ubicacionId);

    if (!lot || !location || location.estado !== 'ACTIVA' || !this.canPickLot(companyId, detail.loteId)) {
      return 0;
    }

    const balance = this.findInventoryBalance(companyId, layoutStore, detail);
    const centralStock = balance?.cantidadDisponible ?? lot.stockSistema;
    const centralReservedByOthers = balance ? this.sumCentralReservedByOthers(companyId, balance, task, detail) : 0;
    const localConfirmedByOthers = store.details.reduce((sum, item) => {
      if (item.loteId !== detail.loteId || item.id === detail.id) {
        return sum;
      }

      const relatedTask = store.tasks.find((task) => task.id === item.tareaId);

      if (!relatedTask || relatedTask.estado === 'CERRADO' || relatedTask.estado === 'ALISTADO') {
        return sum;
      }

      return sum + item.cantidadConfirmada;
    }, 0);

    return Math.max(0, centralStock - centralReservedByOthers - localConfirmedByOthers);
  }

  private findInventoryBalance(
    companyId: string,
    layoutStore: StorageLayoutStore,
    detail: PickingDetail,
  ): InventoryBalance | null {
    const lot = layoutStore.lots.find((item) => item.id === detail.loteId) ?? null;

    return projectStorageLayoutLotsToBalances(companyId, layoutStore.lots).find(
      (item) =>
        item.empresaId === companyId &&
        item.productoId === detail.skuId &&
        item.bodegaId === lot?.bodegaId &&
        item.ubicacionId === detail.ubicacionId &&
        item.loteId === detail.loteId,
    ) ?? null;
  }

  private sumCentralReservedByOthers(
    companyId: string,
    balance: InventoryBalance,
    task: PickingTask,
    detail: PickingDetail,
  ): number {
    return readInventoryCoreStore().reservations
      .filter((item) => item.empresaId === companyId && item.estado === 'ACTIVA')
      .filter((item) => item.productoId === balance.productoId && item.bodegaId === balance.bodegaId)
      .filter((item) => item.loteId === (balance.loteId ?? 'SIN_LOTE'))
      .filter((item) => item.id !== detail.reservationId)
      .filter((item) => !(item.origenTipo === 'PICKING' && (item.origenId === task.pedidoId || item.origenId === task.id)))
      .reduce((sum, item) => sum + item.cantidad, 0);
  }

  private findActiveReservationForDetail(
    companyId: string,
    detail: PickingDetail,
    task: PickingTask,
  ): InventoryReservation | null {
    const reservations = readInventoryCoreStore().reservations.filter(
      (item) => item.empresaId === companyId && item.estado === 'ACTIVA',
    );

    return (
      reservations.find((item) => item.id === detail.reservationId) ??
      reservations.find(
        (item) =>
          item.productoId === detail.skuId &&
          item.loteId === detail.loteId &&
          item.origenTipo === 'PICKING' &&
          item.origenId === task.pedidoId,
      ) ??
      null
    );
  }

  private canPickLot(companyId: string, lotId: string): boolean {
    const coreLot = readInventoryCoreStore().lots.find((item) => item.empresaId === companyId && item.id === lotId) ?? null;

    if (coreLot) {
      return coreLot.estado === 'LIBERADO';
    }

    const layoutLot = ensureStorageLayoutBaseline(companyId).lots.find((item) => item.id === lotId) ?? null;
    return layoutLot?.estado === 'ACTIVO' || layoutLot?.estado === 'PROXIMO_VENCER';
  }

  private rebuildTask(task: PickingTask, details: PickingDetail[]): PickingTask {
    const lineasConfirmadas = details.filter((detail) => detail.cantidadConfirmada > 0).length;
    const lineasConFaltante = details.filter((detail) => detail.tieneFaltante).length;
    let estado = task.estado;

    if (task.estado !== 'ALISTADO' && task.estado !== 'CERRADO') {
      if (task.fechaInicio && lineasConFaltante > 0) {
        estado = 'CON_FALTANTE';
      } else if (task.fechaInicio) {
        estado = 'EN_PROCESO';
      } else {
        estado = 'PENDIENTE';
      }
    }

    return {
      ...task,
      estado,
      lineasTotales: details.length,
      lineasConfirmadas,
      lineasConFaltante,
    };
  }

  private replaceTask(store: PickingPackingStore, task: PickingTask): PickingPackingStore {
    return {
      ...store,
      tasks: store.tasks.map((item) => (item.id === task.id ? task : { ...item })),
      details: store.details.map((item) => ({ ...item })),
      packings: store.packings.map((item) => ({ ...item })),
      alerts: [],
      productivity: [],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
  }

  private createAlert(
    companyId: string,
    pedidoId: string,
    tipo: PickingAlertType,
    severidad: PickingAlertSeverity,
    descripcion: string,
  ): PickingAlert {
    return {
      id: `${tipo}-${pedidoId}-${slugify(descripcion)}`,
      empresaId: companyId,
      pedidoId,
      tipo,
      severidad,
      descripcion,
    };
  }

  private deduplicateAlerts(alerts: PickingAlert[]): PickingAlert[] {
    const unique = new Map<string, PickingAlert>();

    alerts.forEach((alert) => {
      unique.set(`${alert.pedidoId}-${alert.tipo}-${alert.descripcion}`, alert);
    });

    return Array.from(unique.values());
  }

  private normalizeFilters(filters: PickingFilters): PickingFilters {
    return {
      ...DEFAULT_PICKING_FILTERS,
      ...filters,
      rutaId: filters.rutaId ?? null,
      clienteId: filters.clienteId ?? null,
      operarioNombre: filters.operarioNombre ?? null,
      zona: filters.zona ?? null,
      fecha: filters.fecha ?? null,
      prioridad: filters.prioridad ?? 'TODAS',
      estado: filters.estado ?? 'TODOS',
      severidad: filters.severidad ?? 'TODAS',
    };
  }

  private matchesFilters(
    task: PickingTask,
    filters: PickingFilters,
    alertsByOrder: Record<string, PickingAlert[]>,
  ): boolean {
    const alerts = alertsByOrder[task.pedidoId] ?? [];

    return (
      (!filters.rutaId || task.rutaId === filters.rutaId) &&
      (!filters.clienteId || task.clienteId === filters.clienteId) &&
      (filters.prioridad === 'TODAS' || task.prioridad === filters.prioridad) &&
      (filters.estado === 'TODOS' || task.estado === filters.estado) &&
      (!filters.fecha || task.fechaCompromiso.slice(0, 10) === filters.fecha) &&
      (!filters.operarioNombre || task.operarioNombre === filters.operarioNombre) &&
      (!filters.zona || task.zona === filters.zona) &&
      (filters.severidad === 'TODAS' || alerts.some((alert) => alert.severidad === filters.severidad))
    );
  }

  private resolveDetailState(
    confirmed: number,
    requested: number,
    blocked: boolean,
    preservePending: boolean,
  ): PickingDetailState {
    if (blocked) {
      return 'BLOQUEADO';
    }

    if (preservePending && confirmed === 0) {
      return 'PENDIENTE';
    }

    if (confirmed === 0 && requested > 0) {
      return 'FALTANTE';
    }

    if (confirmed < requested) {
      return 'FALTANTE';
    }

    if (confirmed > 0) {
      return 'CONFIRMADO';
    }

    return 'PENDIENTE';
  }

  private compareTasks(left: PickingTask, right: PickingTask): number {
    const priorityWeight: Record<PickingTaskPriority, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    const priorityDiff = priorityWeight[right.prioridad] - priorityWeight[left.prioridad];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return Date.parse(left.fechaCompromiso) - Date.parse(right.fechaCompromiso);
  }

  private compareSeverity(left: PickingAlertSeverity, right: PickingAlertSeverity): number {
    const weight: Record<PickingAlertSeverity, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    return weight[left] - weight[right];
  }

  private readCompanyProducts(companyId: string): Product[] {
    return this.readProductsStore().products
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }));
  }

  private readCompanyClients(companyId: string): Client[] {
    return this.readClientsStore().clients
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }));
  }

  private readCompanyRoutes(companyId: string): Route[] {
    return this.readRoutesStore().routes
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }));
  }

  private readCompanyDrivers(companyId: string): Driver[] {
    return this.readDriversStore().drivers
      .filter((item) => item.empresaId === companyId)
      .map((item) => ({ ...item }));
  }

  private readProductsStore(): ProductStore {
    return readLocalStore(PRODUCTS_STORAGE_KEY, INITIAL_PRODUCTS_STORE);
  }

  private readClientsStore(): ClientStore {
    return readLocalStore(CLIENTS_STORAGE_KEY, INITIAL_CLIENTS_STORE);
  }

  private readRoutesStore(): RouteStore {
    return readLocalStore(ROUTES_STORAGE_KEY, INITIAL_ROUTES_STORE);
  }

  private readDriversStore(): DriverStore {
    return readLocalStore(DRIVERS_STORAGE_KEY, INITIAL_DRIVERS_STORE);
  }

  private buildAuditDraft(
    action: PickingPackingAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): PickingPackingAuditDraft {
    return {
      module: 'picking-packing',
      action,
      companyId,
      companyName: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      entityId,
      entityName,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeTask(task: PickingTask): Record<string, unknown> {
    return {
      id: task.id,
      pedidoId: task.pedidoId,
      clienteNombre: task.clienteNombre,
      rutaNombre: task.rutaNombre,
      operarioNombre: task.operarioNombre,
      estado: task.estado,
      lineasConfirmadas: task.lineasConfirmadas,
      lineasConFaltante: task.lineasConFaltante,
    };
  }

  private sanitizeDetail(detail: PickingDetail): Record<string, unknown> {
    return {
      id: detail.id,
      sku: detail.sku,
      lote: detail.lote,
      ubicacionCodigo: detail.ubicacionCodigo,
      cantidadSolicitada: detail.cantidadSolicitada,
      cantidadConfirmada: detail.cantidadConfirmada,
      estado: detail.estado,
      tieneFaltante: detail.tieneFaltante,
    };
  }

  private sanitizePacking(packing: Packing): Record<string, unknown> {
    return {
      id: packing.id,
      pedidoId: packing.pedidoId,
      tipoEmpaque: packing.tipoEmpaque,
      pesoTotal: packing.pesoTotal,
      volumenTotal: packing.volumenTotal,
      estado: packing.estado,
      packingListCodigo: packing.packingListCodigo,
    };
  }
}

function createEmptyStore(): PickingPackingStore {
  return {
    tasks: [],
    details: [],
    packings: [],
    alerts: [],
    productivity: [],
    auditTrail: [],
  };
}

function readLocalStore<TStore>(storageKey: string, fallback: TStore): TStore {
  if (typeof window === 'undefined') {
    return structuredCloneSafe(fallback);
  }

  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    return structuredCloneSafe(fallback);
  }

  try {
    return JSON.parse(raw) as TStore;
  } catch {
    return structuredCloneSafe(fallback);
  }
}

function structuredCloneSafe<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
