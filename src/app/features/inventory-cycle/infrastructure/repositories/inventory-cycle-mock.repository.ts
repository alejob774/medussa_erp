import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  ApproveInventoryAdjustmentPayload,
  InventoryCycleRepository,
  SaveInventoryCycleCountPayload,
} from '../../domain/repositories/inventory-cycle.repository';
import {
  DEFAULT_INVENTORY_CYCLE_FILTERS,
  InventoryCycleFilters,
} from '../../domain/models/inventory-cycle-filters.model';
import {
  InventoryCycleDashboard,
  InventoryCycleAuditDraft,
  InventoryCycleMutationResult,
  InventoryCycleRecurrenceItem,
  InventoryCycleStore,
} from '../../domain/models/inventory-cycle-response.model';
import { InventoryCycleCount } from '../../domain/models/inventory-cycle-count.model';
import { InventoryCycleAdjustment } from '../../domain/models/inventory-cycle-adjustment.model';
import { InventoryCycleAlert, InventoryCycleAlertSeverity } from '../../domain/models/inventory-cycle-alert.model';
import { InventoryCycleHistory } from '../../domain/models/inventory-cycle-history.model';
import { InventoryAccuracy } from '../../domain/models/inventory-accuracy.model';
import {
  StorageLayoutLot,
  StorageLayoutStore,
} from '../../../storage-layout/domain/models/storage-layout-response.model';
import {
  ensureStorageLayoutBaseline,
  updateStorageLayoutLotStock,
} from '../../../storage-layout/infrastructure/data/storage-layout-store.utils';

const STORAGE_KEY = 'medussa.erp.mock.inventory-cycle';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

@Injectable({
  providedIn: 'root',
})
export class InventoryCycleMockRepository implements InventoryCycleRepository {
  getDashboard(
    companyId: string,
    filters: InventoryCycleFilters,
  ): Observable<InventoryCycleDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const counts = store.counts
      .filter((item) => item.empresaId === companyId)
      .filter((item) => this.matchesFilters(item, normalizedFilters))
      .sort((left, right) => new Date(right.fechaConteo).getTime() - new Date(left.fechaConteo).getTime())
      .map((item) => ({ ...item }));
    const countIds = new Set(counts.map((item) => item.id));
    const adjustments = store.adjustments
      .filter((item) => item.empresaId === companyId && countIds.has(item.conteoId))
      .map((item) => ({ ...item }));
    const alerts = this.buildAlerts(companyId, store, layoutStore)
      .filter((item) => item.conteoId === null || countIds.has(item.conteoId))
      .filter((item) => normalizedFilters.severidad === 'TODAS' || item.severidad === normalizedFilters.severidad);
    const histories = store.histories
      .filter((item) => countIds.has(item.conteoId))
      .sort((left, right) => new Date(right.fechaEvento).getTime() - new Date(left.fechaEvento).getTime())
      .map((item) => ({ ...item }));
    const accuracies = this.buildAccuracies(companyId, counts);
    const recurrentLocations = this.buildRecurrence(counts, 'ubicacionId', layoutStore);
    const recurrentSkus = this.buildRecurrence(counts, 'skuId', layoutStore);
    const pendingAdjustments = adjustments.filter((item) => !item.aprobadoPor);

