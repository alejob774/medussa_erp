import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore, ProductAuditDraft } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { Supplier } from '../../../suppliers/domain/models/supplier.model';
import { SupplierStore } from '../../../suppliers/domain/models/supplier-response.model';
import { INITIAL_SUPPLIERS_STORE } from '../../../suppliers/infrastructure/data/suppliers.mock';
import { DemandForecastAggregate } from '../../../demand-forecast/domain/models/demand-forecast.model';
import { DemandForecastStore } from '../../../demand-forecast/domain/models/demand-forecast-response.model';
import {
  DEFAULT_PRODUCT_DEVELOPMENT_FILTERS,
  ProductDevelopmentFilters,
} from '../../domain/models/product-development-filters.model';
import {
  ProductDevelopmentCatalogs,
  ProductDevelopmentDashboard,
  ProductDevelopmentProject,
  ProductDevelopmentProjectAggregate,
} from '../../domain/models/product-development-project.model';
import { ProductDevelopmentBomItem } from '../../domain/models/product-development-bom-item.model';
import {
  ProductDevelopmentAuditDraft,
  ProductDevelopmentMutationResult,
  ProductDevelopmentStore,
} from '../../domain/models/product-development-response.model';
import {
  ProductDevelopmentRiskSummary,
  ProductDevelopmentRiskLevel,
  ProductDevelopmentViability,
} from '../../domain/models/product-development-risk.model';
import { ProductDevelopmentKpis } from '../../domain/models/product-development-kpi.model';
import {
  ProductDevelopmentBomPayload,
  ProductDevelopmentDecisionPayload,
  ProductDevelopmentRepository,
  ProductDevelopmentSavePayload,
} from '../../domain/repositories/product-development.repository';

const STORAGE_KEY = 'medussa.erp.mock.product-development';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const SUPPLIERS_STORAGE_KEY = 'medussa.erp.mock.suppliers';
const FORECAST_STORAGE_KEY = 'medussa.erp.mock.demand-forecasts';

const EL_ARBOLITO_NAME = 'Industrias Alimenticias El Arbolito';
const CATEGORIES = ['Lacteos', 'Yogures', 'Quesos', 'Bebidas', 'Postres', 'Innovacion logistica'];
const TARGET_MARKETS = [
  'Retail moderno',
  'Tradicional / TAT',
  'Mayorista / Distribuidor',
  'Institucional',
  'Cliente clave',
];
const RESPONSABLES = [
  'Maria Fernanda Rivas',
  'Alvaro Rivas',
  'Camila Soto',
  'Jorge Tellez',
  'Brayan Castro',
];

@Injectable({
  providedIn: 'root',
})
export class ProductDevelopmentMockRepository implements ProductDevelopmentRepository {
  getDashboard(companyId: string, filters: ProductDevelopmentFilters): Observable<ProductDevelopmentDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureBaseline(this.readStore(), companyId);
    const catalogs = this.buildCatalogs(companyId);
    const projects = store.projects
      .filter((aggregate) => aggregate.project.empresaId === companyId)
      .filter((aggregate) => this.matchesFilters(aggregate.project, normalizedFilters))
      .sort((left, right) => new Date(right.project.fechaCreacion).getTime() - new Date(left.project.fechaCreacion).getTime())
      .map((aggregate) => this.cloneAggregate(aggregate));

