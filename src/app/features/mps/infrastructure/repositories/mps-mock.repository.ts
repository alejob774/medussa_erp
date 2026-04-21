import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Supplier } from '../../../suppliers/domain/models/supplier.model';
import { SupplierStore } from '../../../suppliers/domain/models/supplier-response.model';
import { INITIAL_SUPPLIERS_STORE } from '../../../suppliers/infrastructure/data/suppliers.mock';
import {
  StorageLayoutLot,
  StorageLayoutStore,
} from '../../../storage-layout/domain/models/storage-layout-response.model';
import { ensureStorageLayoutBaseline } from '../../../storage-layout/infrastructure/data/storage-layout-store.utils';
import { DemandForecastStore } from '../../../demand-forecast/domain/models/demand-forecast-response.model';
import { BomFormulaStore } from '../../../bom-formula/domain/models/bom-formula-response.model';
import { QualityControlStore } from '../../../quality-control/domain/models/quality-control-response.model';
import { QualityLotStatus } from '../../../quality-control/domain/models/quality-status.model';
import { MpsAlert } from '../../domain/models/mps-alert.model';
import { MpsPlanFilters, DEFAULT_MPS_PLAN_FILTERS } from '../../domain/models/mps-plan-filters.model';
import { MpsPlan, MpsPlanStatus } from '../../domain/models/mps-plan.model';
import { MpsPlanDetail, MpsPriority } from '../../domain/models/mps-plan-detail.model';
import {
  EMPTY_MPS_DASHBOARD,
  MpsAuditDraft,
  MpsCatalogs,
  MpsDashboard,
  MpsMutationResult,
  MpsPlanAggregate,
  MpsStore,
} from '../../domain/models/mps-response.model';
import { MpsSimulationLog } from '../../domain/models/mps-simulation-log.model';
import { MpsCapacitySummary, ProductionLine } from '../../domain/models/production-line.model';
import {
  ApproveMpsPlanPayload,
  GenerateMpsPlanPayload,
  MpsRepository,
  SimulateMpsPlanPayload,
  UpdateMpsDetailPayload,
} from '../../domain/repositories/mps.repository';

const STORAGE_KEY = 'medussa.erp.mock.mps';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const SUPPLIERS_STORAGE_KEY = 'medussa.erp.mock.suppliers';
const FORECAST_STORAGE_KEY = 'medussa.erp.mock.demand-forecasts';
const BOM_STORAGE_KEY = 'medussa.erp.mock.bom-formulas';
const QUALITY_STORAGE_KEY = 'medussa.erp.mock.quality-control';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

const DEFAULT_PLANTS = [
  'Planta principal El Arbolito',
  'Planta lácteos fríos',
  'Planta UHT',
] as const;

interface BomProfile {
  version: string;
  rendimientoEsperado: number;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
}

interface InventoryInsight {
  totalStock: number;
  usableStock: number;
  expiringSoonStock: number;
  hasBlockedLots: boolean;
}

interface UrgentOrder {
  id: string;
  skuId: string;
  quantity: number;
  dueDate: string;
  prioridad: MpsPriority;
  clienteNombre: string;
  rutaNombre: string;
}

interface MaterialAvailability {
  availableQuantity: number;
  leadTimeDays: number | null;
  supplierName: string | null;
}

const FALLBACK_BOM_BY_SKU: Record<string, BomProfile> = {
  'ARB-YOG-200-FR': {
    version: '1.0',
    rendimientoEsperado: 560,
    ingredients: [
      { id: 'ing-leche-estandarizada', name: 'Leche estandarizada', quantity: 430, unit: 'LT' },
      { id: 'ing-azucar-refinada', name: 'Azucar refinada', quantity: 18, unit: 'KG' },
      { id: 'ing-pulpa-fresa', name: 'Pulpa de fresa', quantity: 74, unit: 'KG' },
      { id: 'ing-estabilizante-lacteo', name: 'Estabilizante lacteo', quantity: 2.4, unit: 'KG' },
      { id: 'ing-bolsa-500', name: 'Bolsa termoencogible 500 g', quantity: 560, unit: 'UND' },
      { id: 'ing-etiqueta-general', name: 'Etiqueta autoadhesiva', quantity: 560, unit: 'UND' },
    ],
  },
  'ARB-UHT-1L': {
    version: '2.0',
    rendimientoEsperado: 1180,
    ingredients: [
      { id: 'ing-leche-estandarizada', name: 'Leche estandarizada', quantity: 1180, unit: 'LT' },
      { id: 'ing-botella-1l', name: 'Envase UHT 1L', quantity: 1180, unit: 'UND' },
      { id: 'ing-etiqueta-general', name: 'Etiqueta autoadhesiva', quantity: 1180, unit: 'UND' },
      { id: 'ing-caja-corrugada', name: 'Caja corrugada despacho', quantity: 96, unit: 'UND' },
    ],
  },
  'ARB-QUE-500': {
    version: '1.0',
    rendimientoEsperado: 560,
    ingredients: [
      { id: 'ing-leche-estandarizada', name: 'Leche estandarizada', quantity: 592, unit: 'LT' },
      { id: 'ing-cuajo-liquido', name: 'Cuajo liquido', quantity: 1.6, unit: 'LT' },
      { id: 'ing-cloruro-calcio', name: 'Cloruro de calcio', quantity: 2.2, unit: 'KG' },
      { id: 'ing-bolsa-500', name: 'Bolsa termoencogible 500 g', quantity: 560, unit: 'UND' },
      { id: 'ing-etiqueta-general', name: 'Etiqueta autoadhesiva', quantity: 560, unit: 'UND' },
    ],
  },
};