    return of({
      filters: normalizedFilters,
      catalogs: this.buildCatalogs(companyId, layoutStore),
      counts,
      adjustments,
      accuracies,
      alerts,
      histories,
      selectedCount: counts[0] ?? null,
      kpis: {
        totalCounts: counts.length,
        averageAccuracyPct: accuracies.length
          ? Math.round(accuracies.reduce((sum, item) => sum + item.exactitudPct, 0) / accuracies.length)
          : 0,
        criticalDifferences: alerts.filter((item) => item.tipoAlerta === 'DIFERENCIA_CRITICA').length,
        pendingAdjustments: pendingAdjustments.length,
        recurrentLocations: recurrentLocations.length,
        recurrentSkus: recurrentSkus.length,
      },
      pendingAdjustments,
      recurrentLocations,
      recurrentSkus,
    }).pipe(delay(180));
  }

  saveCount(
    companyId: string,
    payload: SaveInventoryCycleCountPayload,
    countId?: string,
  ): Observable<InventoryCycleMutationResult> {
    if (payload.conteoFisico < 0) {
      return throwError(() => new Error('El conteo fisico no puede ser negativo.'));
    }

    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const location = layoutStore.locations.find(
      (item) => item.empresaId === companyId && item.id === payload.ubicacionId,
    );
    const assignment = layoutStore.assignments.find(
      (item) =>
        item.empresaId === companyId &&
        item.ubicacionId === payload.ubicacionId &&
        item.skuId === payload.skuId,
    );
    const lot = layoutStore.lots.find(
      (item) =>
        item.empresaId === companyId &&
        item.id === payload.loteId &&
        item.ubicacionId === payload.ubicacionId &&
        item.skuId === payload.skuId,
    );

    if (!location) {
      return throwError(() => new Error('La ubicacion seleccionada no existe.'));
    }

    if (location.estado !== 'ACTIVA') {
      return throwError(() => new Error('La ubicacion no esta disponible para conteos ciclicos.'));
    }

    if (!assignment) {
      return throwError(() => new Error('El SKU no esta asignado a la ubicacion seleccionada.'));
    }

    if (!lot) {
      return throwError(() => new Error('El lote seleccionado no coincide con la ubicacion y SKU.'));
    }

    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const currentCount =
      store.counts.find((item) => item.empresaId === companyId && item.id === countId) ?? null;
    const difference = Math.round(payload.conteoFisico - lot.stockSistema);
    const status = difference === 0 ? 'REGISTRADO' : 'PENDIENTE_APROBACION';
    const now = new Date().toISOString();
    const nextCount: InventoryCycleCount = {
      id: currentCount?.id ?? `count-${companyId}-${Date.now()}-${payload.loteId}`,
      empresaId: companyId,
      bodegaId: payload.bodegaId,
      ubicacionId: payload.ubicacionId,
      skuId: payload.skuId,
      sku: payload.sku,
      productoNombre: payload.productoNombre,
      loteId: payload.loteId,
      lote: payload.lote,
      stockSistema: lot.stockSistema,
      conteoFisico: Math.round(payload.conteoFisico),
      diferencia: difference,
      usuarioConteo: payload.usuarioConteo,
      fechaConteo: currentCount?.fechaConteo ?? now,
      estado: status,
    };
    const nextAdjustment =
      difference === 0
        ? null
        : {
            id: currentCount
              ? store.adjustments.find((item) => item.conteoId === currentCount.id)?.id ??
                `adjustment-${nextCount.id}`
              : `adjustment-${nextCount.id}`,
            empresaId: companyId,
            conteoId: nextCount.id,
            tipoAjuste: difference > 0 ? 'ENTRADA' : 'SALIDA',
            cantidad: Math.abs(difference),
            motivo: payload.observacion?.trim() || 'Diferencia detectada en conteo ciclico',
            aprobadoPor: null,
            fechaAprobacion: null,
          } satisfies InventoryCycleAdjustment;
    const histories = currentCount
      ? store.histories.filter((item) => item.conteoId !== currentCount.id).map((item) => ({ ...item }))
      : store.histories.map((item) => ({ ...item }));
    histories.unshift(
      this.buildHistory(
        nextCount.id,
        currentCount ? 'ACTUALIZACION_CONTEO' : 'REGISTRO_CONTEO',
        payload.usuarioConteo,
        payload.observacion?.trim() || `Conteo registrado para ${payload.lote}.`,
        now,
      ),
    );

    if (difference !== 0) {
      histories.unshift(
        this.buildHistory(
          nextCount.id,
          'VALIDACION_DIFERENCIA',
          payload.usuarioConteo,
          `Diferencia de ${difference} unidades frente al sistema.`,
          now,
        ),
      );
    }

    const nextStore: InventoryCycleStore = {
      ...store,
      counts: currentCount
        ? store.counts.map((item) => (item.id === currentCount.id ? nextCount : { ...item }))
        : [nextCount, ...store.counts.map((item) => ({ ...item }))],
      adjustments: difference === 0
        ? store.adjustments.filter((item) => item.conteoId !== nextCount.id).map((item) => ({ ...item }))
        : currentCount
          ? store.adjustments.map((item) => (item.conteoId === nextCount.id ? nextAdjustment! : { ...item }))
          : [nextAdjustment!, ...store.adjustments.map((item) => ({ ...item }))],
      accuracies: [],
      alerts: [],
      histories,
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      currentCount ? 'count-edit' : 'count-create',
      companyId,
      nextCount.id,
      `${nextCount.sku} · ${nextCount.lote}`,
      currentCount ? 'Conteo ciclico actualizado.' : 'Conteo ciclico registrado.',
      currentCount ? this.sanitizeCount(currentCount) : null,
      this.sanitizeCount(nextCount),
    );

    writeInventoryStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<InventoryCycleMutationResult>({
      action: currentCount ? 'count-updated' : 'count-created',
      count: { ...nextCount },
      adjustment: nextAdjustment ? { ...nextAdjustment } : null,
      message:
        difference === 0
          ? 'Conteo registrado sin diferencias.'
          : 'Conteo registrado con diferencia y ajuste pendiente de aprobacion.',
      auditDraft,
    }).pipe(delay(220));
  }

  approveAdjustment(
    companyId: string,
    countId: string,
    payload: ApproveInventoryAdjustmentPayload,
  ): Observable<InventoryCycleMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const count = store.counts.find((item) => item.empresaId === companyId && item.id === countId) ?? null;
    const adjustment =
      store.adjustments.find((item) => item.empresaId === companyId && item.conteoId === countId) ?? null;

    if (!count || !adjustment) {
      return throwError(() => new Error('No se encontro el ajuste pendiente para ese conteo.'));
    }

    if (adjustment.aprobadoPor) {
      return throwError(() => new Error('Ese ajuste ya fue aprobado previamente.'));
    }

    const approvedAt = new Date().toISOString();
    const nextAdjustment: InventoryCycleAdjustment = {
      ...adjustment,
      motivo: payload.motivo.trim(),
      aprobadoPor: payload.aprobadoPor,
      fechaAprobacion: approvedAt,
    };
    const nextCount: InventoryCycleCount = {
      ...count,
      estado: 'AJUSTADO',
    };

    updateStorageLayoutLotStock(companyId, count.loteId, count.conteoFisico);

    const nextStore: InventoryCycleStore = {
      ...store,
      counts: store.counts.map((item) => (item.id === countId ? nextCount : { ...item })),
      adjustments: store.adjustments.map((item) =>
        item.conteoId === countId ? nextAdjustment : { ...item },
      ),
      accuracies: [],
      alerts: [],
      histories: [
        this.buildHistory(
          countId,
          'APROBACION_AJUSTE',
          payload.aprobadoPor,
          payload.observacion?.trim() || `Ajuste ${nextAdjustment.tipoAjuste} aprobado.`,
          approvedAt,
        ),
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'adjust-approve',
      companyId,
      countId,
      `${count.sku} · ${count.lote}`,
      'Ajuste de inventario aprobado y aplicado al lote del layout.',
      this.sanitizeCount(count),
      this.sanitizeCount(nextCount),
    );

    writeInventoryStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<InventoryCycleMutationResult>({
      action: 'adjustment-approved',
      count: { ...nextCount },
      adjustment: { ...nextAdjustment },
      message: 'Ajuste aprobado y stock del lote sincronizado con el layout.',
      auditDraft,
    }).pipe(delay(220));
  }

  closeCount(
    companyId: string,
    countId: string,
    usuario: string,
    observacion: string | null,
  ): Observable<InventoryCycleMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const count = store.counts.find((item) => item.empresaId === companyId && item.id === countId) ?? null;
    const adjustment =
      store.adjustments.find((item) => item.empresaId === companyId && item.conteoId === countId) ?? null;

    if (!count) {
      return throwError(() => new Error('No se encontro el conteo solicitado.'));
    }

    if (count.estado === 'PENDIENTE_APROBACION' || count.estado === 'CON_DIFERENCIA') {
      return throwError(() => new Error('Debes aprobar el ajuste antes de cerrar el conteo.'));
    }

    if (count.estado === 'CERRADO') {
      return throwError(() => new Error('Ese conteo ya fue cerrado.'));
    }

    const nextCount: InventoryCycleCount = {
      ...count,
      estado: 'CERRADO',
    };
    const closedAt = new Date().toISOString();
    const nextStore: InventoryCycleStore = {
      ...store,
      counts: store.counts.map((item) => (item.id === countId ? nextCount : { ...item })),
      adjustments: store.adjustments.map((item) => ({ ...item })),
      accuracies: [],
      alerts: [],
      histories: [
        this.buildHistory(
          countId,
          'CIERRE_CONTEO',
          usuario,
          observacion?.trim() || 'Conteo cerrado en SCM.',
          closedAt,
        ),
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'count-close',
      companyId,
      countId,
      `${count.sku} · ${count.lote}`,
      'Conteo cerrado correctamente.',
      this.sanitizeCount(count),
      this.sanitizeCount(nextCount),
    );

    writeInventoryStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<InventoryCycleMutationResult>({
      action: 'count-closed',
      count: { ...nextCount },
      adjustment: adjustment ? { ...adjustment } : null,
      message: 'Conteo cerrado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): InventoryCycleStore {
    if (typeof window === 'undefined') {
      return createEmptyStore();
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const emptyStore = createEmptyStore();
      writeInventoryStore(emptyStore);
      return emptyStore;
    }

    try {
      const parsed = JSON.parse(raw) as InventoryCycleStore;
      return {
        counts: parsed.counts ?? [],
        adjustments: parsed.adjustments ?? [],
        accuracies: parsed.accuracies ?? [],
        alerts: parsed.alerts ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const emptyStore = createEmptyStore();
      writeInventoryStore(emptyStore);
      return emptyStore;
    }
  }

  private ensureBaseline(
    store: InventoryCycleStore,
    companyId: string,
    layoutStore: StorageLayoutStore,
  ): InventoryCycleStore {
    const hasCompanyCounts = store.counts.some((item) => item.empresaId === companyId);

    if (hasCompanyCounts) {
      return store;
    }

    const seededStore = this.seedCompany(companyId, layoutStore, store);
    writeInventoryStore(seededStore);
    return seededStore;
  }

  private seedCompany(
    companyId: string,
    layoutStore: StorageLayoutStore,
    store: InventoryCycleStore,
  ): InventoryCycleStore {
    const lots = layoutStore.lots.filter((item) => item.empresaId === companyId);
    const locations = new Map(layoutStore.locations.map((item) => [item.id, item]));
    const seedDefinitions = this.buildSeedDefinitions(lots);
    const counts: InventoryCycleCount[] = [];
    const adjustments: InventoryCycleAdjustment[] = [];
    const histories: InventoryCycleHistory[] = [];

    seedDefinitions.forEach((seed, index) => {
      const lot = lots.find((item) => item.id === seed.lotId);

      if (!lot) {
        return;
      }

      const location = locations.get(lot.ubicacionId);
      const countId = `count-seed-${companyId}-${index + 1}`;
      const difference = seed.physical - seed.system;
      const count: InventoryCycleCount = {
        id: countId,
        empresaId: companyId,
        bodegaId: lot.bodegaId,
        ubicacionId: lot.ubicacionId,
        skuId: lot.skuId,
        sku: lot.sku,
        productoNombre: lot.productoNombre,
        loteId: lot.id,
        lote: lot.lote,
        stockSistema: seed.system,
        conteoFisico: seed.physical,
        diferencia: difference,
        usuarioConteo: seed.user,
        fechaConteo: seed.date,
        estado: seed.status,
      };
      counts.push(count);
      histories.push(
        this.buildHistory(
          countId,
          'REGISTRO_CONTEO',
          seed.user,
          `Conteo sobre ${location?.codigo ?? lot.ubicacionId}.`,
          seed.date,
        ),
      );

      if (difference !== 0) {
        histories.push(
          this.buildHistory(
            countId,
            'VALIDACION_DIFERENCIA',
            'demo.control-inventarios',
            `Se detecto diferencia de ${difference} unidades.`,
            seed.date,
          ),
        );

        const adjustment: InventoryCycleAdjustment = {
          id: `adjustment-${countId}`,
          empresaId: companyId,
          conteoId: countId,
          tipoAjuste: difference > 0 ? 'ENTRADA' : 'SALIDA',
          cantidad: Math.abs(difference),
          motivo: seed.reason,
          aprobadoPor: seed.approvedBy,
          fechaAprobacion: seed.approvedAt,
        };
        adjustments.push(adjustment);

        if (seed.approvedBy && seed.approvedAt) {
          histories.push(
            this.buildHistory(
              countId,
              'APROBACION_AJUSTE',
              seed.approvedBy,
              `Ajuste ${adjustment.tipoAjuste} aprobado por supervisor.`,
              seed.approvedAt,
            ),
          );
        }
      }

      if (seed.status === 'CERRADO') {
        histories.push(
          this.buildHistory(
            countId,
            'CIERRE_CONTEO',
            'demo.supervisor-bodega',
            'Conteo cerrado dentro del turno de control.',
            seed.closedAt ?? seed.date,
          ),
        );
      }
    });

    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      `inventory-cycle-${companyId}`,
      'Seed de conteos',
      'Seed inicial de conteos ciclicos y ajustes pendientes.',
      null,
      {
        counts: counts.length,
        adjustments: adjustments.length,
      },
    );

    return {
      ...store,
      counts: [...counts, ...store.counts.map((item) => ({ ...item }))],
      adjustments: [...adjustments, ...store.adjustments.map((item) => ({ ...item }))],
      histories: [...histories, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: [auditDraft, ...store.auditTrail],
    };
  }

  private buildSeedDefinitions(lots: StorageLayoutLot[]): Array<{
    lotId: string;
    system: number;
    physical: number;
    date: string;
    user: string;
    status: InventoryCycleCount['estado'];
    reason: string;
    approvedBy: string | null;
    approvedAt: string | null;
    closedAt: string | null;
  }> {
    const uht = lots.find((item) => item.lote === 'UHT-2404-A') ?? null;
    const yogurt = lots.find((item) => item.lote === 'YOG-0420-FR') ?? null;
    const cheese = lots.find((item) => item.lote === 'QUE-0321-R') ?? null;
    const powder = lots.find((item) => item.lote === 'LPE25-0407') ?? null;
    const doypack = lots.find((item) => item.lote === 'DP1-0409') ?? null;
    const canastilla = lots.find((item) => item.lote === 'CAN-0402') ?? null;
    const seeds: Array<{
      lotId: string;
      system: number;
      physical: number;
      date: string;
      user: string;
      status: InventoryCycleCount['estado'];
      reason: string;
      approvedBy: string | null;
      approvedAt: string | null;
      closedAt: string | null;
    }> = [];

    if (uht) {
      seeds.push({
        lotId: uht.id,
        system: uht.stockSistema,
        physical: uht.stockSistema,
        date: '2026-04-07T08:10:00-05:00',
        user: 'demo.aux-bodega',
        status: 'CERRADO',
        reason: 'Conteo sin novedad',
        approvedBy: null,
        approvedAt: null,
        closedAt: '2026-04-07T10:05:00-05:00',
      });
      seeds.push({
        lotId: uht.id,
        system: uht.stockSistema,
        physical: Math.max(0, uht.stockSistema - 18),
        date: '2026-04-14T08:18:00-05:00',
        user: 'demo.aux-bodega',
        status: 'AJUSTADO',
        reason: 'Faltante recurrente en picking frontal',
        approvedBy: 'demo.supervisor-bodega',
        approvedAt: '2026-04-14T11:45:00-05:00',
        closedAt: null,
      });
      seeds.push({
        lotId: uht.id,
        system: uht.stockSistema,
        physical: Math.max(0, uht.stockSistema - 12),
        date: '2026-04-19T08:12:00-05:00',
        user: 'demo.aux-bodega',
        status: 'PENDIENTE_APROBACION',
        reason: 'Nueva diferencia en la misma ubicacion de picking.',
        approvedBy: null,
        approvedAt: null,
        closedAt: null,
      });
    }

    if (yogurt) {
      seeds.push({
        lotId: yogurt.id,
        system: yogurt.stockSistema,
        physical: Math.max(0, yogurt.stockSistema - 22),
        date: '2026-04-18T06:55:00-05:00',
        user: 'demo.control-calidad',
        status: 'PENDIENTE_APROBACION',
        reason: 'Merma por rotacion acelerada y manipulacion en frio.',
        approvedBy: null,
        approvedAt: null,
        closedAt: null,
      });
    }

    if (cheese) {
      seeds.push({
        lotId: cheese.id,
        system: cheese.stockSistema,
        physical: Math.max(0, cheese.stockSistema - 8),
        date: '2026-04-17T09:00:00-05:00',
        user: 'demo.control-calidad',
        status: 'CON_DIFERENCIA',
        reason: 'Lote vencido identificado en cuarentena.',
        approvedBy: null,
        approvedAt: null,
        closedAt: null,
      });
    }

    if (powder) {
      seeds.push({
        lotId: powder.id,
        system: powder.stockSistema,
        physical: Math.max(0, powder.stockSistema - 1),
        date: '2026-04-11T13:20:00-05:00',
        user: 'demo.analista-scm',
        status: 'CERRADO',
        reason: 'Ajuste menor por unidad abierta',
        approvedBy: null,
        approvedAt: null,
        closedAt: '2026-04-11T15:10:00-05:00',
      });
    }

    if (doypack) {
      seeds.push({
        lotId: doypack.id,
        system: doypack.stockSistema,
        physical: doypack.stockSistema + 160,
        date: '2026-04-20T07:45:00-05:00',
        user: 'demo.aux-empaque',
        status: 'PENDIENTE_APROBACION',
        reason: 'Sobrante por consolidacion tardia de lotes de empaque.',
        approvedBy: null,
        approvedAt: null,
        closedAt: null,
      });
    }

    if (canastilla) {
      seeds.push({
        lotId: canastilla.id,
        system: canastilla.stockSistema,
        physical: canastilla.stockSistema,
        date: '2026-04-09T15:00:00-05:00',
        user: 'demo.logistica-ruta',
        status: 'REGISTRADO',
        reason: 'Validacion de despacho sin novedad.',
        approvedBy: null,
        approvedAt: null,
        closedAt: null,
      });
    }

    return seeds;
  }

  private buildCatalogs(companyId: string, layoutStore: StorageLayoutStore): InventoryCycleDashboard['catalogs'] {
    const warehouses = layoutStore.warehouses.filter((item) => item.empresaId === companyId);
    const locations = layoutStore.locations.filter((item) => item.empresaId === companyId);
    const lots = layoutStore.lots.filter((item) => item.empresaId === companyId);
    const assignments = layoutStore.assignments.filter((item) => item.empresaId === companyId);
    const skuMap = new Map(
      assignments.map((item) => [
        item.skuId,
        {
          value: item.sku,
          label: `${item.sku} · ${item.productoNombre}`,
          skuId: item.skuId,
          sku: item.sku,
          productName: item.productoNombre,
        },
      ]),
    );

    return {
      warehouses: warehouses.map((item) => ({ value: item.id, label: item.nombre })),
      locations: locations.map((item) => ({
        value: item.id,
        label: item.codigo,
        warehouseId: item.bodegaId,
      })),
      skus: Array.from(skuMap.values()).sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
      lots: lots.map((item) => ({
        value: item.id,
        label: `${item.lote} · ${item.sku}`,
        lotId: item.id,
        ubicacionId: item.ubicacionId,
        sku: item.sku,
      })),
      states: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'REGISTRADO', label: 'Registrado' },
        { value: 'CON_DIFERENCIA', label: 'Con diferencia' },
        { value: 'PENDIENTE_APROBACION', label: 'Pendiente aprobacion' },
        { value: 'AJUSTADO', label: 'Ajustado' },
        { value: 'CERRADO', label: 'Cerrado' },
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
    store: InventoryCycleStore,
    layoutStore: StorageLayoutStore,
  ): InventoryCycleAlert[] {
    const counts = store.counts.filter((item) => item.empresaId === companyId);
    const alerts: InventoryCycleAlert[] = [];
    const layoutAlertsByLocation = new Map(
      layoutStore.alerts
        .filter((item) => item.empresaId === companyId)
        .map((item) => [item.ubicacionId, item]),
    );
    const lotsById = new Map(
      layoutStore.lots.filter((item) => item.empresaId === companyId).map((item) => [item.id, item]),
    );
    const locationGroups = this.groupRecurrent(counts, 'ubicacionId');
    const skuGroups = this.groupRecurrent(counts, 'skuId');

    counts.forEach((count) => {
      if (Math.abs(count.diferencia) >= Math.max(8, Math.round(count.stockSistema * 0.04))) {
        alerts.push({
          id: `alert-diff-${count.id}`,
          empresaId: companyId,
          skuId: count.skuId,
          ubicacionId: count.ubicacionId,
          tipoAlerta: 'DIFERENCIA_CRITICA',
          severidad: Math.abs(count.diferencia) >= Math.max(15, Math.round(count.stockSistema * 0.08)) ? 'ALTA' : 'MEDIA',
          descripcion: `Conteo ${count.lote} reporta diferencia de ${count.diferencia} unidades.`,
          conteoId: count.id,
        });
      }

      if ((locationGroups.get(count.ubicacionId) ?? 0) >= 2) {
        alerts.push({
          id: `alert-loc-${count.id}`,
          empresaId: companyId,
          skuId: count.skuId,
          ubicacionId: count.ubicacionId,
          tipoAlerta: 'RECURRENCIA_UBICACION',
          severidad: (locationGroups.get(count.ubicacionId) ?? 0) >= 3 ? 'ALTA' : 'MEDIA',
          descripcion: `La ubicacion presenta diferencias repetidas y coincide con presion del layout.`,
          conteoId: count.id,
        });
      }

      if ((skuGroups.get(count.skuId) ?? 0) >= 2) {
        alerts.push({
          id: `alert-sku-${count.id}`,
          empresaId: companyId,
          skuId: count.skuId,
          ubicacionId: count.ubicacionId,
          tipoAlerta: 'RECURRENCIA_SKU',
          severidad: (skuGroups.get(count.skuId) ?? 0) >= 3 ? 'ALTA' : 'MEDIA',
          descripcion: `El SKU ${count.sku} acumula diferencias recurrentes en el periodo.`,
          conteoId: count.id,
        });
      }

      const lot = lotsById.get(count.loteId);

      if (lot?.estado === 'VENCIDO' || lot?.estado === 'PROXIMO_VENCER') {
        alerts.push({
          id: `alert-lot-${count.id}`,
          empresaId: companyId,
          skuId: count.skuId,
          ubicacionId: count.ubicacionId,
          tipoAlerta: 'LOTE_VENCIDO',
          severidad: lot.estado === 'VENCIDO' ? 'ALTA' : 'MEDIA',
          descripcion: `El lote ${count.lote} esta ${lot.estado === 'VENCIDO' ? 'vencido' : 'proximo a vencer'}.`,
          conteoId: count.id,
        });
      }

      if (layoutAlertsByLocation.has(count.ubicacionId) && Math.abs(count.diferencia) > 0) {
        alerts.push({
          id: `alert-layout-${count.id}`,
          empresaId: companyId,
          skuId: count.skuId,
          ubicacionId: count.ubicacionId,
          tipoAlerta: 'RECURRENCIA_UBICACION',
          severidad: 'MEDIA',
          descripcion: `La diferencia se asocia a una zona con alerta previa de layout u ocupacion.`,
          conteoId: count.id,
        });
      }
    });

    this.buildAccuracies(companyId, counts).forEach((accuracy) => {
      if (accuracy.exactitudPct < 97) {
        alerts.push({
          id: `alert-accuracy-${accuracy.id}`,
          empresaId: companyId,
          skuId: '',
          ubicacionId: '',
          tipoAlerta: 'BAJA_EXACTITUD',
          severidad: accuracy.exactitudPct < 94 ? 'ALTA' : 'MEDIA',
          descripcion: `La exactitud de ${accuracy.bodegaId} bajo a ${accuracy.exactitudPct}%.`,
          conteoId: null,
        });
      }
    });

    return alerts.sort((left, right) => this.compareSeverity(right.severidad, left.severidad));
  }

  private buildAccuracies(companyId: string, counts: InventoryCycleCount[]): InventoryAccuracy[] {
    const groups = new Map<string, InventoryCycleCount[]>();

    counts.forEach((count) => {
      groups.set(count.bodegaId, [...(groups.get(count.bodegaId) ?? []), count]);
    });

    return Array.from(groups.entries()).map(([bodegaId, warehouseCounts]) => {
      const totalBase = warehouseCounts.reduce((sum, item) => sum + Math.max(item.stockSistema, 1), 0);
      const totalDifference = warehouseCounts.reduce((sum, item) => sum + Math.abs(item.diferencia), 0);
      const exactitudPct = Math.max(82, Math.round((1 - totalDifference / Math.max(totalBase, 1)) * 100));

      return {
        id: `accuracy-${companyId}-${bodegaId}`,
        empresaId: companyId,
        periodo: new Date().toISOString().slice(0, 7),
        bodegaId,
        totalConteos: warehouseCounts.length,
        exactitudPct,
      };
    });
  }

  private buildRecurrence(
    counts: InventoryCycleCount[],
    field: 'ubicacionId' | 'skuId',
    layoutStore: StorageLayoutStore,
  ): InventoryCycleRecurrenceItem[] {
    const groups = this.groupRecurrent(counts, field);

    return Array.from(groups.entries())
      .filter(([, count]) => count >= 2)
      .map(([value, count]) => ({
        label:
          field === 'ubicacionId'
            ? layoutStore.locations.find((item) => item.id === value)?.codigo ?? value
            : counts.find((item) => item.skuId === value)?.sku ?? value,
        count,
        severity: (count >= 3 ? 'ALTA' : 'MEDIA') as InventoryCycleAlertSeverity,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }

  private groupRecurrent(
    counts: InventoryCycleCount[],
    field: 'ubicacionId' | 'skuId',
  ): Map<string, number> {
    const map = new Map<string, number>();

    counts
      .filter((count) => Math.abs(count.diferencia) > 0)
      .forEach((count) => {
        map.set(count[field], (map.get(count[field]) ?? 0) + 1);
      });

    return map;
  }

  private matchesFilters(count: InventoryCycleCount, filters: InventoryCycleFilters): boolean {
    return (
      (!filters.bodegaId || count.bodegaId === filters.bodegaId) &&
      (!filters.ubicacionId || count.ubicacionId === filters.ubicacionId) &&
      (!filters.sku || count.sku === filters.sku) &&
      (!filters.loteId || count.loteId === filters.loteId) &&
      (filters.estado === 'TODOS' || count.estado === filters.estado) &&
      count.fechaConteo.slice(0, 10) >= filters.fechaDesde &&
      count.fechaConteo.slice(0, 10) <= filters.fechaHasta
    );
  }

  private normalizeFilters(filters: InventoryCycleFilters): InventoryCycleFilters {
    return {
      ...DEFAULT_INVENTORY_CYCLE_FILTERS,
      ...filters,
      bodegaId: filters.bodegaId ?? null,
      ubicacionId: filters.ubicacionId ?? null,
      sku: filters.sku ?? null,
      loteId: filters.loteId ?? null,
      estado: filters.estado ?? 'TODOS',
      severidad: filters.severidad ?? 'TODAS',
    };
  }

  private buildHistory(
    conteoId: string,
    evento: string,
    usuarioId: string,
    observacion: string,
    fechaEvento: string,
  ): InventoryCycleHistory {
    return {
      id: `${conteoId}-${evento}-${Date.parse(fechaEvento)}`,
      conteoId,
      evento,
      usuarioId,
      fechaEvento,
      observacion,
    };
  }

  private buildAuditDraft(
    action: InventoryCycleAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ) {
    return {
      module: 'ciclo-inventarios' as const,
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

  private sanitizeCount(count: InventoryCycleCount): Record<string, unknown> {
    return {
      id: count.id,
      bodegaId: count.bodegaId,
      ubicacionId: count.ubicacionId,
      sku: count.sku,
      lote: count.lote,
      stockSistema: count.stockSistema,
      conteoFisico: count.conteoFisico,
      diferencia: count.diferencia,
      estado: count.estado,
    };
  }

  private compareSeverity(
    left: InventoryCycleAlertSeverity,
    right: InventoryCycleAlertSeverity,
  ): number {
    const weight: Record<InventoryCycleAlertSeverity, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    return weight[left] - weight[right];
  }
}

function createEmptyStore(): InventoryCycleStore {
  return {
    counts: [],
    adjustments: [],
    accuracies: [],
    alerts: [],
    histories: [],
    auditTrail: [],
  };
}

function writeInventoryStore(store: InventoryCycleStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
