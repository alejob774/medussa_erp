import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Equipment } from '../../../equipments/domain/models/equipment.model';
import { EquipmentStore } from '../../../equipments/domain/models/equipment-response.model';
import { INITIAL_EQUIPMENTS_STORE } from '../../../equipments/infrastructure/data/equipments.mock';
import { OeeRecord } from '../../../oee/domain/models/oee-record.model';
import { OeeStore } from '../../../oee/domain/models/oee-response.model';
import { TpmAlert, TpmAlertSeverity, TpmAlertType } from '../../domain/models/tpm-alert.model';
import { TpmAsset, TpmEquipmentState } from '../../domain/models/tpm-asset.model';
import { DEFAULT_TPM_FILTERS, TpmFilters } from '../../domain/models/tpm-filters.model';
import { TpmHistory } from '../../domain/models/tpm-history.model';
import { TpmKpis } from '../../domain/models/tpm-kpi.model';
import { TpmMaintenanceType, TpmPlan } from '../../domain/models/tpm-plan.model';
import { TpmSparePart, TpmSparePartCatalogItem } from '../../domain/models/tpm-spare-part.model';
import {
  EMPTY_TPM_DASHBOARD,
  TpmAssetAggregate,
  TpmAuditDraft,
  TpmCatalogs,
  TpmDashboard,
  TpmMutationResult,
  TpmStore,
} from '../../domain/models/tpm-response.model';
import { TpmWorkOrder, TpmWorkOrderState } from '../../domain/models/tpm-work-order.model';
import {
  CloseTpmWorkOrderPayload,
  SaveTpmAssetPayload,
  SaveTpmPlanPayload,
  SaveTpmSparePartPayload,
  SaveTpmWorkOrderPayload,
  TpmRepository,
} from '../../domain/repositories/tpm.repository';
import { TPM_SPARE_PARTS, TPM_TECHNICIANS, TPM_TYPE_LABELS } from '../data/tpm.mock';

const STORAGE_KEY = 'medussa.erp.mock.tpm';
const EQUIPMENTS_STORAGE_KEY = 'medussa.erp.mock.equipments';
const OEE_STORAGE_KEY = 'medussa.erp.mock.oee';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

@Injectable({
  providedIn: 'root',
})
export class TpmMockRepository implements TpmRepository {
  getDashboard(companyId: string, filters: TpmFilters): Observable<TpmDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.prepareStore(companyId);
    const catalogs = this.buildCatalogs(companyId, store);
    const assets = store.assets
      .filter((item) => item.empresaId === companyId)
      .filter((item) => this.matchesAssetFilters(item, normalizedFilters, store))
      .map((item) => this.buildAssetAggregate(item, store));
    const visibleAssetIds = new Set(assets.map((item) => item.asset.id));
    const workOrders = store.workOrders
      .filter((item) => this.belongsToCompany(store.assets, companyId, item.equipoId))
      .filter((item) => visibleAssetIds.has(item.equipoId) || normalizedFilters.equipoId === null)
      .filter((item) => this.matchesWorkOrderFilters(item, normalizedFilters, store))
      .sort((left, right) => new Date(right.fechaProgramada).getTime() - new Date(left.fechaProgramada).getTime())
      .map((item) => cloneWorkOrder(item));
    const alerts = store.alerts
      .filter((item) => visibleAssetIds.has(item.equipoId))
      .filter((item) => normalizedFilters.severidadAlerta === 'TODAS' || item.severidad === normalizedFilters.severidadAlerta)
      .sort((left, right) => compareSeverity(left.severidad, right.severidad))
      .map((item) => ({ ...item }));
    const histories = store.histories
      .filter((item) => visibleAssetIds.has(item.equipoId))
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
      .map((item) => ({ ...item }));
    const selectedAsset =
      assets.find((item) => item.alerts.some((alert) => alert.severidad === 'ALTA')) ?? assets[0] ?? null;
    const selectedWorkOrder =
      workOrders.find((item) => item.estado === 'VENCIDA') ??
      workOrders.find((item) => item.estado === 'EN_PROCESO') ??
      workOrders[0] ??
      null;