    return of({
      filters: normalizedFilters,
      catalogs,
      kpis: this.buildKpis(projects),
      projects,
      selectedProject: projects[0] ?? null,
    }).pipe(delay(160));
  }

  saveProject(
    companyId: string,
    payload: ProductDevelopmentSavePayload,
    projectId?: string,
  ): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const current = projectId ? this.findProject(store, companyId, projectId) : null;
    const validation = this.validateProjectPayload(companyId, payload, projectId);
    if (validation) {
      return throwError(() => new Error(validation));
    }

    const project: ProductDevelopmentProject = {
      id: current?.project.id ?? `innovation-${Date.now()}`,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      nombreProducto: payload.nombreProducto.trim(),
      categoria: payload.categoria.trim(),
      skuPropuesto: payload.skuPropuesto.trim().toUpperCase(),
      mercadoObjetivo: payload.mercadoObjetivo.trim(),
      proyeccionVentas: payload.proyeccionVentas ?? null,
      fechaLanzamiento: payload.fechaLanzamiento,
      responsableProyecto: payload.responsableProyecto.trim(),
      costoEstimado: current?.project.costoEstimado ?? null,
      margenEstimado: current?.project.margenEstimado ?? null,
      capacidadRequerida: payload.capacidadRequerida ?? null,
      capacidadDisponible: payload.capacidadDisponible ?? null,
      viabilidadGeneral: current?.project.viabilidadGeneral ?? null,
      riesgoAbastecimiento: current?.project.riesgoAbastecimiento ?? null,
      riesgoOperativo: current?.project.riesgoOperativo ?? null,
      riesgoLogistico: current?.project.riesgoLogistico ?? null,
      proveedoresCriticos: [...payload.proveedoresCriticos],
      materialesCriticos: [...payload.materialesCriticos],
      estadoProyecto: current?.project.estadoProyecto ?? 'BORRADOR',
      fechaCreacion: current?.project.fechaCreacion ?? new Date().toISOString(),
      fechaDecision: current?.project.fechaDecision ?? null,
      observaciones: payload.observaciones?.trim() || null,
      productoMaestroCreado: current?.project.productoMaestroCreado ?? false,
      productoMaestroId: current?.project.productoMaestroId ?? null,
    };
    const aggregate: ProductDevelopmentProjectAggregate = {
      project,
      bom: current?.bom.map((item) => ({ ...item })) ?? [],
      risks: this.buildRiskSummary(project, current?.bom ?? []),
    };
    const nextStore = {
      ...store,
      projects: current
        ? store.projects.map((item) => (item.project.id === project.id ? aggregate : item))
        : [aggregate, ...store.projects],
      auditTrail: [
        this.buildAuditDraft(
          current ? 'update' : 'create',
          aggregate,
          current ? `Actualizacion del proyecto ${project.nombreProducto}.` : `Creacion del proyecto ${project.nombreProducto}.`,
          current ? this.sanitizeAggregate(current) : null,
          this.sanitizeAggregate(aggregate),
        ),
        ...store.auditTrail,
      ],
    };

    this.writeStore(nextStore);
    return of<ProductDevelopmentMutationResult>({
      action: current ? 'updated' : 'created',
      project: this.cloneAggregate(aggregate),
      message: current ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.',
      auditDraft: nextStore.auditTrail[0],
    }).pipe(delay(220));
  }

  saveBomItem(companyId: string, projectId: string, payload: ProductDevelopmentBomPayload, bomItemId?: string): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));

    const item: ProductDevelopmentBomItem = {
      id: bomItemId ?? `bom-${Date.now()}`,
      proyectoId: projectId,
      itemCodigo: payload.itemCodigo.trim().toUpperCase(),
      descripcion: payload.descripcion.trim(),
      cantidad: payload.cantidad,
      unidadMedida: payload.unidadMedida.trim().toUpperCase(),
      costoEstimado: payload.costoEstimado,
    };
    const bom = bomItemId
      ? aggregate.bom.map((current) => (current.id === bomItemId ? item : current))
      : [item, ...aggregate.bom];
    const nextAggregate = this.recalculateAggregate({ ...aggregate, bom });
    return this.commitMutation(
      store,
      nextAggregate,
      bomItemId ? 'update' : 'update',
      bomItemId ? 'Item BOM actualizado.' : 'Item BOM agregado.',
      bomItemId ? 'updated' : 'updated',
      aggregate,
    );
  }

  deleteBomItem(companyId: string, projectId: string, bomItemId: string): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));
    const nextAggregate = this.recalculateAggregate({
      ...aggregate,
      bom: aggregate.bom.filter((item) => item.id !== bomItemId),
    });
    return this.commitMutation(store, nextAggregate, 'update', 'Item BOM eliminado.', 'updated', aggregate);
  }

  evaluateProject(companyId: string, projectId: string): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));
    const nextAggregate = this.recalculateAggregate({
      ...aggregate,
      project: {
        ...aggregate.project,
        estadoProyecto: 'EN_EVALUACION',
      },
    });
    return this.commitMutation(store, nextAggregate, 'evaluate', 'Proyecto evaluado con logica mock.', 'evaluated', aggregate);
  }

  approveProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));
    const current = this.recalculateAggregate(aggregate);
    const validation = this.validateApproval(current);
    if (validation) return throwError(() => new Error(validation));
    const nextAggregate = {
      ...current,
      project: {
        ...current.project,
        estadoProyecto: 'APROBADO' as const,
        fechaDecision: new Date().toISOString(),
        observaciones: payload.observaciones?.trim() || current.project.observaciones || null,
      },
    };
    return this.commitMutation(store, nextAggregate, 'approve', `Proyecto aprobado por ${payload.usuario}.`, 'approved', aggregate);
  }

  rejectProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));
    if (!payload.observaciones?.trim()) {
      return throwError(() => new Error('Debes registrar una observacion para rechazar el proyecto.'));
    }
    const nextAggregate = {
      ...aggregate,
      project: {
        ...aggregate.project,
        estadoProyecto: 'RECHAZADO' as const,
        fechaDecision: new Date().toISOString(),
        observaciones: payload.observaciones.trim(),
      },
    };
    return this.commitMutation(store, nextAggregate, 'reject', `Proyecto rechazado por ${payload.usuario}.`, 'rejected', aggregate);
  }

  launchProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    const store = this.readStore();
    const aggregate = this.findProject(store, companyId, projectId);
    if (!aggregate) return throwError(() => new Error('No se encontro el proyecto seleccionado.'));
    const current = this.recalculateAggregate(aggregate);
    if (current.project.estadoProyecto !== 'APROBADO') {
      return throwError(() => new Error('Solo un proyecto aprobado puede crear producto maestro.'));
    }
    const creationError = this.createMasterProduct(current.project, current.bom, payload.usuario);
    if (creationError) {
      return throwError(() => new Error(creationError));
    }
    const nextAggregate = {
      ...current,
      project: {
        ...current.project,
        estadoProyecto: 'LANZADO' as const,
        productoMaestroCreado: true,
        productoMaestroId: `product-${current.project.skuPropuesto.toLowerCase()}`,
        fechaDecision: new Date().toISOString(),
        observaciones: payload.observaciones?.trim() || current.project.observaciones || null,
      },
    };
    return this.commitMutation(store, nextAggregate, 'launch', `Producto maestro creado por ${payload.usuario}.`, 'launched', aggregate);
  }

  private readStore(): ProductDevelopmentStore {
    if (typeof window === 'undefined') return { projects: [], auditTrail: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { projects: [], auditTrail: [] };
      this.writeStore(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw) as ProductDevelopmentStore;
      return { projects: parsed.projects ?? [], auditTrail: parsed.auditTrail ?? [] };
    } catch {
      const fallback = { projects: [], auditTrail: [] };
      this.writeStore(fallback);
      return fallback;
    }
  }

  private writeStore(store: ProductDevelopmentStore): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private readProductsStore(): ProductStore {
    if (typeof window === 'undefined') return structuredClone(INITIAL_PRODUCTS_STORE);
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return structuredClone(INITIAL_PRODUCTS_STORE);
    try {
      return JSON.parse(raw) as ProductStore;
    } catch {
      return structuredClone(INITIAL_PRODUCTS_STORE);
    }
  }

  private writeProductsStore(store: ProductStore): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(store));
  }

  private readSuppliers(): Supplier[] {
    if (typeof window === 'undefined') return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers);
    const raw = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (!raw) return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers);
    try {
      return (JSON.parse(raw) as SupplierStore).suppliers ?? structuredClone(INITIAL_SUPPLIERS_STORE.suppliers);
    } catch {
      return structuredClone(INITIAL_SUPPLIERS_STORE.suppliers);
    }
  }

  private readApprovedForecast(companyId: string): DemandForecastAggregate | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(FORECAST_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DemandForecastStore;
      return (
        (parsed.forecasts ?? [])
          .filter((item) => item.forecast.empresaId === companyId)
          .filter((item) => item.forecast.estado === 'APROBADO')
          .sort((left, right) => right.forecast.version - left.forecast.version)[0] ?? null
      );
    } catch {
      return null;
    }
  }

  private ensureBaseline(store: ProductDevelopmentStore, companyId: string): ProductDevelopmentStore {
    const exists = store.projects.some((item) => item.project.empresaId === companyId);
    if (exists) return store;

    const seed: ProductDevelopmentProjectAggregate = this.recalculateAggregate({
      project: {
        id: `innovation-seed-${companyId}`,
        empresaId: companyId,
        empresaNombre: this.resolveCompanyName(companyId),
        nombreProducto: 'Yogurt proteico vainilla 250 ml',
        categoria: 'Yogures',
        skuPropuesto: 'ARB-YOG-250-PRO',
        mercadoObjetivo: 'Retail moderno',
        proyeccionVentas: 8400,
        fechaLanzamiento: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().slice(0, 10),
        responsableProyecto: 'Maria Fernanda Rivas',
        costoEstimado: null,
        margenEstimado: null,
        capacidadRequerida: 72,
        capacidadDisponible: 90,
        viabilidadGeneral: null,
        riesgoAbastecimiento: null,
        riesgoOperativo: null,
        riesgoLogistico: null,
        proveedoresCriticos: ['Lacteos Andinos SAS', 'Empaques Flex del Norte'],
        materialesCriticos: ['Base proteica', 'Sabor vainilla', 'Doypack 250 ml'],
        estadoProyecto: 'BORRADOR',
        fechaCreacion: new Date().toISOString(),
        fechaDecision: null,
        observaciones: 'Proyecto semilla HU-027 para portafolio de innovacion.',
        productoMaestroCreado: false,
        productoMaestroId: null,
      },
      bom: [
        {
          id: `seed-bom-1-${companyId}`,
          proyectoId: `innovation-seed-${companyId}`,
          itemCodigo: 'MAT-PRO-001',
          descripcion: 'Base proteica lactea',
          cantidad: 1.2,
          unidadMedida: 'KG',
          costoEstimado: 14800,
        },
        {
          id: `seed-bom-2-${companyId}`,
          proyectoId: `innovation-seed-${companyId}`,
          itemCodigo: 'EMP-250-DP',
          descripcion: 'Doypack 250 ml',
          cantidad: 1,
          unidadMedida: 'UND',
          costoEstimado: 260,
        },
      ],
      risks: {
        skuDuplicado: false,
        bomIncompleta: false,
        lanzamientoProximo: false,
        proveedorCriticoUnico: false,
        insumoNoCubierto: false,
      },
    });

    const nextStore = {
      ...store,
      projects: [seed, ...store.projects],
    };
    this.writeStore(nextStore);
    return nextStore;
  }

  private buildCatalogs(companyId: string): ProductDevelopmentCatalogs {
    const suppliers = this.readSuppliers()
      .filter((supplier) => supplier.empresaId === companyId)
      .filter((supplier) => supplier.estado === 'ACTIVO');

    return {
      categories: CATEGORIES.map((value) => ({ value, label: value })),
      targetMarkets: TARGET_MARKETS.map((value) => ({ value, label: value })),
      responsables: RESPONSABLES.map((value) => ({ value, label: value })),
      units: ['UND', 'KG', 'LT', 'CJ'].map((value) => ({ value, label: value })),
      suppliers: suppliers.map((supplier) => ({ value: supplier.nombreProveedor, label: supplier.nombreProveedor })),
      statuses: ['BORRADOR', 'EN_EVALUACION', 'APROBADO', 'RECHAZADO', 'LANZADO'].map((value) => ({ value, label: value })),
      viabilities: ['ALTA', 'MEDIA', 'BAJA'].map((value) => ({ value, label: value })),
      riskLevels: ['ALTO', 'MEDIO', 'BAJO'].map((value) => ({ value, label: value })),
    };
  }

  private buildKpis(projects: ProductDevelopmentProjectAggregate[]): ProductDevelopmentKpis {
    const now = new Date();
    const next45 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 45).getTime();
    return {
      activeProjects: projects.filter((item) => !['RECHAZADO', 'LANZADO'].includes(item.project.estadoProyecto)).length,
      evaluatingProjects: projects.filter((item) => item.project.estadoProyecto === 'EN_EVALUACION').length,
      approvedProjects: projects.filter((item) => item.project.estadoProyecto === 'APROBADO').length,
      rejectedProjects: projects.filter((item) => item.project.estadoProyecto === 'RECHAZADO').length,
      blockedByHighRisk: projects.filter((item) => [item.project.riesgoAbastecimiento, item.project.riesgoOperativo, item.project.riesgoLogistico].includes('ALTO')).length,
      upcomingLaunches: projects.filter((item) => {
        const launch = new Date(`${item.project.fechaLanzamiento}T00:00:00`).getTime();
        return launch >= now.getTime() && launch <= next45;
      }).length,
    };
  }

  private validateProjectPayload(companyId: string, payload: ProductDevelopmentSavePayload, projectId?: string): string | null {
    if (!payload.nombreProducto.trim()) return 'El nombre del producto es obligatorio.';
    if (!payload.categoria.trim()) return 'La categoria es obligatoria.';
    if (!payload.skuPropuesto.trim()) return 'El SKU propuesto es obligatorio.';
    if (!payload.mercadoObjetivo.trim()) return 'El mercado objetivo es obligatorio.';
    if (!payload.fechaLanzamiento) return 'La fecha de lanzamiento es obligatoria.';
    if (!payload.responsableProyecto.trim()) return 'El responsable del proyecto es obligatorio.';

    const duplicatedProjectSku = this.readStore().projects.some(
      (item) =>
        item.project.empresaId === companyId &&
        item.project.id !== projectId &&
        item.project.skuPropuesto.trim().toUpperCase() === payload.skuPropuesto.trim().toUpperCase(),
    );
    const duplicatedProductSku = this.readProductsStore().products.some(
      (product) =>
        product.empresaId === companyId &&
        product.sku.trim().toUpperCase() === payload.skuPropuesto.trim().toUpperCase(),
    );
    if (duplicatedProjectSku || duplicatedProductSku) {
      return 'El SKU propuesto ya existe en el portafolio actual.';
    }

    return null;
  }

  private validateApproval(aggregate: ProductDevelopmentProjectAggregate): string | null {
    if (!aggregate.bom.length) return 'Debes cargar BOM preliminar antes de aprobar.';
    if (!aggregate.project.viabilidadGeneral) return 'Debes evaluar la viabilidad del proyecto antes de aprobar.';
    if (!aggregate.project.riesgoAbastecimiento || !aggregate.project.riesgoOperativo || !aggregate.project.riesgoLogistico) {
      return 'Debes tener visibles los riesgos supply chain antes de aprobar.';
    }
    if (aggregate.risks.skuDuplicado || aggregate.risks.bomIncompleta) {
      return 'El proyecto sigue bloqueado por SKU duplicado o BOM incompleta.';
    }
    return null;
  }

  private recalculateAggregate(aggregate: ProductDevelopmentProjectAggregate): ProductDevelopmentProjectAggregate {
    const bomCost = aggregate.bom.reduce((total, item) => total + item.cantidad * item.costoEstimado, 0);
    const forecast = this.readApprovedForecast(aggregate.project.empresaId);
    const demandScore = this.resolveDemandSignal(forecast, aggregate.project.categoria);
    const unitPrice = this.resolveUnitPrice(aggregate.project.categoria, aggregate.project.mercadoObjetivo);
    const margin = unitPrice > 0 ? Math.round(((unitPrice - bomCost) / unitPrice) * 100) : null;
    const capacityGap =
      aggregate.project.capacidadDisponible !== null && aggregate.project.capacidadRequerida !== null
        ? aggregate.project.capacidadDisponible - aggregate.project.capacidadRequerida
        : null;
    const riesgoAbastecimiento = this.resolveSupplyRisk(aggregate.project, aggregate.bom);
    const riesgoOperativo = capacityGap === null ? 'MEDIO' : capacityGap >= 15 ? 'BAJO' : capacityGap >= 0 ? 'MEDIO' : 'ALTO';
    const riesgoLogistico = aggregate.project.mercadoObjetivo.includes('Tradicional') ? 'MEDIO' : aggregate.project.mercadoObjetivo.includes('Mayorista') ? 'ALTO' : 'BAJO';
    const viabilityScore =
      demandScore +
      (margin !== null ? (margin >= 30 ? 35 : margin >= 18 ? 22 : 10) : 8) +
      (riesgoAbastecimiento === 'BAJO' ? 18 : riesgoAbastecimiento === 'MEDIO' ? 10 : 2) +
      (riesgoOperativo === 'BAJO' ? 15 : riesgoOperativo === 'MEDIO' ? 8 : 2);
    const viabilidadGeneral: ProductDevelopmentViability =
      viabilityScore >= 78 ? 'ALTA' : viabilityScore >= 54 ? 'MEDIA' : 'BAJA';
    const risks = this.buildRiskSummary(
      {
        ...aggregate.project,
        costoEstimado: Math.round(bomCost) || null,
        margenEstimado: margin,
        viabilidadGeneral,
        riesgoAbastecimiento,
        riesgoOperativo,
        riesgoLogistico,
        estadoProyecto:
          aggregate.project.estadoProyecto === 'BORRADOR' ? 'EN_EVALUACION' : aggregate.project.estadoProyecto,
      },
      aggregate.bom,
    );

    return {
      project: {
        ...aggregate.project,
        costoEstimado: Math.round(bomCost) || null,
        margenEstimado: margin,
        viabilidadGeneral,
        riesgoAbastecimiento,
        riesgoOperativo,
        riesgoLogistico,
        estadoProyecto:
          aggregate.project.estadoProyecto === 'BORRADOR' ? 'EN_EVALUACION' : aggregate.project.estadoProyecto,
      },
      bom: aggregate.bom.map((item) => ({ ...item })),
      risks,
    };
  }

  private buildRiskSummary(project: ProductDevelopmentProject, bom: ProductDevelopmentBomItem[]): ProductDevelopmentRiskSummary {
    const suppliers = this.readSuppliers()
      .filter((supplier) => supplier.empresaId === project.empresaId)
      .filter((supplier) => supplier.estado === 'ACTIVO');
    const now = new Date();
    const launch = new Date(`${project.fechaLanzamiento}T00:00:00`);
    const daysToLaunch = Math.ceil((launch.getTime() - now.getTime()) / 86400000);
    const skuDuplicado = this.readProductsStore().products.some(
      (product) => product.empresaId === project.empresaId && product.sku === project.skuPropuesto,
    );
    const coveredMaterials = new Set(
      suppliers.map((supplier) => this.normalizeText(`${supplier.nombreProveedor} ${supplier.productoPrincipal}`)),
    );
    const uncoveredMaterial = project.materialesCriticos.some(
      (material) => !Array.from(coveredMaterials).some((entry) => entry.includes(this.normalizeText(material))),
    );

    return {
      skuDuplicado,
      bomIncompleta: bom.length === 0 || bom.some((item) => !item.descripcion || item.cantidad <= 0 || item.costoEstimado <= 0),
      lanzamientoProximo: daysToLaunch >= 0 && daysToLaunch <= 30,
      proveedorCriticoUnico: project.proveedoresCriticos.length <= 1,
      insumoNoCubierto: uncoveredMaterial,
    };
  }

  private resolveSupplyRisk(project: ProductDevelopmentProject, bom: ProductDevelopmentBomItem[]): ProductDevelopmentRiskLevel {
    const supplierRisk = project.proveedoresCriticos.length <= 1 ? 3 : project.proveedoresCriticos.length === 2 ? 2 : 1;
    const materialRisk = project.materialesCriticos.length >= 4 ? 3 : project.materialesCriticos.length >= 2 ? 2 : 1;
    const bomRisk = bom.length >= 5 ? 2 : 1;
    const score = supplierRisk + materialRisk + bomRisk;
    return score >= 7 ? 'ALTO' : score >= 5 ? 'MEDIO' : 'BAJO';
  }

  private resolveDemandSignal(forecast: DemandForecastAggregate | null, category: string): number {
    if (!forecast) return 18;
    const categoryHint = this.normalizeText(category);
    const total = forecast.details
      .filter((detail) => this.normalizeText(detail.productoNombre).includes(categoryHint.slice(0, 4)))
      .reduce((sum, detail) => sum + detail.forecastFinal, 0);
    if (total >= 9000) return 32;
    if (total >= 4500) return 24;
    return 16;
  }

  private resolveUnitPrice(category: string, market: string): number {
    const base = category === 'Yogures' ? 3600 : category === 'Quesos' ? 9800 : category === 'Bebidas' ? 4200 : category === 'Postres' ? 5300 : 2800;
    const factor = market.includes('Retail') ? 1.08 : market.includes('Mayorista') ? 0.94 : 1;
    return Math.round(base * factor);
  }

  private createMasterProduct(project: ProductDevelopmentProject, bom: ProductDevelopmentBomItem[], usuario: string): string | null {
    const productsStore = this.readProductsStore();
    const exists = productsStore.products.some(
      (product) => product.empresaId === project.empresaId && product.sku === project.skuPropuesto,
    );
    if (exists) return 'El SKU ya existe en el maestro de productos.';

    const product: Product = {
      id: `product-${project.skuPropuesto.toLowerCase()}`,
      empresaId: project.empresaId,
      empresaNombre: project.empresaNombre,
      nombre: project.nombreProducto,
      descripcion: `Producto creado desde HU-027. BOM preliminar con ${bom.length} items y enfoque ${project.mercadoObjetivo}.`,
      sku: project.skuPropuesto,
      familia: project.categoria === 'Innovacion logistica' ? 'Consumo interno' : 'Producto terminado',
      unidadBase: 'UND',
      referencia: `NPD-${project.categoria.slice(0, 3).toUpperCase()}`,
      manejaLote: true,
      manejaVencimiento: true,
      vidaUtilDias: 45,
      factorConversion: 12,
      precioBruto: project.costoEstimado ? Math.round(project.costoEstimado * 1.35) : 0,
      precioNeto: project.costoEstimado ? Math.round(project.costoEstimado * 1.12) : 0,
      estado: 'ACTIVO',
      tieneMovimientos: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const productAudit: ProductAuditDraft = {
      module: 'productos',
      action: 'create',
      companyId: project.empresaId,
      companyName: project.empresaNombre,
      entityId: product.id,
      entityName: product.nombre,
      summary: `Producto maestro creado desde Desarrollo de Productos por ${usuario}.`,
      occurredAt: new Date().toISOString(),
      beforePayload: null,
      afterPayload: {
        id: product.id,
        nombre: product.nombre,
        sku: product.sku,
        familia: product.familia,
        empresaId: product.empresaId,
      },
    };
    this.writeProductsStore({
      ...productsStore,
      products: [product, ...productsStore.products],
      auditTrail: [productAudit, ...(productsStore.auditTrail ?? [])],
    });
    return null;
  }

  private commitMutation(
    store: ProductDevelopmentStore,
    aggregate: ProductDevelopmentProjectAggregate,
    auditAction: ProductDevelopmentAuditDraft['action'],
    summary: string,
    resultAction: ProductDevelopmentMutationResult['action'],
    before?: ProductDevelopmentProjectAggregate | null,
  ): Observable<ProductDevelopmentMutationResult> {
    const auditDraft = this.buildAuditDraft(
      auditAction,
      aggregate,
      summary,
      before ? this.sanitizeAggregate(before) : null,
      this.sanitizeAggregate(aggregate),
    );
    const nextStore = {
      ...store,
      projects: store.projects.map((item) => (item.project.id === aggregate.project.id ? aggregate : item)),
      auditTrail: [auditDraft, ...store.auditTrail],
    };
    this.writeStore(nextStore);
    return of<ProductDevelopmentMutationResult>({
      action: resultAction,
      project: this.cloneAggregate(aggregate),
      message: summary,
      auditDraft,
    }).pipe(delay(220));
  }

  private buildAuditDraft(
    action: ProductDevelopmentAuditDraft['action'],
    aggregate: ProductDevelopmentProjectAggregate,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): ProductDevelopmentAuditDraft {
    return {
      module: 'desarrollo-productos',
      action,
      companyId: aggregate.project.empresaId,
      companyName: aggregate.project.empresaNombre,
      entityId: aggregate.project.id,
      entityName: aggregate.project.nombreProducto,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAggregate(aggregate: ProductDevelopmentProjectAggregate): Record<string, unknown> {
    return {
      project: {
        id: aggregate.project.id,
        skuPropuesto: aggregate.project.skuPropuesto,
        estadoProyecto: aggregate.project.estadoProyecto,
        viabilidadGeneral: aggregate.project.viabilidadGeneral,
        costoEstimado: aggregate.project.costoEstimado,
        margenEstimado: aggregate.project.margenEstimado,
        productoMaestroCreado: aggregate.project.productoMaestroCreado,
      },
      bom: aggregate.bom.map((item) => ({
        itemCodigo: item.itemCodigo,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        costoEstimado: item.costoEstimado,
      })),
      risks: { ...aggregate.risks },
    };
  }

  private matchesFilters(project: ProductDevelopmentProject, filters: ProductDevelopmentFilters): boolean {
    const launch = new Date(`${project.fechaLanzamiento}T00:00:00`).getTime();
    const from = filters.fechaLanzamientoDesde ? new Date(`${filters.fechaLanzamientoDesde}T00:00:00`).getTime() : null;
    const to = filters.fechaLanzamientoHasta ? new Date(`${filters.fechaLanzamientoHasta}T00:00:00`).getTime() : null;
    return (
      (filters.estado === 'TODOS' || project.estadoProyecto === filters.estado) &&
      (!filters.categoria || project.categoria === filters.categoria) &&
      (!filters.responsable || project.responsableProyecto === filters.responsable) &&
      (!filters.viabilidad || filters.viabilidad === 'TODAS' || project.viabilidadGeneral === filters.viabilidad) &&
      (!filters.riesgoAbastecimiento || filters.riesgoAbastecimiento === 'TODOS' || project.riesgoAbastecimiento === filters.riesgoAbastecimiento) &&
      (!from || launch >= from) &&
      (!to || launch <= to)
    );
  }

  private normalizeFilters(filters: ProductDevelopmentFilters): ProductDevelopmentFilters {
    return {
      ...DEFAULT_PRODUCT_DEVELOPMENT_FILTERS,
      ...filters,
      categoria: filters.categoria ?? null,
      responsable: filters.responsable ?? null,
      fechaLanzamientoDesde: filters.fechaLanzamientoDesde ?? null,
      fechaLanzamientoHasta: filters.fechaLanzamientoHasta ?? null,
      viabilidad: filters.viabilidad ?? 'TODAS',
      riesgoAbastecimiento: filters.riesgoAbastecimiento ?? 'TODOS',
    };
  }

  private findProject(store: ProductDevelopmentStore, companyId: string, projectId: string): ProductDevelopmentProjectAggregate | null {
    return store.projects.find((item) => item.project.empresaId === companyId && item.project.id === projectId) ?? null;
  }

  private cloneAggregate(aggregate: ProductDevelopmentProjectAggregate): ProductDevelopmentProjectAggregate {
    return {
      project: {
        ...aggregate.project,
        proveedoresCriticos: [...aggregate.project.proveedoresCriticos],
        materialesCriticos: [...aggregate.project.materialesCriticos],
      },
      bom: aggregate.bom.map((item) => ({ ...item })),
      risks: { ...aggregate.risks },
    };
  }

  private resolveCompanyName(companyId: string): string {
    return companyId === 'medussa-retail' ? EL_ARBOLITO_NAME : 'Empresa activa';
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