const MATERIAL_AVAILABILITY_LIBRARY: Record<string, MaterialAvailability> = {
  'leche estandarizada': {
    availableQuantity: 940,
    leadTimeDays: 2,
    supplierName: 'Ganadería La Colina S.A.S.',
  },
  'azucar refinada': {
    availableQuantity: 180,
    leadTimeDays: 4,
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  'pulpa de fresa': {
    availableQuantity: 38,
    leadTimeDays: 6,
    supplierName: 'Frutales del Norte',
  },
  'estabilizante lacteo': {
    availableQuantity: 8,
    leadTimeDays: 4,
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  'cuajo liquido': {
    availableQuantity: 0.9,
    leadTimeDays: 7,
    supplierName: 'Tecnienzimas S.A.S.',
  },
  'cloruro de calcio': {
    availableQuantity: 6,
    leadTimeDays: 4,
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  'envase uht 1l': {
    availableQuantity: 900,
    leadTimeDays: 7,
    supplierName: 'Empaques del Caribe Flex',
  },
  'bolsa termoencogible 500 g': {
    availableQuantity: 360,
    leadTimeDays: 7,
    supplierName: 'Empaques del Caribe Flex',
  },
  'etiqueta autoadhesiva': {
    availableQuantity: 520,
    leadTimeDays: 6,
    supplierName: 'Etiqprint Soluciones Gráficas',
  },
  'caja corrugada despacho': {
    availableQuantity: 160,
    leadTimeDays: 7,
    supplierName: 'Empaques del Caribe Flex',
  },
};

@Injectable({
  providedIn: 'root',
})
export class MpsMockRepository implements MpsRepository {
  getDashboard(companyId: string, filters: MpsPlanFilters): Observable<MpsDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const lines = store.productionLines.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    const selectedPlanSource = this.selectPlan(store, companyId, normalizedFilters);

    if (!selectedPlanSource) {
      return of({
        ...EMPTY_MPS_DASHBOARD,
        filters: normalizedFilters,
        catalogs: this.buildCatalogs(companyId, store),
        plans: [],
        selectedPlan: null,
        productionLines: lines,
      }).pipe(delay(150));
    }

    const filteredPlan = this.filterPlanAggregate(selectedPlanSource, normalizedFilters);

    return of({
      filters: normalizedFilters,
      catalogs: this.buildCatalogs(companyId, store),
      plans: store.plans
        .filter((item) => item.plan.empresaId === companyId)
        .sort((left, right) => new Date(right.plan.fechaCreacion).getTime() - new Date(left.plan.fechaCreacion).getTime())
        .map((item) => this.cloneAggregate(item)),
      selectedPlan: filteredPlan,
      productionLines: lines,
    }).pipe(delay(180));
  }

  generatePlan(companyId: string, payload: GenerateMpsPlanPayload): Observable<MpsMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const validation = this.validateGeneratePayload(companyId, payload);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    const lines = store.productionLines.filter((item) => item.empresaId === companyId);
    const aggregate = this.buildPlanAggregate(
      companyId,
      payload,
      lines,
      `mps-${companyId}-${Date.now()}`,
      'GENERADO',
      payload.usuario,
      null,
      payload.observaciones,
      [],
      null,
    );
    const withLog = this.appendLog(aggregate, {
      tipoEvento: 'GENERACION_PLAN',
      usuario: payload.usuario,
      observacion: 'Plan MPS generado desde filtros operativos.',
      valorAnterior: null,
      valorNuevo: JSON.stringify({
        fechaInicio: payload.fechaInicio,
        fechaFin: payload.fechaFin,
        planta: payload.planta,
        familia: payload.familia,
        skuId: payload.skuId,
        considerarFEFO: payload.considerarFEFO,
        considerarPedidosUrgentes: payload.considerarPedidosUrgentes,
      }),
    });
    const nextStore: MpsStore = {
      ...store,
      plans: [withLog, ...store.plans.map((item) => this.cloneAggregate(item))],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
      productionLines: store.productionLines.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'generate',
      companyId,
      withLog.plan.id,
      this.describePlanEntity(withLog.plan),
      'Plan maestro generado para el periodo seleccionado.',
      null,
      this.sanitizeAggregate(withLog),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<MpsMutationResult>({
      action: 'generated',
      plan: this.cloneAggregate(withLog),
      message: 'Plan MPS generado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  updateDetail(
    companyId: string,
    planId: string,
    detailId: string,
    payload: UpdateMpsDetailPayload,
  ): Observable<MpsMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = this.findPlan(store, companyId, planId);

    if (!current) {
      return throwError(() => new Error('No se encontro el plan MPS seleccionado.'));
    }

    if (current.plan.estado === 'APROBADO' || current.plan.estado === 'OBSOLETO') {
      return throwError(() => new Error('El plan seleccionado no se puede editar directamente.'));
    }

    if (payload.cantidadPlanificada < 0) {
      return throwError(() => new Error('La cantidad planificada no puede ser negativa.'));
    }

    const lines = store.productionLines.filter((item) => item.empresaId === companyId);
    const line = lines.find((item) => item.nombre === payload.lineaProduccion);

    if (!line) {
      return throwError(() => new Error('La línea de producción seleccionada no existe.'));
    }

    const previousDetail = current.details.find((item) => item.id === detailId) ?? null;

    if (!previousDetail) {
      return throwError(() => new Error('No se encontro el detalle del plan que deseas ajustar.'));
    }

    const nextDetails = current.details.map((item) =>
      item.id === detailId
        ? {
            ...item,
            cantidadPlanificada: Math.round(payload.cantidadPlanificada),
            fechaProduccion: payload.fechaProduccion,
            lineaProduccion: payload.lineaProduccion,
          }
        : { ...item },
    );
    const recalculated = this.recalculateAggregate(companyId, current.plan, nextDetails, lines);
    const nextPlan: MpsPlan = {
      ...recalculated.plan,
      estado: 'AJUSTADO',
      observaciones: payload.observacion?.trim() || recalculated.plan.observaciones,
    };
    const nextAggregate = this.appendLog(
      {
        ...recalculated,
        plan: nextPlan,
      },
      {
        tipoEvento: 'AJUSTE_DETALLE',
        usuario: payload.usuario,
        observacion:
          payload.observacion?.trim() ||
          `Detalle ${previousDetail.sku} ajustado en cantidad, fecha o línea.`,
        valorAnterior: JSON.stringify({
          cantidadPlanificada: previousDetail.cantidadPlanificada,
          fechaProduccion: previousDetail.fechaProduccion,
          lineaProduccion: previousDetail.lineaProduccion,
        }),
        valorNuevo: JSON.stringify({
          cantidadPlanificada: payload.cantidadPlanificada,
          fechaProduccion: payload.fechaProduccion,
          lineaProduccion: payload.lineaProduccion,
        }),
      },
    );
    const nextStore: MpsStore = {
      ...store,
      plans: store.plans.map((item) => (item.plan.id === planId ? nextAggregate : this.cloneAggregate(item))),
      productionLines: store.productionLines.map((item) => ({ ...item })),
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'edit',
      companyId,
      planId,
      this.describePlanEntity(nextPlan),
      `Detalle ${previousDetail.sku} ajustado dentro del plan MPS.`,
      {
        detailId,
        cantidadPlanificada: previousDetail.cantidadPlanificada,
        fechaProduccion: previousDetail.fechaProduccion,
        lineaProduccion: previousDetail.lineaProduccion,
      },
      {
        detailId,
        cantidadPlanificada: payload.cantidadPlanificada,
        fechaProduccion: payload.fechaProduccion,
        lineaProduccion: payload.lineaProduccion,
      },
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<MpsMutationResult>({
      action: 'updated',
      plan: this.cloneAggregate(nextAggregate),
      message: 'Detalle del plan actualizado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  simulatePlan(
    companyId: string,
    planId: string,
    payload: SimulateMpsPlanPayload,
  ): Observable<MpsMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = this.findPlan(store, companyId, planId);

    if (!current) {
      return throwError(() => new Error('No se encontro el plan seleccionado para simulación.'));
    }

    if (current.plan.estado === 'APROBADO' || current.plan.estado === 'OBSOLETO') {
      return throwError(() => new Error('El plan seleccionado no permite simulaciones posteriores.'));
    }

    const lines = store.productionLines.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    const capacityFactor = 1 + payload.capacidadAjustePct / 100;
    const nextDetails = current.details.map((item) => {
      const requiredQty = Math.max(
        0,
        Math.round((item.demandaBase * (1 + payload.demandaAjustePct / 100)) + item.pedidosUrgentes + item.stockSeguridad - item.inventarioDisponible),
      );
      const roundedQty = roundToPack(requiredQty, resolvePackFactorBySku(item.sku));

      return {
        ...item,
        cantidadPlanificada: roundedQty,
        capacidadHorasDisponibles: Math.max(1, round(item.capacidadHorasDisponibles * capacityFactor)),
      };
    });
    const recalculated = this.recalculateAggregate(companyId, current.plan, nextDetails, lines, capacityFactor);
    const nextAggregate = this.appendLog(
      {
        ...recalculated,
        plan: {
          ...recalculated.plan,
          estado: 'AJUSTADO',
          considerarFEFO: payload.considerarFEFO,
          observaciones: payload.observacion?.trim() || recalculated.plan.observaciones,
        },
      },
      {
        tipoEvento: 'SIMULACION_ESCENARIO',
        usuario: payload.usuario,
        observacion:
          payload.observacion?.trim() ||
          'Simulación de demanda/capacidad aplicada sobre el plan actual.',
        valorAnterior: JSON.stringify({
          demandaAjustePct: 0,
          capacidadAjustePct: 0,
          considerarFEFO: current.plan.considerarFEFO,
        }),
        valorNuevo: JSON.stringify({
          demandaAjustePct: payload.demandaAjustePct,
          capacidadAjustePct: payload.capacidadAjustePct,
          considerarFEFO: payload.considerarFEFO,
        }),
      },
    );
    const nextStore: MpsStore = {
      ...store,
      plans: store.plans.map((item) => (item.plan.id === planId ? nextAggregate : this.cloneAggregate(item))),
      productionLines: store.productionLines.map((item) => ({ ...item })),
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'simulate',
      companyId,
      planId,
      this.describePlanEntity(nextAggregate.plan),
      'Escenario de simulación aplicado sobre el plan MPS.',
      {
        considerarFEFO: current.plan.considerarFEFO,
      },
      {
        demandaAjustePct: payload.demandaAjustePct,
        capacidadAjustePct: payload.capacidadAjustePct,
        considerarFEFO: payload.considerarFEFO,
      },
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<MpsMutationResult>({
      action: 'simulated',
      plan: this.cloneAggregate(nextAggregate),
      message: 'Escenario simulado y trazado correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  approvePlan(
    companyId: string,
    planId: string,
    payload: ApproveMpsPlanPayload,
  ): Observable<MpsMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = this.findPlan(store, companyId, planId);

    if (!current) {
      return throwError(() => new Error('No se encontro el plan seleccionado para aprobación.'));
    }

    if (current.plan.estado === 'APROBADO') {
      return throwError(() => new Error('Ese plan ya fue aprobado.'));
    }

    const approvedAt = new Date().toISOString();
    const nextPlans = store.plans.map((item) => {
      if (item.plan.empresaId !== companyId) {
        return this.cloneAggregate(item);
      }

      if (item.plan.id === planId) {
        return this.appendLog(
          {
            ...this.cloneAggregate(current),
            plan: {
              ...current.plan,
              estado: 'APROBADO',
              usuarioAprueba: payload.usuario,
              fechaAprobacion: approvedAt,
              observaciones: payload.observacion?.trim() || current.plan.observaciones,
            },
          },
          {
            tipoEvento: 'APROBACION_PLAN',
            usuario: payload.usuario,
            observacion:
              payload.observacion?.trim() ||
              'Plan aprobado como versión oficial del período y listo para futura conversión a órdenes.',
            valorAnterior: current.plan.estado,
            valorNuevo: 'APROBADO',
          },
        );
      }

      if (item.plan.estado === 'APROBADO' && item.plan.id !== planId) {
        return {
          ...this.cloneAggregate(item),
          plan: {
            ...item.plan,
            estado: 'OBSOLETO' as const,
          },
        };
      }

      return this.cloneAggregate(item);
    });
    const approvedPlan = nextPlans.find((item) => item.plan.id === planId)!;
    const nextStore: MpsStore = {
      ...store,
      plans: nextPlans,
      productionLines: store.productionLines.map((item) => ({ ...item })),
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'approve',
      companyId,
      planId,
      this.describePlanEntity(approvedPlan.plan),
      'Plan MPS aprobado y marcado como oficial.',
      {
        estado: current.plan.estado,
        usuarioAprueba: current.plan.usuarioAprueba,
        fechaAprobacion: current.plan.fechaAprobacion,
      },
      {
        estado: 'APROBADO',
        usuarioAprueba: payload.usuario,
        fechaAprobacion: approvedAt,
      },
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<MpsMutationResult>({
      action: 'approved',
      plan: this.cloneAggregate(approvedPlan),
      message: 'Plan aprobado y listo para futura conversión a órdenes.',
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): MpsStore {
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
      const parsed = JSON.parse(raw) as MpsStore;
      return {
        plans: parsed.plans ?? [],
        productionLines: parsed.productionLines ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const emptyStore = createEmptyStore();
      this.writeStore(emptyStore);
      return emptyStore;
    }
  }

  private writeStore(store: MpsStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(store: MpsStore, companyId: string, layoutStore: StorageLayoutStore): MpsStore {
    const lines = store.productionLines.some((item) => item.empresaId === companyId)
      ? store.productionLines.map((item) => ({ ...item }))
      : [...buildProductionLines(companyId), ...store.productionLines.map((item) => ({ ...item }))];
    const hasCompanyPlans = store.plans.some((item) => item.plan.empresaId === companyId);

    if (hasCompanyPlans) {
      return {
        ...store,
        productionLines: lines,
      };
    }

    const seedPayload: GenerateMpsPlanPayload = {
      fechaInicio: DEFAULT_MPS_PLAN_FILTERS.fechaInicio,
      fechaFin: DEFAULT_MPS_PLAN_FILTERS.fechaFin,
      planta: null,
      familia: null,
      skuId: null,
      considerarFEFO: true,
      considerarPedidosUrgentes: true,
      usuario: 'demo.planificador-produccion',
      observaciones: 'Seed inicial de MPS para operación semanal de El Arbolito.',
    };
    const generated = this.buildPlanAggregate(
      companyId,
      seedPayload,
      lines.filter((item) => item.empresaId === companyId),
      `mps-seed-${companyId}`,
      'APROBADO',
      seedPayload.usuario,
      'demo.jefe-produccion',
      seedPayload.observaciones,
      [
        {
          id: `mps-seed-log-${companyId}-1`,
          planId: `mps-seed-${companyId}`,
          tipoEvento: 'GENERACION_PLAN',
          usuario: 'demo.planificador-produccion',
          fecha: new Date().toISOString(),
          observacion: 'Seed inicial generado con demanda, inventario y FEFO.',
          valorAnterior: null,
          valorNuevo: 'GENERADO',
        },
      ],
      new Date().toISOString(),
    );
    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      generated.plan.id,
      this.describePlanEntity(generated.plan),
      'Carga inicial del plan maestro semanal para Producción.',
      null,
      this.sanitizeAggregate(generated),
    );

    const nextStore: MpsStore = {
      plans: [generated, ...store.plans.map((item) => this.cloneAggregate(item))],
      productionLines: lines,
      auditTrail: [auditDraft, ...store.auditTrail.map((item) => ({ ...item }))],
    };

    this.writeStore(nextStore);

    return nextStore;
  }

  private buildPlanAggregate(
    companyId: string,
    payload: GenerateMpsPlanPayload,
    lines: ProductionLine[],
    planId: string,
    status: MpsPlanStatus,
    usuarioCrea: string,
    usuarioAprueba: string | null,
    observaciones: string | null,
    simulationLogs: MpsSimulationLog[],
    fechaAprobacion: string | null,
  ): MpsPlanAggregate {
    const planRange = { start: payload.fechaInicio, end: payload.fechaFin };
    const planningProducts = this.resolvePlanningProducts(companyId, payload);
    const inventoryBySku = this.buildInventoryMap(companyId, planRange, payload.considerarFEFO);
    const bomBySku = this.resolveBomProfiles(companyId);
    const urgentOrders = payload.considerarPedidosUrgentes
      ? this.buildUrgentOrders(companyId, planningProducts, planRange)
      : [];
    const details: MpsPlanDetail[] = planningProducts.map((product) => {
      const family = resolvePlanningFamily(product);
      const defaultLine = resolveDefaultLine(product, lines, payload.planta);
      const demandBase = this.resolveDemandBase(companyId, product, planRange);
      const urgentQty = urgentOrders
        .filter((order) => order.skuId === product.id)
        .reduce((sum, order) => sum + order.quantity, 0);
      const inventory = inventoryBySku.get(product.id) ?? createEmptyInventoryInsight();
      const stockSeguridad = computeSafetyStock(product, demandBase + urgentQty);
      const requiredQty = Math.max(0, Math.round(demandBase + urgentQty + stockSeguridad - inventory.usableStock));
      const plannedQty = roundToPack(requiredQty, resolvePackFactor(product));
      const materialEvaluation = this.evaluateMaterials(
        companyId,
        product,
        plannedQty,
        payload.fechaInicio,
        bomBySku.get(product.sku) ?? null,
      );
      const riskVencimiento =
        inventory.expiringSoonStock > 0 &&
        (inventory.expiringSoonStock > demandBase * 0.35 || (!payload.considerarFEFO && inventory.expiringSoonStock > 0));

      return {
        id: `mps-detail-${planId}-${product.id}`,
        planId,
        skuId: product.id,
        sku: product.sku,
        productoNombre: product.nombre,
        fechaProduccion: resolveSuggestedProductionDate(product, planRange, urgentOrders, inventory),
        lineaProduccion: defaultLine.nombre,
        cantidadPlanificada: plannedQty,
        horasRequeridas: computeRequiredHours(product, plannedQty, defaultLine),
        prioridad: resolvePriority(urgentQty, riskVencimiento, plannedQty),
        riesgoFaltante: plannedQty > 0,
        riesgoVencimiento: riskVencimiento,
        requiereCompra: materialEvaluation.requiresPurchase,
        materialDisponible: materialEvaluation.materialAvailable,
        capacidadDisponible: true,
        editable: status !== 'APROBADO' && status !== 'OBSOLETO',
        inventarioDisponible: inventory.usableStock,
        stockSeguridad,
        demandaBase: demandBase,
        pedidosUrgentes: urgentQty,
        capacidadHorasDisponibles: resolveLineCapacityForRange(defaultLine, planRange),
        bomVersion: bomBySku.get(product.sku)?.version ?? null,
      };
    });

    return this.recalculateAggregate(
      companyId,
      {
        id: planId,
        empresaId: companyId,
        empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
        planta: payload.planta ?? 'Consolidado El Arbolito',
        fechaInicio: payload.fechaInicio,
        fechaFin: payload.fechaFin,
        familia: payload.familia,
        considerarFEFO: payload.considerarFEFO,
        considerarPedidosUrgentes: payload.considerarPedidosUrgentes,
        estado: status,
        usuarioCrea,
        fechaCreacion: new Date().toISOString(),
        usuarioAprueba,
        fechaAprobacion,
        resumenKpis: {
          skuPlanificados: 0,
          totalAProducir: 0,
          lineasSaturadas: 0,
          alertasCriticas: 0,
          riesgoFaltante: 0,
          comprasRequeridas: 0,
        },
        observaciones,
      },
      details,
      lines,
      1,
      simulationLogs,
    );
  }

  private recalculateAggregate(
    companyId: string,
    plan: MpsPlan,
    details: MpsPlanDetail[],
    lines: ProductionLine[],
    capacityFactor = 1,
    existingLogs: MpsSimulationLog[] = [],
  ): MpsPlanAggregate {
    const planningProducts = this.readProducts(companyId);
    const productById = new Map(planningProducts.map((item) => [item.id, item]));
    const planRange = { start: plan.fechaInicio, end: plan.fechaFin };
    const bomBySku = this.resolveBomProfiles(companyId);
    const recalculatedDetailsBase = details.map((detail) => {
      const product = productById.get(detail.skuId);
      const line = lines.find((item) => item.nombre === detail.lineaProduccion) ?? resolveDefaultLine(product ?? null, lines, plan.planta);
      const materialEvaluation = product
        ? this.evaluateMaterials(companyId, product, detail.cantidadPlanificada, detail.fechaProduccion, bomBySku.get(detail.sku) ?? null)
        : { materialAvailable: true, requiresPurchase: false };
      const requiredQty = Math.max(0, Math.round(detail.demandaBase + detail.pedidosUrgentes + detail.stockSeguridad - detail.inventarioDisponible));
      const lineCapacity = Math.max(1, round(resolveLineCapacityForRange(line, planRange) * capacityFactor));

      return {
        ...detail,
        fechaProduccion: clampDate(detail.fechaProduccion, plan.fechaInicio, plan.fechaFin),
        horasRequeridas: product ? computeRequiredHours(product, detail.cantidadPlanificada, line) : detail.horasRequeridas,
        riesgoFaltante: detail.cantidadPlanificada < requiredQty,
        requiereCompra: materialEvaluation.requiresPurchase,
        materialDisponible: materialEvaluation.materialAvailable,
        capacidadHorasDisponibles: lineCapacity,
        editable: plan.estado !== 'APROBADO' && plan.estado !== 'OBSOLETO',
      };
    });
    const capacitySummary = buildCapacitySummary(lines, recalculatedDetailsBase, planRange, capacityFactor);
    const capacityByLine = new Map(capacitySummary.map((item) => [item.lineaProduccion, item]));
    const recalculatedDetails = recalculatedDetailsBase.map((detail) => ({
      ...detail,
      capacidadDisponible: !(capacityByLine.get(detail.lineaProduccion)?.saturada ?? false),
    }));
    const alerts = this.buildAlerts(recalculatedDetails, capacitySummary);
    const nextPlan: MpsPlan = {
      ...plan,
      resumenKpis: {
        skuPlanificados: recalculatedDetails.filter((item) => item.cantidadPlanificada > 0).length,
        totalAProducir: recalculatedDetails.reduce((sum, item) => sum + item.cantidadPlanificada, 0),
        lineasSaturadas: capacitySummary.filter((item) => item.saturada).length,
        alertasCriticas: alerts.filter((item) => item.severidad === 'ALTA').length,
        riesgoFaltante: recalculatedDetails.filter((item) => item.riesgoFaltante).length,
        comprasRequeridas: recalculatedDetails.filter((item) => item.requiereCompra).length,
      },
    };

    return {
      plan: nextPlan,
      details: recalculatedDetails.sort((left, right) => comparePriority(left.prioridad, right.prioridad) || left.productoNombre.localeCompare(right.productoNombre, 'es-CO')),
      alerts,
      simulationLogs: existingLogs.map((item) => ({ ...item })),
      capacitySummary,
    };
  }

  private buildAlerts(details: MpsPlanDetail[], capacitySummary: MpsCapacitySummary[]): MpsAlert[] {
    const alerts: MpsAlert[] = [];

    capacitySummary.forEach((summary) => {
      if (!summary.saturada) {
        return;
      }

      alerts.push({
        id: `mps-alert-cap-${summary.lineaId}`,
        planId: details[0]?.planId ?? 'sin-plan',
        skuId: null,
        tipoAlerta: 'CAPACIDAD_INSUFICIENTE',
        severidad: summary.saturacionPct >= 115 ? 'ALTA' : 'MEDIA',
        descripcion: `${summary.lineaProduccion} en ${summary.planta} opera al ${summary.saturacionPct}% de capacidad.`,
      });
    });

    details.forEach((detail) => {
      if (detail.riesgoFaltante) {
        alerts.push({
          id: `mps-alert-short-${detail.id}`,
          planId: detail.planId,
          skuId: detail.skuId,
          tipoAlerta: 'RIESGO_FALTANTE',
          severidad: detail.cantidadPlanificada === 0 ? 'ALTA' : 'MEDIA',
          descripcion: `${detail.sku} aún compromete faltante frente a demanda, urgencias y stock de seguridad.`,
        });
      }

      if (detail.riesgoVencimiento) {
        alerts.push({
          id: `mps-alert-exp-${detail.id}`,
          planId: detail.planId,
          skuId: detail.skuId,
          tipoAlerta: 'RIESGO_VENCIMIENTO',
          severidad: detail.prioridad === 'ALTA' ? 'ALTA' : 'MEDIA',
          descripcion: `${detail.sku} conserva inventario próximo a vencer y exige secuencia FEFO disciplinada.`,
        });
      }

      if (!detail.materialDisponible) {
        alerts.push({
          id: `mps-alert-mat-${detail.id}`,
          planId: detail.planId,
          skuId: detail.skuId,
          tipoAlerta: 'MATERIA_PRIMA_INSUFICIENTE',
          severidad: detail.requiereCompra ? 'ALTA' : 'MEDIA',
          descripcion: `${detail.sku} requiere compra o aceleración de materia prima para cumplir el plan.`,
        });
      }

      if (detail.inventarioDisponible < detail.stockSeguridad) {
        alerts.push({
          id: `mps-alert-ss-${detail.id}`,
          planId: detail.planId,
          skuId: detail.skuId,
          tipoAlerta: 'STOCK_SEGURIDAD_COMPROMETIDO',
          severidad: 'MEDIA',
          descripcion: `${detail.sku} ya consume stock de seguridad antes de ejecutar producción.`,
        });
      }
    });

    return alerts.sort((left, right) => compareSeverity(right.severidad, left.severidad));
  }

  private selectPlan(store: MpsStore, companyId: string, filters: MpsPlanFilters): MpsPlanAggregate | null {
    const candidates = store.plans
      .filter((item) => item.plan.empresaId === companyId)
      .filter((item) => !filters.planta || item.plan.planta === filters.planta || item.plan.planta === 'Consolidado El Arbolito')
      .sort((left, right) => {
        const statusWeight = left.plan.estado === 'APROBADO' ? 2 : left.plan.estado === 'AJUSTADO' ? 1 : 0;
        const otherWeight = right.plan.estado === 'APROBADO' ? 2 : right.plan.estado === 'AJUSTADO' ? 1 : 0;

        if (statusWeight !== otherWeight) {
          return otherWeight - statusWeight;
        }

        return new Date(right.plan.fechaCreacion).getTime() - new Date(left.plan.fechaCreacion).getTime();
      });

    return candidates[0] ? this.cloneAggregate(candidates[0]) : null;
  }

  private filterPlanAggregate(aggregate: MpsPlanAggregate, filters: MpsPlanFilters): MpsPlanAggregate {
    const filteredDetails = aggregate.details.filter((detail) => {
      const matchesSku = !filters.skuId || detail.skuId === filters.skuId;
      const matchesFamily = !filters.familia || resolvePlanningFamilyBySku(detail.sku) === filters.familia;
      return matchesSku && matchesFamily;
    });
    const visibleSkuIds = new Set(filteredDetails.map((item) => item.skuId));
    const filteredAlerts = aggregate.alerts.filter((item) => item.skuId === null || visibleSkuIds.has(item.skuId));
    const filteredCapacity = aggregate.capacitySummary.filter((summary) =>
      filteredDetails.some((detail) => detail.lineaProduccion === summary.lineaProduccion),
    );

    return {
      ...this.cloneAggregate(aggregate),
      details: filteredDetails,
      alerts: filteredAlerts,
      capacitySummary: filteredCapacity.length ? filteredCapacity : aggregate.capacitySummary.map((item) => ({ ...item })),
    };
  }

  private buildCatalogs(companyId: string, store: MpsStore): MpsCatalogs {
    const products = this.readProducts(companyId).filter((item) => item.estado === 'ACTIVO' && item.familia === 'Producto terminado');
    const families = Array.from(new Set(products.map((item) => resolvePlanningFamily(item))));
    const lines = store.productionLines.filter((item) => item.empresaId === companyId);

    return {
      plants: [
        { value: '', label: 'Todas las plantas' },
        ...DEFAULT_PLANTS.map((item) => ({ value: item, label: item })),
      ],
      families: families.map((item) => ({ value: item, label: item })),
      skus: products
        .map((item) => ({
          value: item.id,
          label: `${item.sku} · ${item.nombre}`,
          skuId: item.id,
          sku: item.sku,
          productName: item.nombre,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
      lines: lines.map((item) => ({
        value: item.nombre,
        label: item.nombre,
        planta: item.planta,
      })),
      severities: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'MEDIA', label: 'Media' },
        { value: 'BAJA', label: 'Baja' },
      ],
    };
  }

  private resolvePlanningProducts(companyId: string, payload: GenerateMpsPlanPayload): Product[] {
    return this.readProducts(companyId)
      .filter((item) => item.estado === 'ACTIVO' && item.familia === 'Producto terminado')
      .filter((item) => !payload.skuId || item.id === payload.skuId)
      .filter((item) => !payload.familia || resolvePlanningFamily(item) === payload.familia)
      .filter((item) => !payload.planta || resolveDefaultPlant(item) === payload.planta)
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
  }

  private buildInventoryMap(
    companyId: string,
    planRange: { start: string; end: string },
    considerFefo: boolean,
  ): Map<string, InventoryInsight> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const qualityStore = this.readQualityStore();
    const latestQualityByLot = new Map<string, QualityLotStatus>();

    qualityStore.inspections
      .filter((item) => item.inspection.empresaId === companyId)
      .sort(
        (left, right) =>
          new Date(right.inspection.fechaMuestra).getTime() - new Date(left.inspection.fechaMuestra).getTime(),
      )
      .forEach((item) => {
        if (!latestQualityByLot.has(item.inspection.loteId)) {
          latestQualityByLot.set(item.inspection.loteId, item.inspection.estadoLote);
        }
      });

    const map = new Map<string, InventoryInsight>();
    layoutStore.lots
      .filter((item) => item.empresaId === companyId)
      .forEach((lot) => {
        const current = map.get(lot.skuId) ?? createEmptyInventoryInsight();
        const qualityStatus = latestQualityByLot.get(lot.id) ?? null;
        const expiringSoon = lot.fechaVencimiento ? daysBetween(planRange.start, lot.fechaVencimiento) <= 25 : false;
        const blocked = qualityStatus === 'RECHAZADO' || qualityStatus === 'CUARENTENA' || lot.estado === 'VENCIDO';
        const usableContribution = blocked
          ? 0
          : considerFefo || !expiringSoon
            ? lot.stockSistema
            : Math.round(lot.stockSistema * 0.55);

        map.set(lot.skuId, {
          totalStock: current.totalStock + lot.stockSistema,
          usableStock: current.usableStock + usableContribution,
          expiringSoonStock: current.expiringSoonStock + (expiringSoon ? lot.stockSistema : 0),
          hasBlockedLots: current.hasBlockedLots || blocked,
        });
      });

    return map;
  }

  private resolveBomProfiles(companyId: string): Map<string, BomProfile> {
    const store = this.readBomStore();
    const map = new Map<string, BomProfile>();

    store.formulas
      .filter((item) => item.formula.empresaId === companyId && item.formula.estado === 'VIGENTE')
      .forEach((item) => {
        map.set(item.formula.productoCodigo, {
          version: item.formula.version,
          rendimientoEsperado: item.formula.rendimientoEsperado,
          ingredients: item.ingredients.map((detail) => ({
            id: detail.ingredienteId,
            name: detail.ingredienteNombre,
            quantity: detail.cantidad,
            unit: detail.unidadMedida,
          })),
        });
      });

    Object.entries(FALLBACK_BOM_BY_SKU).forEach(([sku, bom]) => {
      if (!map.has(sku)) {
        map.set(sku, {
          version: bom.version,
          rendimientoEsperado: bom.rendimientoEsperado,
          ingredients: bom.ingredients.map((item) => ({ ...item })),
        });
      }
    });

    return map;
  }

  private resolveDemandBase(
    companyId: string,
    product: Product,
    planRange: { start: string; end: string },
  ): number {
    const forecastStore = this.readForecastStore();
    const approvedForecast =
      forecastStore.forecasts
        .filter((item) => item.forecast.empresaId === companyId && item.forecast.estado === 'APROBADO')
        .sort((left, right) => {
          if (left.forecast.isOfficialVersion !== right.forecast.isOfficialVersion) {
            return left.forecast.isOfficialVersion ? -1 : 1;
          }
          return right.forecast.version - left.forecast.version;
        })[0] ?? null;
    const fallbackDemand = computeFallbackDemand(product, planRange);

    if (!approvedForecast) {
      return fallbackDemand;
    }

    const totalDays = Math.max(1, daysBetween(approvedForecast.forecast.fechaInicio, approvedForecast.forecast.fechaFin) + 1);
    const overlapDaysCount = overlapDays(
      approvedForecast.forecast.fechaInicio,
      approvedForecast.forecast.fechaFin,
      planRange.start,
      planRange.end,
    );

    if (overlapDaysCount <= 0) {
      return fallbackDemand;
    }

    const rawForecast = approvedForecast.details
      .filter((detail) => detail.skuId === product.id)
      .reduce((sum, detail) => sum + detail.forecastFinal, 0);
    const scaled = Math.round((rawForecast / totalDays) * overlapDaysCount * resolvePlanningMultiplier(product));

    return Math.max(fallbackDemand, scaled);
  }

  private buildUrgentOrders(
    companyId: string,
    products: Product[],
    planRange: { start: string; end: string },
  ): UrgentOrder[] {
    if (companyId !== 'medussa-holding') {
      return [];
    }

    const bySku = new Map(products.map((item) => [item.sku, item]));
    const orders: UrgentOrder[] = [];

    if (bySku.has('ARB-YOG-200-FR')) {
      orders.push({
        id: 'uo-yog-1',
        skuId: bySku.get('ARB-YOG-200-FR')!.id,
        quantity: 420,
        dueDate: clampDate(dateWithOffset(planRange.start, 1), planRange.start, planRange.end),
        prioridad: 'ALTA',
        clienteNombre: 'Supertiendas Nuevo Sol',
        rutaNombre: 'Ruta Norte 1',
      });
    }

    if (bySku.has('ARB-UHT-1L')) {
      orders.push({
        id: 'uo-uht-1',
        skuId: bySku.get('ARB-UHT-1L')!.id,
        quantity: 820,
        dueDate: clampDate(dateWithOffset(planRange.start, 2), planRange.start, planRange.end),
        prioridad: 'ALTA',
        clienteNombre: 'Distribuciones Santa Ana',
        rutaNombre: 'Ruta Sur 2',
      });
    }

    if (bySku.has('ARB-QUE-500')) {
      orders.push({
        id: 'uo-que-1',
        skuId: bySku.get('ARB-QUE-500')!.id,
        quantity: 160,
        dueDate: clampDate(dateWithOffset(planRange.start, 3), planRange.start, planRange.end),
        prioridad: 'MEDIA',
        clienteNombre: 'Minimercados Faro',
        rutaNombre: 'Ruta Norte 2',
      });
    }

    return orders;
  }

  private evaluateMaterials(
    companyId: string,
    product: Product,
    quantity: number,
    productionDate: string,
    bomProfile: BomProfile | null,
  ): { materialAvailable: boolean; requiresPurchase: boolean } {
    if (!bomProfile || quantity <= 0) {
      return {
        materialAvailable: true,
        requiresPurchase: false,
      };
    }

    const suppliers = this.readSuppliers(companyId);
    const ratio = quantity / Math.max(1, bomProfile.rendimientoEsperado);

    const hasShortage = bomProfile.ingredients.some((ingredient) => {
      const requiredQty = ingredient.quantity * ratio;
      const availability = resolveMaterialAvailability(ingredient.name, suppliers);
      const daysToProduction = Math.max(0, daysBetween(todayDate(), productionDate));

      return (
        availability.availableQuantity < requiredQty ||
        (!!availability.leadTimeDays && availability.leadTimeDays > daysToProduction && availability.availableQuantity < requiredQty * 1.1)
      );
    });

    return {
      materialAvailable: !hasShortage,
      requiresPurchase: hasShortage,
    };
  }

  private validateGeneratePayload(companyId: string, payload: GenerateMpsPlanPayload): string | null {
    if (!companyId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!payload.fechaInicio || !payload.fechaFin) {
      return 'Debes definir un rango de fechas para el plan.';
    }

    if (new Date(payload.fechaInicio).getTime() > new Date(payload.fechaFin).getTime()) {
      return 'La fecha inicial no puede ser mayor que la fecha final.';
    }

    if (!this.resolvePlanningProducts(companyId, payload).length) {
      return 'No hay SKU productivos disponibles para los filtros seleccionados.';
    }

    return null;
  }

  private findPlan(store: MpsStore, companyId: string, planId: string): MpsPlanAggregate | null {
    const aggregate = store.plans.find((item) => item.plan.empresaId === companyId && item.plan.id === planId);
    return aggregate ? this.cloneAggregate(aggregate) : null;
  }

  private appendLog(
    aggregate: MpsPlanAggregate,
    payload: Omit<MpsSimulationLog, 'id' | 'planId' | 'fecha'>,
  ): MpsPlanAggregate {
    return {
      ...aggregate,
      simulationLogs: [
        {
          id: `mps-log-${aggregate.plan.id}-${Date.now()}`,
          planId: aggregate.plan.id,
          fecha: new Date().toISOString(),
          ...payload,
        },
        ...aggregate.simulationLogs.map((item) => ({ ...item })),
      ],
    };
  }

  private buildAuditDraft(
    action: MpsAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): MpsAuditDraft {
    return {
      module: 'mps',
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

  private sanitizeAggregate(aggregate: MpsPlanAggregate): Record<string, unknown> {
    return {
      plan: {
        id: aggregate.plan.id,
        planta: aggregate.plan.planta,
        estado: aggregate.plan.estado,
        fechaInicio: aggregate.plan.fechaInicio,
        fechaFin: aggregate.plan.fechaFin,
        considerarFEFO: aggregate.plan.considerarFEFO,
        considerarPedidosUrgentes: aggregate.plan.considerarPedidosUrgentes,
        resumenKpis: { ...aggregate.plan.resumenKpis },
      },
      details: aggregate.details.map((item) => ({
        sku: item.sku,
        fechaProduccion: item.fechaProduccion,
        lineaProduccion: item.lineaProduccion,
        cantidadPlanificada: item.cantidadPlanificada,
        horasRequeridas: item.horasRequeridas,
        requiereCompra: item.requiereCompra,
      })),
      alerts: aggregate.alerts.map((item) => ({
        tipoAlerta: item.tipoAlerta,
        severidad: item.severidad,
      })),
    };
  }

  private cloneAggregate(aggregate: MpsPlanAggregate): MpsPlanAggregate {
    return {
      plan: {
        ...aggregate.plan,
        resumenKpis: { ...aggregate.plan.resumenKpis },
      },
      details: aggregate.details.map((item) => ({ ...item })),
      alerts: aggregate.alerts.map((item) => ({ ...item })),
      simulationLogs: aggregate.simulationLogs.map((item) => ({ ...item })),
      capacitySummary: aggregate.capacitySummary.map((item) => ({ ...item })),
    };
  }

  private describePlanEntity(plan: MpsPlan): string {
    return `${plan.planta} · ${plan.fechaInicio} a ${plan.fechaFin}`;
  }

  private normalizeFilters(filters: MpsPlanFilters): MpsPlanFilters {
    return {
      ...DEFAULT_MPS_PLAN_FILTERS,
      ...filters,
      planta: filters.planta || null,
      familia: filters.familia || null,
      skuId: filters.skuId || null,
      considerarFEFO: filters.considerarFEFO ?? true,
      considerarPedidosUrgentes: filters.considerarPedidosUrgentes ?? true,
    };
  }

  private readProducts(companyId: string): Product[] {
    if (typeof window === 'undefined') {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);

    if (!raw) {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    try {
      const parsed = JSON.parse(raw) as ProductStore;
      return (parsed.products ?? [])
        .filter((item) => item.empresaId === companyId)
        .map((item) => ({ ...item }));
    } catch {
      return INITIAL_PRODUCTS_STORE.products.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }
  }

  private readSuppliers(companyId: string): Supplier[] {
    if (typeof window === 'undefined') {
      return INITIAL_SUPPLIERS_STORE.suppliers.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    const raw = localStorage.getItem(SUPPLIERS_STORAGE_KEY);

    if (!raw) {
      return INITIAL_SUPPLIERS_STORE.suppliers.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }

    try {
      const parsed = JSON.parse(raw) as SupplierStore;
      return (parsed.suppliers ?? [])
        .filter((item) => item.empresaId === companyId)
        .map((item) => ({ ...item }));
    } catch {
      return INITIAL_SUPPLIERS_STORE.suppliers.filter((item) => item.empresaId === companyId).map((item) => ({ ...item }));
    }
  }

  private readForecastStore(): DemandForecastStore {
    if (typeof window === 'undefined') {
      return { forecasts: [], auditTrail: [] };
    }

    const raw = localStorage.getItem(FORECAST_STORAGE_KEY);

    if (!raw) {
      return { forecasts: [], auditTrail: [] };
    }

    try {
      const parsed = JSON.parse(raw) as DemandForecastStore;
      return {
        forecasts: parsed.forecasts ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return { forecasts: [], auditTrail: [] };
    }
  }

  private readBomStore(): BomFormulaStore {
    if (typeof window === 'undefined') {
      return {
        formulas: [],
        histories: [],
        auditTrail: [],
      };
    }

    const raw = localStorage.getItem(BOM_STORAGE_KEY);

    if (!raw) {
      return {
        formulas: [],
        histories: [],
        auditTrail: [],
      };
    }

    try {
      const parsed = JSON.parse(raw) as BomFormulaStore;
      return {
        formulas: parsed.formulas ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return {
        formulas: [],
        histories: [],
        auditTrail: [],
      };
    }
  }

  private readQualityStore(): QualityControlStore {
    if (typeof window === 'undefined') {
      return {
        inspections: [],
        nonConformities: [],
        histories: [],
        auditTrail: [],
      };
    }

    const raw = localStorage.getItem(QUALITY_STORAGE_KEY);

    if (!raw) {
      return {
        inspections: [],
        nonConformities: [],
        histories: [],
        auditTrail: [],
      };
    }

    try {
      const parsed = JSON.parse(raw) as QualityControlStore;
      return {
        inspections: parsed.inspections ?? [],
        nonConformities: parsed.nonConformities ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      return {
        inspections: [],
        nonConformities: [],
        histories: [],
        auditTrail: [],
      };
    }
  }
}

function createEmptyStore(): MpsStore {
  return {
    plans: [],
    productionLines: [],
    auditTrail: [],
  };
}

function buildProductionLines(companyId: string): ProductionLine[] {
  if (companyId !== 'medussa-holding') {
    return [
      {
        id: `${companyId}-line-main`,
        empresaId: companyId,
        planta: 'Planta principal El Arbolito',
        nombre: 'Línea Principal',
        capacidadHorasSemana: 20,
        setupHoras: 1.2,
        skusCompatibles: [],
      },
    ];
  }

  return [
    {
      id: `${companyId}-line-yogurt`,
      empresaId: companyId,
      planta: 'Planta lácteos fríos',
      nombre: 'Línea Yogurt',
      capacidadHorasSemana: 18,
      setupHoras: 1.1,
      skusCompatibles: ['ARB-YOG-200-FR'],
    },
    {
      id: `${companyId}-line-uht`,
      empresaId: companyId,
      planta: 'Planta UHT',
      nombre: 'Línea UHT',
      capacidadHorasSemana: 20,
      setupHoras: 1.6,
      skusCompatibles: ['ARB-UHT-1L'],
    },
    {
      id: `${companyId}-line-cheese`,
      empresaId: companyId,
      planta: 'Planta lácteos fríos',
      nombre: 'Línea Quesos',
      capacidadHorasSemana: 12,
      setupHoras: 1.4,
      skusCompatibles: ['ARB-QUE-500'],
    },
    {
      id: `${companyId}-line-packaging`,
      empresaId: companyId,
      planta: 'Planta principal El Arbolito',
      nombre: 'Línea Empaque',
      capacidadHorasSemana: 10,
      setupHoras: 0.8,
      skusCompatibles: ['ARB-YOG-200-FR', 'ARB-UHT-1L', 'ARB-QUE-500'],
    },
  ];
}

function buildCapacitySummary(
  lines: ProductionLine[],
  details: MpsPlanDetail[],
  planRange: { start: string; end: string },
  capacityFactor: number,
): MpsCapacitySummary[] {
  return lines.map((line) => {
    const hours = details
      .filter((detail) => detail.lineaProduccion === line.nombre)
      .reduce((sum, detail) => sum + detail.horasRequeridas, 0);
    const available = Math.max(1, round(resolveLineCapacityForRange(line, planRange) * capacityFactor));
    const saturation = available ? Math.round((hours / available) * 100) : 0;

    return {
      lineaId: line.id,
      lineaProduccion: line.nombre,
      planta: line.planta,
      horasPlanificadas: round(hours),
      capacidadHorasDisponibles: available,
      saturacionPct: saturation,
      saturada: saturation > 100,
    };
  });
}

function resolvePlanningFamily(product: Product): string {
  const normalized = normalize(product.nombre);

  if (normalized.includes('yogurt')) {
    return 'Yogurt';
  }

  if (normalized.includes('uht') || normalized.includes('leche')) {
    return 'UHT';
  }

  if (normalized.includes('queso')) {
    return 'Quesos';
  }

  return product.familia;
}

function resolvePlanningFamilyBySku(sku: string): string {
  const normalized = normalize(sku);

  if (normalized.includes('yog')) {
    return 'Yogurt';
  }

  if (normalized.includes('uht') || normalized.includes('le')) {
    return 'UHT';
  }

  if (normalized.includes('que')) {
    return 'Quesos';
  }

  return 'Producto terminado';
}

function resolveDefaultPlant(product: Product | null): string {
  if (!product) {
    return 'Planta principal El Arbolito';
  }

  const family = resolvePlanningFamily(product);
  if (family === 'Yogurt' || family === 'Quesos') {
    return 'Planta lácteos fríos';
  }

  if (family === 'UHT') {
    return 'Planta UHT';
  }

  return 'Planta principal El Arbolito';
}

function resolveDefaultLine(
  product: Product | null,
  lines: ProductionLine[],
  forcedPlant: string | null,
): ProductionLine {
  const defaultPlant = forcedPlant || resolveDefaultPlant(product);

  return (
    lines.find((line) => !!product && line.skusCompatibles.includes(product.sku)) ??
    lines.find((line) => line.planta === defaultPlant) ??
    lines[0]
  );
}

function resolvePackFactor(product: Product): number {
  return Math.max(1, product.factorConversion ?? 1);
}

function resolvePackFactorBySku(sku: string): number {
  if (sku === 'ARB-YOG-200-FR') {
    return 24;
  }

  if (sku === 'ARB-UHT-1L') {
    return 12;
  }

  if (sku === 'ARB-QUE-500') {
    return 20;
  }

  return 1;
}

function resolvePlanningMultiplier(product: Product): number {
  const family = resolvePlanningFamily(product);

  if (family === 'Yogurt') {
    return 14;
  }

  if (family === 'UHT') {
    return 16;
  }

  if (family === 'Quesos') {
    return 11;
  }

  return 8;
}

function computeFallbackDemand(product: Product, planRange: { start: string; end: string }): number {
  const baseBySku: Record<string, number> = {
    'ARB-YOG-200-FR': 380,
    'ARB-UHT-1L': 520,
    'ARB-QUE-500': 190,
  };
  const days = Math.max(1, daysBetween(planRange.start, planRange.end) + 1);
  const weeklyBase = baseBySku[product.sku] ?? 120;

  return Math.round((weeklyBase / 7) * days);
}

function computeSafetyStock(product: Product, demandTotal: number): number {
  const family = resolvePlanningFamily(product);
  const multiplier = family === 'Yogurt' ? 0.42 : family === 'Quesos' ? 0.38 : 0.3;
  return Math.max(Math.round((product.factorConversion ?? 1) * 4), Math.round(demandTotal * multiplier));
}

function resolveSuggestedProductionDate(
  product: Product,
  planRange: { start: string; end: string },
  urgentOrders: UrgentOrder[],
  inventory: InventoryInsight,
): string {
  const urgent = urgentOrders.find((item) => item.skuId === product.id) ?? null;

  if (urgent) {
    return clampDate(dateWithOffset(urgent.dueDate, -1), planRange.start, planRange.end);
  }

  if (inventory.expiringSoonStock > 0) {
    return clampDate(dateWithOffset(planRange.start, 1), planRange.start, planRange.end);
  }

  return clampDate(dateWithOffset(planRange.start, 3), planRange.start, planRange.end);
}

function resolvePriority(urgentQty: number, riskExpiry: boolean, plannedQty: number): MpsPriority {
  if (urgentQty > 0 || riskExpiry) {
    return 'ALTA';
  }

  if (plannedQty > 0) {
    return 'MEDIA';
  }

  return 'BAJA';
}

function computeRequiredHours(product: Product, quantity: number, line: ProductionLine): number {
  if (quantity <= 0) {
    return 0;
  }

  const normalized = normalize(product.nombre);
  const hoursPerUnit =
    normalized.includes('yogurt')
      ? 0.026
      : normalized.includes('uht') || normalized.includes('leche')
        ? 0.02
        : normalized.includes('queso')
          ? 0.043
          : 0.03;

  return round(quantity * hoursPerUnit + line.setupHoras);
}

function resolveLineCapacityForRange(line: ProductionLine, planRange: { start: string; end: string }): number {
  const days = Math.max(1, daysBetween(planRange.start, planRange.end) + 1);
  return round((line.capacidadHorasSemana / 7) * days);
}

function roundToPack(quantity: number, packFactor: number): number {
  if (quantity <= 0) {
    return 0;
  }

  return Math.ceil(quantity / Math.max(1, packFactor)) * Math.max(1, packFactor);
}

function resolveMaterialAvailability(name: string, suppliers: Supplier[]): MaterialAvailability {
  const normalized = normalize(name);
  const direct = MATERIAL_AVAILABILITY_LIBRARY[normalized];

  if (!direct) {
    return {
      availableQuantity: 999999,
      leadTimeDays: suppliers[0]?.leadTimeDias ?? null,
      supplierName: suppliers[0]?.nombreProveedor ?? null,
    };
  }

  const supplier = suppliers.find((item) => normalize(item.nombreProveedor) === normalize(direct.supplierName));

  return {
    availableQuantity: direct.availableQuantity,
    leadTimeDays: supplier?.leadTimeDias ?? direct.leadTimeDays,
    supplierName: supplier?.nombreProveedor ?? direct.supplierName,
  };
}

function overlapDays(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): number {
  const start = Math.max(new Date(`${startA}T00:00:00`).getTime(), new Date(`${startB}T00:00:00`).getTime());
  const end = Math.min(new Date(`${endA}T00:00:00`).getTime(), new Date(`${endB}T00:00:00`).getTime());

  if (end < start) {
    return 0;
  }

  return Math.floor((end - start) / 86400000) + 1;
}

function daysBetween(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00`).getTime();
  const to = new Date(`${end}T00:00:00`).getTime();
  return Math.round((to - from) / 86400000);
}

function createEmptyInventoryInsight(): InventoryInsight {
  return {
    totalStock: 0,
    usableStock: 0,
    expiringSoonStock: 0,
    hasBlockedLots: false,
  };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateWithOffset(base: string, offsetDays: number): string {
  const current = new Date(`${base}T00:00:00`);
  current.setDate(current.getDate() + offsetDays);
  return current.toISOString().slice(0, 10);
}

function clampDate(value: string, min: string, max: string): string {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function comparePriority(left: MpsPriority, right: MpsPriority): number {
  const weight: Record<MpsPriority, number> = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return weight[right] - weight[left];
}

function compareSeverity(left: 'ALTA' | 'MEDIA' | 'BAJA', right: 'ALTA' | 'MEDIA' | 'BAJA'): number {
  const weight = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return weight[left] - weight[right];
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