    return of({
      filters: normalizedFilters,
      catalogs,
      kpis: this.buildKpis(store, companyId),
      assets,
      plans: store.plans.filter((item) => this.belongsToCompany(store.assets, companyId, item.equipoId)).map((item) => ({ ...item })),
      workOrders,
      alerts,
      histories,
      selectedAsset,
      selectedWorkOrder,
    }).pipe(delay(180));
  }

  saveAsset(companyId: string, payload: SaveTpmAssetPayload, assetId?: string): Observable<TpmMutationResult> {
    let store = this.prepareStore(companyId);
    const current = assetId ? this.findAsset(store, companyId, assetId) : null;
    const equipment = this.readEquipments(companyId).find((item) => item.id === payload.equipoId) ?? null;
    const validation = this.validateAssetPayload(companyId, payload, equipment, current?.id);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    const oeeHours = this.resolveOeeHoursByEquipment(companyId).get(payload.equipoId) ?? 0;
    const nextAsset: TpmAsset = {
      id: current?.id ?? `tpm-asset-${payload.equipoId}`,
      empresaId: companyId,
      empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      equipoId: payload.equipoId,
      codigoEquipo: payload.codigoEquipo.trim(),
      nombreEquipo: payload.nombreEquipo.trim(),
      marca: payload.marca.trim(),
      modelo: payload.modelo.trim(),
      serie: payload.serie.trim(),
      ubicacion: payload.ubicacion.trim(),
      fechaInstalacion: payload.fechaInstalacion,
      horasUso: round(payload.horasUso),
      horasUsoBase: round(Math.max(0, payload.horasUso - oeeHours)),
      estadoEquipo: payload.estadoEquipo,
      fechaUltimoMantenimiento: payload.fechaUltimoMantenimiento,
      fechaProximoMantenimiento: payload.fechaProximoMantenimiento,
      notasTecnicas: payload.notasTecnicas?.trim() || null,
    };
    store = {
      ...store,
      assets: current
        ? store.assets.map((item) => (item.id === current.id ? nextAsset : { ...item }))
        : [nextAsset, ...store.assets.map((item) => ({ ...item }))],
    };
    const historyEntry = this.buildHistory(
      nextAsset.equipoId,
      current ? 'ACTUALIZACION_HOJA_VIDA' : 'REGISTRO_HOJA_VIDA',
      'demo.tpm',
      new Date().toISOString(),
      current ? 'Hoja de vida TPM actualizada.' : 'Hoja de vida TPM creada.',
    );
    store = {
      ...store,
      histories: [historyEntry, ...store.histories.map((item) => ({ ...item }))],
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'asset-edit' : 'asset-create',
      companyId,
      nextAsset.id,
      nextAsset.nombreEquipo,
      current ? 'Hoja de vida TPM actualizada.' : 'Hoja de vida TPM creada.',
      current ? this.sanitizeAsset(current) : null,
      this.sanitizeAsset(nextAsset),
    );
    this.writeStore({
      ...store,
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    });

    const prepared = this.prepareStore(companyId);
    return of<TpmMutationResult>({
      action: current ? 'asset-updated' : 'asset-created',
      asset: this.buildAssetAggregate(prepared.assets.find((item) => item.id === nextAsset.id) ?? nextAsset, prepared),
      workOrder: null,
      message: current ? 'Hoja de vida TPM actualizada correctamente.' : 'Hoja de vida TPM creada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  savePlan(companyId: string, payload: SaveTpmPlanPayload, planId?: string): Observable<TpmMutationResult> {
    let store = this.prepareStore(companyId);
    const current = planId ? this.findPlan(store, companyId, planId) : null;
    const asset = this.findAssetByEquipment(store, companyId, payload.equipoId);
    const validation = this.validatePlanPayload(companyId, payload, asset, current?.id);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    const nextPlan: TpmPlan = {
      id: current?.id ?? `tpm-plan-${payload.equipoId}-${slugify(payload.tipo)}-${Date.now()}`,
      empresaId: companyId,
      equipoId: payload.equipoId,
      tipo: payload.tipo,
      frecuenciaDias: payload.frecuenciaDias,
      frecuenciaHorasUso: payload.frecuenciaHorasUso,
      activo: payload.activo,
      tareasProgramadas: payload.tareasProgramadas.map((item) => item.trim()).filter(Boolean),
      tecnicoAsignado: payload.tecnicoAsignado.trim(),
      ultimoGeneradoEn: current?.ultimoGeneradoEn ?? null,
      proximoVencimiento: payload.proximoVencimiento,
      ultimaHoraGenerada: current?.ultimaHoraGenerada ?? asset?.horasUso ?? null,
    };
    store = {
      ...store,
      plans: current
        ? store.plans.map((item) => (item.id === current.id ? nextPlan : { ...item }))
        : [nextPlan, ...store.plans.map((item) => ({ ...item }))],
    };
    const historyEntry = this.buildHistory(
      payload.equipoId,
      current ? 'ACTUALIZACION_PLAN' : 'REGISTRO_PLAN',
      'demo.tpm',
      new Date().toISOString(),
      current ? `Plan ${payload.tipo} actualizado.` : `Plan ${payload.tipo} configurado.`,
    );
    store = {
      ...store,
      histories: [historyEntry, ...store.histories.map((item) => ({ ...item }))],
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'plan-edit' : 'plan-create',
      companyId,
      nextPlan.id,
      `${payload.tipo} - ${asset?.nombreEquipo ?? payload.equipoId}`,
      current ? 'Plan de mantenimiento actualizado.' : 'Plan de mantenimiento creado.',
      current ? this.sanitizePlan(current) : null,
      this.sanitizePlan(nextPlan),
    );
    this.writeStore({
      ...store,
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    });

    const prepared = this.prepareStore(companyId);
    const nextAsset = this.findAssetByEquipment(prepared, companyId, payload.equipoId);
    return of<TpmMutationResult>({
      action: current ? 'plan-updated' : 'plan-created',
      asset: nextAsset ? this.buildAssetAggregate(nextAsset, prepared) : null,
      workOrder: null,
      message: current ? 'Plan de mantenimiento actualizado correctamente.' : 'Plan de mantenimiento creado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  saveWorkOrder(
    companyId: string,
    payload: SaveTpmWorkOrderPayload,
    workOrderId?: string,
  ): Observable<TpmMutationResult> {
    let store = this.prepareStore(companyId);
    const current = workOrderId ? this.findWorkOrder(store, companyId, workOrderId) : null;
    const asset = this.findAssetByEquipment(store, companyId, payload.equipoId);
    const validation = this.validateWorkOrderPayload(companyId, payload, asset, current);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    const repuestos = this.buildSpareParts(current?.id ?? `tpm-wo-${Date.now()}`, payload.repuestosUsados);
    const nextWorkOrder: TpmWorkOrder = {
      id: current?.id ?? `tpm-wo-${payload.equipoId}-${Date.now()}`,
      empresaId: companyId,
      equipoId: payload.equipoId,
      planId: payload.planId,
      tipo: payload.tipo,
      fechaProgramada: payload.fechaProgramada,
      fechaInicio: payload.fechaInicio,
      fechaCierre: null,
      tecnico: payload.tecnico.trim(),
      estado: payload.estado,
      tiempoReparacion: round(payload.tiempoReparacion),
      costo: round(payload.costo),
      causaRaiz: payload.causaRaiz?.trim() || null,
      observaciones: payload.observaciones?.trim() || null,
      repuestosUsados: repuestos,
      generaBloqueo: payload.generaBloqueo,
      impactoOee: payload.impactoOee?.trim() || null,
    };

    store = {
      ...store,
      workOrders: current
        ? store.workOrders.map((item) => (item.id === current.id ? nextWorkOrder : cloneWorkOrder(item)))
        : [nextWorkOrder, ...store.workOrders.map((item) => cloneWorkOrder(item))],
    };
    const historyEntry = this.buildHistory(
      payload.equipoId,
      current ? 'ACTUALIZACION_OT' : 'REGISTRO_OT',
      payload.usuario.trim(),
      new Date().toISOString(),
      current ? `OT ${payload.tipo} actualizada.` : `OT ${payload.tipo} registrada.`,
    );
    store = {
      ...store,
      histories: [historyEntry, ...store.histories.map((item) => ({ ...item }))],
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'work-order-edit' : 'work-order-create',
      companyId,
      nextWorkOrder.id,
      `${payload.tipo} - ${asset?.nombreEquipo ?? payload.equipoId}`,
      current ? 'OT actualizada.' : 'OT creada.',
      current ? this.sanitizeWorkOrder(current) : null,
      this.sanitizeWorkOrder(nextWorkOrder),
    );
    this.writeStore({
      ...store,
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    });

    const prepared = this.prepareStore(companyId);
    return of<TpmMutationResult>({
      action: current ? 'work-order-updated' : 'work-order-created',
      asset: asset ? this.buildAssetAggregate(this.findAssetByEquipment(prepared, companyId, payload.equipoId) ?? asset, prepared) : null,
      workOrder: cloneWorkOrder(prepared.workOrders.find((item) => item.id === nextWorkOrder.id) ?? nextWorkOrder),
      message: current ? 'Orden de trabajo actualizada correctamente.' : 'Orden de trabajo creada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  closeWorkOrder(
    companyId: string,
    workOrderId: string,
    payload: CloseTpmWorkOrderPayload,
  ): Observable<TpmMutationResult> {
    let store = this.prepareStore(companyId);
    const current = this.findWorkOrder(store, companyId, workOrderId);

    if (!current) {
      return throwError(() => new Error('No se encontro la OT seleccionada.'));
    }

    if (current.estado === 'CERRADA' || current.estado === 'CANCELADA') {
      return throwError(() => new Error('La OT seleccionada ya no se puede editar libremente.'));
    }

    const asset = this.findAssetByEquipment(store, companyId, current.equipoId);
    const repuestos = this.buildSpareParts(current.id, payload.repuestosUsados);
    const nextWorkOrder: TpmWorkOrder = {
      ...current,
      estado: 'CERRADA',
      fechaCierre: payload.fechaCierre,
      tiempoReparacion: round(payload.tiempoReparacion),
      costo: round(payload.costo),
      causaRaiz: payload.causaRaiz?.trim() || current.causaRaiz,
      observaciones: payload.observaciones?.trim() || current.observaciones,
      repuestosUsados: repuestos,
    };
    let nextPlans = store.plans.map((item) => ({ ...item }));
    const relatedPlan = current.planId ? nextPlans.find((item) => item.id === current.planId) ?? null : null;
    const currentAsset = asset ? { ...asset } : null;

    if (relatedPlan && currentAsset) {
      const nextDueDate =
        relatedPlan.frecuenciaDias && relatedPlan.frecuenciaDias > 0
          ? addDays(payload.fechaCierre, relatedPlan.frecuenciaDias)
          : relatedPlan.proximoVencimiento;
      const nextDueHours =
        relatedPlan.frecuenciaHorasUso && relatedPlan.frecuenciaHorasUso > 0
          ? currentAsset.horasUso
          : relatedPlan.ultimaHoraGenerada;

      nextPlans = nextPlans.map((item) =>
        item.id === relatedPlan.id
          ? {
              ...item,
              ultimoGeneradoEn: payload.fechaCierre,
              proximoVencimiento: nextDueDate,
              ultimaHoraGenerada: nextDueHours,
            }
          : item,
      );
    }

    let nextAssets = store.assets.map((item) => ({ ...item }));
    if (currentAsset) {
      nextAssets = nextAssets.map((item) =>
        item.id === currentAsset.id
          ? {
              ...item,
              estadoEquipo: payload.estadoEquipoPosterior,
              fechaUltimoMantenimiento: payload.fechaCierre,
            }
          : item,
      );
    }

    store = {
      ...store,
      assets: nextAssets,
      plans: nextPlans,
      workOrders: store.workOrders.map((item) => (item.id === current.id ? nextWorkOrder : cloneWorkOrder(item))),
    };
    const historyEntry = this.buildHistory(
      current.equipoId,
      'CIERRE_OT',
      payload.usuario.trim(),
      payload.fechaCierre,
      `OT ${current.tipo} cerrada con estado tecnico ${payload.estadoEquipoPosterior}.`,
    );
    store = {
      ...store,
      histories: [historyEntry, ...store.histories.map((item) => ({ ...item }))],
    };
    const auditDraft = this.buildAuditDraft(
      'work-order-close',
      companyId,
      current.id,
      `${current.tipo} - ${asset?.nombreEquipo ?? current.equipoId}`,
      'OT cerrada y trazabilidad tecnica registrada.',
      this.sanitizeWorkOrder(current),
      this.sanitizeWorkOrder(nextWorkOrder),
    );
    this.writeStore({
      ...store,
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    });

    const prepared = this.prepareStore(companyId);
    return of<TpmMutationResult>({
      action: 'work-order-closed',
      asset: asset ? this.buildAssetAggregate(this.findAssetByEquipment(prepared, companyId, current.equipoId) ?? asset, prepared) : null,
      workOrder: cloneWorkOrder(prepared.workOrders.find((item) => item.id === current.id) ?? nextWorkOrder),
      message: 'Orden de trabajo cerrada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  private prepareStore(companyId: string): TpmStore {
    const baseline = this.ensureBaseline(this.readStore(), companyId);
    const synced = this.synchronizeStore(baseline, companyId);
    this.writeStore(synced);
    return synced;
  }

  private readStore(): TpmStore {
    if (typeof window === 'undefined') {
      return createEmptyStore();
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyStore();
    }

    try {
      const parsed = JSON.parse(raw) as TpmStore;
      return {
        assets: parsed.assets ?? [],
        plans: parsed.plans ?? [],
        workOrders: (parsed.workOrders ?? []).map((item) => cloneWorkOrder(item)),
        alerts: parsed.alerts ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return createEmptyStore();
    }
  }

  private writeStore(store: TpmStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(store: TpmStore, companyId: string): TpmStore {
    const equipments = this.readEquipments(companyId);
    const companyAssets = store.assets.filter((item) => item.empresaId === companyId);
    let nextStore = cloneStore(store);

    if (!companyAssets.length) {
      const seededAssets = equipments.map((item, index) => this.buildSeedAsset(companyId, item, index));
      const seededPlans = seededAssets.flatMap((item, index) => this.buildSeedPlans(companyId, item, index));
      const seededCorrective = seededAssets
        .filter((item) => normalize(item.codigoEquipo).includes('eq-ret-006'))
        .map((item) => this.buildSeedCorrective(companyId, item));
      const seededHistories = seededAssets.map((item) =>
        this.buildHistory(
          item.equipoId,
          'SEED_TPM',
          'demo.supervisor-tpm',
          new Date().toISOString(),
          `Seed inicial de hoja de vida TPM para ${item.nombreEquipo}.`,
        ),
      );
      const auditDraft = this.buildAuditDraft(
        'seed',
        companyId,
        `seed-${companyId}`,
        `Seed TPM ${companyId}`,
        'Carga inicial del modulo TPM en runtime local.',
        null,
        {
          assets: seededAssets.length,
          plans: seededPlans.length,
          workOrders: seededCorrective.length,
        },
      );
      nextStore = {
        assets: [...seededAssets, ...nextStore.assets],
        plans: [...seededPlans, ...nextStore.plans],
        workOrders: [...seededCorrective, ...nextStore.workOrders],
        alerts: nextStore.alerts,
        histories: [...seededHistories, ...nextStore.histories],
        auditTrail: [auditDraft, ...nextStore.auditTrail],
      };
    }

    const existingEquipmentIds = new Set(nextStore.assets.filter((item) => item.empresaId === companyId).map((item) => item.equipoId));
    const missingAssets = equipments
      .filter((item) => !existingEquipmentIds.has(item.id))
      .map((item, index) => this.buildSeedAsset(companyId, item, index + existingEquipmentIds.size));

    if (missingAssets.length) {
      nextStore = {
        ...nextStore,
        assets: [...missingAssets, ...nextStore.assets],
        plans: [
          ...missingAssets.flatMap((item, index) => this.buildSeedPlans(companyId, item, index + 20)),
          ...nextStore.plans,
        ],
      };
    }

    return nextStore;
  }

  private synchronizeStore(store: TpmStore, companyId: string): TpmStore {
    const equipments = this.readEquipments(companyId);
    const oeeHoursByEquipment = this.resolveOeeHoursByEquipment(companyId);
    let assets = store.assets.map((item) => ({ ...item }));
    let plans = store.plans.map((item) => ({ ...item }));
    let workOrders = store.workOrders.map((item) => this.normalizeWorkOrderState(cloneWorkOrder(item)));
    let histories = store.histories.map((item) => ({ ...item }));

    assets = assets.map((asset) => {
      if (asset.empresaId !== companyId) {
        return asset;
      }

      const equipment = equipments.find((item) => item.id === asset.equipoId) ?? null;
      const oeeHours = oeeHoursByEquipment.get(asset.equipoId) ?? 0;

      return {
        ...asset,
        codigoEquipo: equipment?.idEquipo ?? asset.codigoEquipo,
        nombreEquipo: equipment?.nombreEquipo ?? asset.nombreEquipo,
        ubicacion: equipment?.ubicacionOperativa ?? asset.ubicacion,
        horasUso: round(asset.horasUsoBase + oeeHours),
      };
    });

    const assetByEquipment = new Map(assets.filter((item) => item.empresaId === companyId).map((item) => [item.equipoId, item]));
    const openByPlan = new Map<string, TpmWorkOrder[]>();
    workOrders
      .filter((item) => item.empresaId === companyId && item.planId && !isClosedOrder(item.estado))
      .forEach((item) => {
        const current = openByPlan.get(item.planId!);
        openByPlan.set(item.planId!, current ? [...current, item] : [item]);
      });

    plans.forEach((plan) => {
      if (plan.empresaId !== companyId || !plan.activo) {
        return;
      }

      const asset = assetByEquipment.get(plan.equipoId);
      if (!asset) {
        return;
      }

      const dateDue = !!plan.proximoVencimiento && plan.proximoVencimiento <= todayDate();
      const hourReference = plan.ultimaHoraGenerada ?? asset.horasUsoBase;
      const hoursDue =
        !!plan.frecuenciaHorasUso &&
        plan.frecuenciaHorasUso > 0 &&
        asset.horasUso >= hourReference + plan.frecuenciaHorasUso;
      const hasOpenOt = (openByPlan.get(plan.id) ?? []).length > 0;

      if ((dateDue || hoursDue) && !hasOpenOt) {
        const nextOt = this.buildAutomaticWorkOrder(companyId, asset, plan, dateDue);
        workOrders = [nextOt, ...workOrders];
        histories = [
          this.buildHistory(
            asset.equipoId,
            'OT_AUTOGENERADA',
            'demo.supervisor-tpm',
            new Date().toISOString(),
            `OT ${plan.tipo} autogenerada por vencimiento ${dateDue ? 'de fecha' : 'de horas de uso'}.`,
          ),
          ...histories,
        ];
        plans = plans.map((item) =>
          item.id === plan.id
            ? {
                ...item,
                ultimoGeneradoEn: new Date().toISOString(),
              }
            : item,
        );
        const current = openByPlan.get(plan.id);
        openByPlan.set(plan.id, current ? [nextOt, ...current] : [nextOt]);
      }
    });

    const closedOrdersByEquipment = new Map<string, TpmWorkOrder[]>();
    workOrders
      .filter((item) => item.empresaId === companyId && item.estado === 'CERRADA')
      .forEach((item) => {
        const current = closedOrdersByEquipment.get(item.equipoId);
        closedOrdersByEquipment.set(item.equipoId, current ? [...current, item] : [item]);
      });

    assets = assets.map((asset) => {
      if (asset.empresaId !== companyId) {
        return asset;
      }

      const assetOrders = workOrders.filter((item) => item.empresaId === companyId && item.equipoId === asset.equipoId);
      const equipment = equipments.find((item) => item.id === asset.equipoId) ?? null;
      const currentPlans = plans.filter((item) => item.empresaId === companyId && item.equipoId === asset.equipoId && item.activo);
      const openOrders = assetOrders.filter((item) => !isClosedOrder(item.estado));
      const latestClosed = (closedOrdersByEquipment.get(asset.equipoId) ?? [])
        .filter((item) => !!item.fechaCierre)
        .sort((left, right) => new Date(right.fechaCierre!).getTime() - new Date(left.fechaCierre!).getTime())[0] ?? null;

      const nextState = this.resolveAssetState(asset, equipment, openOrders);
      const nextDueDate = currentPlans
        .map((item) => {
          if (item.proximoVencimiento) {
            return item.proximoVencimiento;
          }

          const hourReference = item.ultimaHoraGenerada ?? asset.horasUsoBase;
          if (item.frecuenciaHorasUso && asset.horasUso >= hourReference + item.frecuenciaHorasUso) {
            return todayDate();
          }

          return null;
        })
        .filter((item): item is string => !!item)
        .sort()[0] ?? null;

      return {
        ...asset,
        estadoEquipo: nextState,
        fechaUltimoMantenimiento: latestClosed?.fechaCierre ?? asset.fechaUltimoMantenimiento,
        fechaProximoMantenimiento: nextDueDate,
      };
    });

    const alerts = this.buildAlerts(companyId, assets, plans, workOrders);

    return {
      assets,
      plans,
      workOrders,
      alerts,
      histories,
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
  }

  private buildCatalogs(companyId: string, store: TpmStore): TpmCatalogs {
    const assets = store.assets.filter((item) => item.empresaId === companyId);
    const locations = Array.from(new Set(assets.map((item) => item.ubicacion).filter(Boolean)));
    return {
      maintenanceTypes: [
        { value: 'PREVENTIVO', label: 'Preventivo' },
        { value: 'CORRECTIVO', label: 'Correctivo' },
        { value: 'PREDICTIVO', label: 'Predictivo' },
        { value: 'SANITARIO', label: 'Sanitario' },
        { value: 'CALIBRACION', label: 'Calibracion' },
      ],
      equipmentStates: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'OPERATIVO', label: 'Operativo' },
        { value: 'DETENIDO', label: 'Detenido' },
        { value: 'EN_MANTENIMIENTO', label: 'En mantenimiento' },
        { value: 'BLOQUEADO', label: 'Bloqueado' },
      ],
      workOrderStates: [
        { value: 'TODOS', label: 'Todas' },
        { value: 'PROGRAMADA', label: 'Programada' },
        { value: 'EN_PROCESO', label: 'En proceso' },
        { value: 'CERRADA', label: 'Cerrada' },
        { value: 'VENCIDA', label: 'Vencida' },
        { value: 'CANCELADA', label: 'Cancelada' },
      ],
      assets: assets.map((item) => ({
        value: item.equipoId,
        label: `${item.codigoEquipo} - ${item.nombreEquipo}`,
        codigoEquipo: item.codigoEquipo,
        ubicacion: item.ubicacion,
      })),
      technicians: TPM_TECHNICIANS.map((item) => ({ value: item, label: item })),
      locations: locations.map((item) => ({ value: item, label: item })),
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
      spareParts: TPM_SPARE_PARTS.map((item) => ({ ...item })),
    };
  }

  private buildAssetAggregate(asset: TpmAsset, store: TpmStore): TpmAssetAggregate {
    return {
      asset: { ...asset },
      plans: store.plans.filter((item) => item.equipoId === asset.equipoId).map((item) => ({ ...item })),
      workOrders: store.workOrders.filter((item) => item.equipoId === asset.equipoId).map((item) => cloneWorkOrder(item)),
      alerts: store.alerts.filter((item) => item.equipoId === asset.equipoId).map((item) => ({ ...item })),
      history: store.histories.filter((item) => item.equipoId === asset.equipoId).map((item) => ({ ...item })),
    };
  }

  private buildKpis(store: TpmStore, companyId: string): TpmKpis {
    const assets = store.assets.filter((item) => item.empresaId === companyId);
    const workOrders = store.workOrders.filter((item) => item.empresaId === companyId);
    return {
      equiposOperativos: assets.filter((item) => item.estadoEquipo === 'OPERATIVO').length,
      equiposBloqueados: assets.filter((item) => item.estadoEquipo === 'BLOQUEADO').length,
      otsAbiertas: workOrders.filter((item) => !isClosedOrder(item.estado)).length,
      mantenimientosVencidos: store.alerts.filter((item) => item.tipo === 'MANTENIMIENTO_VENCIDO').length,
      calibracionesVencidas: store.alerts.filter((item) => item.tipo === 'CALIBRACION_VENCIDA').length,
      sanitariosPendientes: store.alerts.filter((item) => item.tipo === 'SANITARIO_PENDIENTE').length,
    };
  }

  private buildSeedAsset(companyId: string, equipment: Equipment, index: number): TpmAsset {
    const brand = equipment.empresaFabricante.split(' ')[0] ?? 'OEM';
    const installationDate = equipment.createdAt?.slice(0, 10) ?? addDays(todayDate(), -(430 + index * 15));
    const hoursBase = 700 + (index * 150);
    return {
      id: `tpm-asset-${equipment.id}`,
      empresaId: companyId,
      empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      equipoId: equipment.id,
      codigoEquipo: equipment.idEquipo,
      nombreEquipo: equipment.nombreEquipo,
      marca: brand,
      modelo: equipment.tipoEquipo ?? 'Modelo operativo',
      serie: `SER-${equipment.idEquipo.replace(/[^A-Z0-9]/gi, '')}`,
      ubicacion: equipment.ubicacionOperativa ?? 'Produccion',
      fechaInstalacion: installationDate,
      horasUso: hoursBase,
      horasUsoBase: hoursBase,
      estadoEquipo: equipment.estado === 'INACTIVO' ? 'DETENIDO' : 'OPERATIVO',
      fechaUltimoMantenimiento: addDays(todayDate(), -(14 + index * 4)),
      fechaProximoMantenimiento: addDays(todayDate(), 10 + index * 5),
      notasTecnicas: `Activo extendido desde maestro de Equipos para control TPM en ${equipment.ubicacionOperativa ?? 'planta'}.`,
    };
  }

  private buildSeedPlans(companyId: string, asset: TpmAsset, index: number): TpmPlan[] {
    const plans: TpmPlan[] = [
      {
        id: `tpm-plan-prev-${asset.equipoId}`,
        empresaId: companyId,
        equipoId: asset.equipoId,
        tipo: 'PREVENTIVO',
        frecuenciaDias: 30,
        frecuenciaHorasUso: 240,
        activo: true,
        tareasProgramadas: ['Lubricacion', 'Inspeccion visual', 'Ajuste general'],
        tecnicoAsignado: TPM_TECHNICIANS[index % 2],
        ultimoGeneradoEn: null,
        proximoVencimiento: addDays(todayDate(), index === 0 ? -2 : 8 + index),
        ultimaHoraGenerada: asset.horasUsoBase - 120,
      },
    ];

    if (normalize(asset.nombreEquipo).includes('pasteurizador') || normalize(asset.nombreEquipo).includes('sensor')) {
      plans.push({
        id: `tpm-plan-cal-${asset.equipoId}`,
        empresaId: companyId,
        equipoId: asset.equipoId,
        tipo: 'CALIBRACION',
        frecuenciaDias: 45,
        frecuenciaHorasUso: null,
        activo: true,
        tareasProgramadas: ['Verificacion de sensor', 'Patron de referencia', 'Acta de calibracion'],
        tecnicoAsignado: 'Supervisor TPM',
        ultimoGeneradoEn: null,
        proximoVencimiento: addDays(todayDate(), -3),
        ultimaHoraGenerada: asset.horasUsoBase,
      });
    }

    if (normalize(asset.ubicacion).includes('envasado') || normalize(asset.nombreEquipo).includes('envasadora')) {
      plans.push({
        id: `tpm-plan-san-${asset.equipoId}`,
        empresaId: companyId,
        equipoId: asset.equipoId,
        tipo: 'SANITARIO',
        frecuenciaDias: 7,
        frecuenciaHorasUso: null,
        activo: true,
        tareasProgramadas: ['Desarme sanitario', 'Limpieza CIP', 'Liberacion QA'],
        tecnicoAsignado: 'Calidad / Sanitario',
        ultimoGeneradoEn: null,
        proximoVencimiento: addDays(todayDate(), -1),
        ultimaHoraGenerada: asset.horasUsoBase,
      });
    }

    if (normalize(asset.nombreEquipo).includes('bombeo') || normalize(asset.nombreEquipo).includes('mezclador')) {
      plans.push({
        id: `tpm-plan-pred-${asset.equipoId}`,
        empresaId: companyId,
        equipoId: asset.equipoId,
        tipo: 'PREDICTIVO',
        frecuenciaDias: 20,
        frecuenciaHorasUso: 180,
        activo: true,
        tareasProgramadas: ['Vibracion', 'Temperatura de rodamientos', 'Ruido anormal'],
        tecnicoAsignado: 'Tecnico Mantenimiento 2',
        ultimoGeneradoEn: null,
        proximoVencimiento: addDays(todayDate(), 5),
        ultimaHoraGenerada: asset.horasUsoBase - 80,
      });
    }

    return plans;
  }

  private buildSeedCorrective(companyId: string, asset: TpmAsset): TpmWorkOrder {
    return {
      id: `tpm-wo-corr-${asset.equipoId}`,
      empresaId: companyId,
      equipoId: asset.equipoId,
      planId: null,
      tipo: 'CORRECTIVO',
      fechaProgramada: addDays(todayDate(), -1),
      fechaInicio: addDays(todayDate(), -1),
      fechaCierre: null,
      tecnico: 'Tecnico Mantenimiento 1',
      estado: 'EN_PROCESO',
      tiempoReparacion: 4,
      costo: 730000,
      causaRaiz: 'Falla mecanica en sello de bomba',
      observaciones: 'Correctivo abierto por paro relevante reportado desde OEE.',
      repuestosUsados: this.buildSpareParts(`tpm-wo-corr-${asset.equipoId}`, [
        { codigoRepuesto: 'REP-04', descripcion: 'Sello mecanico', cantidad: 1, costoUnitario: 410000 },
        { codigoRepuesto: 'REP-05', descripcion: 'Lubricante grado alimenticio', cantidad: 1, costoUnitario: 90000 },
      ]),
      generaBloqueo: true,
      impactoOee: 'Equipo incompatible con operacion critica hasta cierre del correctivo.',
    };
  }

  private buildAutomaticWorkOrder(
    companyId: string,
    asset: TpmAsset,
    plan: TpmPlan,
    dateDue: boolean,
  ): TpmWorkOrder {
    const generatedAt = new Date().toISOString();
    const isCriticalPlan = plan.tipo === 'CALIBRACION' || plan.tipo === 'SANITARIO';
    return {
      id: `tpm-wo-${asset.equipoId}-${slugify(plan.tipo)}-${generatedAt.replace(/\D/g, '').slice(-10)}`,
      empresaId: companyId,
      equipoId: asset.equipoId,
      planId: plan.id,
      tipo: plan.tipo,
      fechaProgramada: plan.proximoVencimiento ?? todayDate(),
      fechaInicio: null,
      fechaCierre: null,
      tecnico: plan.tecnicoAsignado,
      estado: dateDue && (plan.proximoVencimiento ?? todayDate()) < todayDate() ? 'VENCIDA' : 'PROGRAMADA',
      tiempoReparacion: 0,
      costo: 0,
      causaRaiz: null,
      observaciones: `Generada automaticamente por vencimiento del plan ${TPM_TYPE_LABELS[plan.tipo].toLowerCase()}.`,
      repuestosUsados: [],
      generaBloqueo: isCriticalPlan,
      impactoOee: isCriticalPlan ? 'Equipo no compatible con operacion hasta cumplir la OT.' : 'Intervencion programada con impacto controlado sobre OEE.',
    };
  }

  private buildAlerts(companyId: string, assets: TpmAsset[], plans: TpmPlan[], workOrders: TpmWorkOrder[]): TpmAlert[] {
    const alerts: TpmAlert[] = [];
    const spareStock = this.resolveAvailableSpareStock(workOrders.filter((item) => item.empresaId === companyId));
    const pushAlert = (
      equipoId: string,
      otId: string | null,
      tipo: TpmAlertType,
      severidad: TpmAlertSeverity,
      descripcion: string,
    ) => {
      alerts.push({
        id: `${equipoId}-${tipo}-${otId ?? 'na'}`,
        equipoId,
        otId,
        tipo,
        severidad,
        descripcion,
      });
    };

    assets.filter((item) => item.empresaId === companyId).forEach((asset) => {
      const assetPlans = plans.filter((item) => item.empresaId === companyId && item.equipoId === asset.equipoId && item.activo);
      const assetOrders = workOrders.filter((item) => item.empresaId === companyId && item.equipoId === asset.equipoId);
      const openCorrective = assetOrders.find((item) => item.tipo === 'CORRECTIVO' && !isClosedOrder(item.estado)) ?? null;

      assetPlans.forEach((plan) => {
        const hourReference = plan.ultimaHoraGenerada ?? asset.horasUsoBase;
        const hoursDue =
          !!plan.frecuenciaHorasUso &&
          plan.frecuenciaHorasUso > 0 &&
          asset.horasUso >= hourReference + plan.frecuenciaHorasUso;
        const dateDue = !!plan.proximoVencimiento && plan.proximoVencimiento < todayDate();
        const nextOpen = assetOrders.find((item) => item.planId === plan.id && !isClosedOrder(item.estado)) ?? null;

        if (plan.tipo === 'CALIBRACION' && (dateDue || hoursDue)) {
          pushAlert(
            asset.equipoId,
            nextOpen?.id ?? null,
            'CALIBRACION_VENCIDA',
            'ALTA',
            `Calibracion vencida para ${asset.nombreEquipo}; el equipo debe bloquearse hasta ejecutar la OT.`,
          );
        } else if (plan.tipo === 'SANITARIO' && (dateDue || hoursDue)) {
          pushAlert(
            asset.equipoId,
            nextOpen?.id ?? null,
            'SANITARIO_PENDIENTE',
            'ALTA',
            `Mantenimiento sanitario pendiente en ${asset.nombreEquipo}; liberar linea solo despues del cumplimiento.`,
          );
        } else if (dateDue || hoursDue) {
          pushAlert(
            asset.equipoId,
            nextOpen?.id ?? null,
            'MANTENIMIENTO_VENCIDO',
            plan.tipo === 'PREVENTIVO' ? 'MEDIA' : 'BAJA',
            `Plan ${TPM_TYPE_LABELS[plan.tipo].toLowerCase()} vencido para ${asset.nombreEquipo}.`,
          );
        }
      });

      if (asset.estadoEquipo === 'BLOQUEADO') {
        pushAlert(
          asset.equipoId,
          openCorrective?.id ?? null,
          'EQUIPO_BLOQUEADO',
          'ALTA',
          `${asset.nombreEquipo} esta bloqueado y no debe usarse en operacion critica ni OEE.`,
        );
      }

      if (openCorrective) {
        pushAlert(
          asset.equipoId,
          openCorrective.id,
          'CORRECTIVO_ABIERTO',
          openCorrective.estado === 'EN_PROCESO' ? 'ALTA' : 'MEDIA',
          `Correctivo abierto para ${asset.nombreEquipo}. Impacto OEE: ${openCorrective.impactoOee ?? 'Pendiente de evaluar'}.`,
        );
      }
    });

    spareStock.forEach((item) => {
      if (item.remaining <= item.part.stockMinimo) {
        const relatedOrder = workOrders.find((order) =>
          order.repuestosUsados.some((spare) => spare.codigoRepuesto === item.part.codigo),
        );
        if (!relatedOrder) {
          return;
        }

        pushAlert(
          relatedOrder.equipoId,
          relatedOrder.id,
          'REPUESTO_CRITICO',
          item.remaining === 0 ? 'ALTA' : 'MEDIA',
          `Repuesto ${item.part.codigo} - ${item.part.descripcion} quedo en stock ${item.remaining}.`,
        );
      }
    });

    return alerts.sort((left, right) => compareSeverity(left.severidad, right.severidad));
  }

  private resolveAvailableSpareStock(workOrders: TpmWorkOrder[]) {
    return TPM_SPARE_PARTS.map((part) => {
      const consumed = workOrders.reduce((sum, order) => {
        const orderConsumed = order.repuestosUsados
          .filter((item) => item.codigoRepuesto === part.codigo)
          .reduce((partSum, item) => partSum + item.cantidad, 0);
        return sum + orderConsumed;
      }, 0);
      return {
        part,
        remaining: Math.max(0, part.stockDisponible - consumed),
      };
    });
  }

  private resolveAssetState(
    asset: TpmAsset,
    equipment: Equipment | null,
    openOrders: TpmWorkOrder[],
  ): TpmEquipmentState {
    if (equipment?.estado === 'INACTIVO') {
      return 'DETENIDO';
    }

    if (openOrders.some((item) => item.estado === 'EN_PROCESO')) {
      return 'EN_MANTENIMIENTO';
    }

    if (
      openOrders.some(
        (item) =>
          item.generaBloqueo ||
          item.tipo === 'CALIBRACION' ||
          item.tipo === 'SANITARIO' ||
          item.tipo === 'CORRECTIVO',
      )
    ) {
      return 'BLOQUEADO';
    }

    if (asset.estadoEquipo === 'DETENIDO') {
      return 'DETENIDO';
    }

    return 'OPERATIVO';
  }

  private validateAssetPayload(
    companyId: string,
    payload: SaveTpmAssetPayload,
    equipment: Equipment | null,
    currentAssetId?: string,
  ): string | null {
    void currentAssetId;
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!equipment) {
      return 'Debes asociar la hoja de vida a un equipo valido.';
    }

    if (!payload.marca.trim() || !payload.modelo.trim() || !payload.serie.trim()) {
      return 'Marca, modelo y serie son obligatorios.';
    }

    if (!payload.fechaInstalacion) {
      return 'Debes registrar la fecha de instalacion.';
    }

    if (!Number.isFinite(payload.horasUso) || payload.horasUso < 0) {
      return 'Las horas de uso deben ser mayores o iguales a cero.';
    }

    return null;
  }

  private validatePlanPayload(
    companyId: string,
    payload: SaveTpmPlanPayload,
    asset: TpmAsset | null,
    currentPlanId?: string,
  ): string | null {
    void currentPlanId;
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!asset) {
      return 'Debes seleccionar un activo TPM valido.';
    }

    if (
      (!payload.frecuenciaDias || payload.frecuenciaDias <= 0) &&
      (!payload.frecuenciaHorasUso || payload.frecuenciaHorasUso <= 0)
    ) {
      return 'Debes configurar frecuencia por dias o por horas de uso.';
    }

    if (!payload.tecnicoAsignado.trim()) {
      return 'Debes asignar un tecnico responsable.';
    }

    if (!payload.tareasProgramadas.length) {
      return 'Debes registrar al menos una tarea programada.';
    }

    return null;
  }

  private validateWorkOrderPayload(
    companyId: string,
    payload: SaveTpmWorkOrderPayload,
    asset: TpmAsset | null,
    current: TpmWorkOrder | null,
  ): string | null {
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!asset) {
      return 'Debes seleccionar un equipo valido para la OT.';
    }

    if (current && isClosedOrder(current.estado)) {
      return 'Una OT cerrada o cancelada no puede editarse libremente.';
    }

    if (!payload.fechaProgramada) {
      return 'Debes registrar la fecha programada.';
    }

    if (!payload.tecnico.trim()) {
      return 'Debes asignar un tecnico.';
    }

    if (!Number.isFinite(payload.tiempoReparacion) || payload.tiempoReparacion < 0) {
      return 'El tiempo de reparacion debe ser mayor o igual a cero.';
    }

    if (!Number.isFinite(payload.costo) || payload.costo < 0) {
      return 'El costo debe ser mayor o igual a cero.';
    }

    return null;
  }

  private normalizeFilters(filters: TpmFilters): TpmFilters {
    return {
      ...DEFAULT_TPM_FILTERS,
      ...filters,
      equipoId: filters.equipoId || null,
      tipoMantenimiento: filters.tipoMantenimiento ?? 'TODOS',
      estadoEquipo: filters.estadoEquipo ?? 'TODOS',
      estadoOt: filters.estadoOt ?? 'TODOS',
      tecnico: filters.tecnico || null,
      ubicacion: filters.ubicacion || null,
      severidadAlerta: filters.severidadAlerta ?? 'TODAS',
    };
  }

  private matchesAssetFilters(asset: TpmAsset, filters: TpmFilters, store: TpmStore): boolean {
    const relatedOrders = store.workOrders.filter((item) => item.equipoId === asset.equipoId);
    return (
      (!filters.equipoId || asset.equipoId === filters.equipoId) &&
      (filters.estadoEquipo === 'TODOS' || asset.estadoEquipo === filters.estadoEquipo) &&
      (!filters.ubicacion || asset.ubicacion === filters.ubicacion) &&
      (!filters.tecnico ||
        store.plans.some((plan) => plan.equipoId === asset.equipoId && plan.tecnicoAsignado === filters.tecnico) ||
        relatedOrders.some((order) => order.tecnico === filters.tecnico)) &&
      (filters.tipoMantenimiento === 'TODOS' ||
        store.plans.some((plan) => plan.equipoId === asset.equipoId && plan.tipo === filters.tipoMantenimiento) ||
        relatedOrders.some((order) => order.tipo === filters.tipoMantenimiento))
    );
  }

  private matchesWorkOrderFilters(workOrder: TpmWorkOrder, filters: TpmFilters, store: TpmStore): boolean {
    const asset = this.findAssetByEquipment(store, workOrder.empresaId, workOrder.equipoId);
    return (
      (!filters.equipoId || workOrder.equipoId === filters.equipoId) &&
      (filters.tipoMantenimiento === 'TODOS' || workOrder.tipo === filters.tipoMantenimiento) &&
      (filters.estadoOt === 'TODOS' || workOrder.estado === filters.estadoOt) &&
      (!filters.tecnico || workOrder.tecnico === filters.tecnico) &&
      (!filters.ubicacion || asset?.ubicacion === filters.ubicacion) &&
      (filters.estadoEquipo === 'TODOS' || asset?.estadoEquipo === filters.estadoEquipo)
    );
  }

  private findAsset(store: TpmStore, companyId: string, assetId: string): TpmAsset | null {
    const asset = store.assets.find((item) => item.empresaId === companyId && item.id === assetId) ?? null;
    return asset ? { ...asset } : null;
  }

  private findAssetByEquipment(store: TpmStore, companyId: string, equipmentId: string): TpmAsset | null {
    const asset = store.assets.find((item) => item.empresaId === companyId && item.equipoId === equipmentId) ?? null;
    return asset ? { ...asset } : null;
  }

  private findPlan(store: TpmStore, companyId: string, planId: string): TpmPlan | null {
    const plan = store.plans.find((item) => item.empresaId === companyId && item.id === planId) ?? null;
    return plan ? { ...plan } : null;
  }

  private findWorkOrder(store: TpmStore, companyId: string, workOrderId: string): TpmWorkOrder | null {
    const workOrder = store.workOrders.find((item) => item.empresaId === companyId && item.id === workOrderId) ?? null;
    return workOrder ? cloneWorkOrder(workOrder) : null;
  }

  private buildSpareParts(workOrderId: string, payload: SaveTpmSparePartPayload[]): TpmSparePart[] {
    return payload.map((item, index) => ({
      id: `${workOrderId}-spare-${index + 1}`,
      otId: workOrderId,
      codigoRepuesto: item.codigoRepuesto,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      costoUnitario: round(item.costoUnitario),
      costoTotal: round(item.cantidad * item.costoUnitario),
    }));
  }

  private buildHistory(
    equipoId: string,
    evento: string,
    usuario: string,
    fecha: string,
    observacion: string,
  ): TpmHistory {
    return {
      id: `${equipoId}-${evento}-${Date.parse(fecha)}`,
      equipoId,
      evento,
      usuario,
      fecha,
      observacion,
    };
  }

  private buildAuditDraft(
    action: TpmAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): TpmAuditDraft {
    return {
      module: 'tpm',
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

  private sanitizeAsset(asset: TpmAsset): Record<string, unknown> {
    return {
      codigoEquipo: asset.codigoEquipo,
      nombreEquipo: asset.nombreEquipo,
      marca: asset.marca,
      modelo: asset.modelo,
      serie: asset.serie,
      ubicacion: asset.ubicacion,
      fechaInstalacion: asset.fechaInstalacion,
      horasUso: asset.horasUso,
      estadoEquipo: asset.estadoEquipo,
      fechaUltimoMantenimiento: asset.fechaUltimoMantenimiento,
      fechaProximoMantenimiento: asset.fechaProximoMantenimiento,
    };
  }

  private sanitizePlan(plan: TpmPlan): Record<string, unknown> {
    return {
      tipo: plan.tipo,
      frecuenciaDias: plan.frecuenciaDias,
      frecuenciaHorasUso: plan.frecuenciaHorasUso,
      activo: plan.activo,
      tareasProgramadas: [...plan.tareasProgramadas],
      tecnicoAsignado: plan.tecnicoAsignado,
      proximoVencimiento: plan.proximoVencimiento,
    };
  }

  private sanitizeWorkOrder(workOrder: TpmWorkOrder): Record<string, unknown> {
    return {
      tipo: workOrder.tipo,
      fechaProgramada: workOrder.fechaProgramada,
      fechaInicio: workOrder.fechaInicio,
      fechaCierre: workOrder.fechaCierre,
      tecnico: workOrder.tecnico,
      estado: workOrder.estado,
      tiempoReparacion: workOrder.tiempoReparacion,
      costo: workOrder.costo,
      causaRaiz: workOrder.causaRaiz,
      observaciones: workOrder.observaciones,
      repuestosUsados: workOrder.repuestosUsados.map((item) => ({
        codigoRepuesto: item.codigoRepuesto,
        cantidad: item.cantidad,
        costoTotal: item.costoTotal,
      })),
      generaBloqueo: workOrder.generaBloqueo,
      impactoOee: workOrder.impactoOee,
    };
  }

  private readEquipments(companyId: string): Equipment[] {
    if (typeof window === 'undefined') {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    const raw = localStorage.getItem(EQUIPMENTS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    try {
      const parsed = JSON.parse(raw) as EquipmentStore;
      return (parsed.equipments ?? [])
        .filter((item) => item.empresaId === companyId)
        .map((item) => ({ ...item }));
    } catch {
      return INITIAL_EQUIPMENTS_STORE.equipments.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }
  }

  private readOeeStore(): OeeStore {
    if (typeof window === 'undefined') {
      return { records: [], alerts: [], histories: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(OEE_STORAGE_KEY);
    if (!raw) {
      return { records: [], alerts: [], histories: [], auditTrail: [] };
    }

    try {
      const parsed = JSON.parse(raw) as OeeStore;
      return {
        records: parsed.records ?? [],
        alerts: parsed.alerts ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return { records: [], alerts: [], histories: [], auditTrail: [] };
    }
  }

  private resolveOeeHoursByEquipment(companyId: string): Map<string, number> {
    const records = this.readOeeStore().records.filter((item: OeeRecord) => item.empresaId === companyId);
    return records.reduce((map, item) => {
      const current = map.get(item.maquinaId) ?? 0;
      map.set(item.maquinaId, round(current + (item.tiempoNetoOperativo / 60)));
      return map;
    }, new Map<string, number>());
  }

  private belongsToCompany(assets: TpmAsset[], companyId: string, equipmentId: string): boolean {
    return assets.some((item) => item.empresaId === companyId && item.equipoId === equipmentId);
  }

  private normalizeWorkOrderState(workOrder: TpmWorkOrder): TpmWorkOrder {
    if (isClosedOrder(workOrder.estado)) {
      return workOrder;
    }

    if (workOrder.estado === 'PROGRAMADA' && workOrder.fechaProgramada < todayDate()) {
      return {
        ...workOrder,
        estado: 'VENCIDA',
      };
    }

    return workOrder;
  }
}

function createEmptyStore(): TpmStore {
  return {
    assets: [],
    plans: [],
    workOrders: [],
    alerts: [],
    histories: [],
    auditTrail: [],
  };
}

function cloneStore(store: TpmStore): TpmStore {
  return {
    assets: store.assets.map((item) => ({ ...item })),
    plans: store.plans.map((item) => ({ ...item })),
    workOrders: store.workOrders.map((item) => cloneWorkOrder(item)),
    alerts: store.alerts.map((item) => ({ ...item })),
    histories: store.histories.map((item) => ({ ...item })),
    auditTrail: store.auditTrail.map((item) => ({ ...item })),
  };
}

function cloneWorkOrder(workOrder: TpmWorkOrder): TpmWorkOrder {
  return {
    ...workOrder,
    repuestosUsados: workOrder.repuestosUsados.map((item) => ({ ...item })),
  };
}

function isClosedOrder(state: TpmWorkOrderState): boolean {
  return state === 'CERRADA' || state === 'CANCELADA';
}

function compareSeverity(left: TpmAlertSeverity, right: TpmAlertSeverity): number {
  const weight: Record<TpmAlertSeverity, number> = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return weight[right] - weight[left];
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
