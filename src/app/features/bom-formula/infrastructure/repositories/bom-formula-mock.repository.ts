import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { Product } from '../../../products/domain/models/product.model';
import { ProductStore } from '../../../products/domain/models/product-response.model';
import { INITIAL_PRODUCTS_STORE } from '../../../products/infrastructure/data/products.mock';
import { BomFormulaAggregate, BomFormula } from '../../domain/models/bom-formula.model';
import { BomFormulaDetail } from '../../domain/models/bom-formula-detail.model';
import {
  DEFAULT_BOM_FORMULA_FILTERS,
  BomFormulaFilters,
} from '../../domain/models/bom-formula-filters.model';
import { BomFormulaHistory } from '../../domain/models/bom-formula-history.model';
import {
  BomFormulaAuditDraft,
  BomFormulaCatalogs,
  BomFormulaDashboard,
  BomFormulaIngredientCatalogItem,
  BomFormulaMutationResult,
  BomFormulaStore,
} from '../../domain/models/bom-formula-response.model';
import { BomFormulaStatus } from '../../domain/models/bom-status.model';
import { MeasurementUnit } from '../../domain/models/measurement-unit.model';
import {
  BomFormulaDecisionPayload,
  BomFormulaNewVersionPayload,
  BomFormulaRepository,
  SaveBomFormulaIngredientPayload,
  SaveBomFormulaPayload,
} from '../../domain/repositories/bom-formula.repository';

const STORAGE_KEY = 'medussa.erp.mock.bom-formulas';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

const APPROVER_CATALOG = ['Jefe de Produccion', 'Director Tecnico', 'Calidad', 'Costos'];
const PACKAGING_OPTIONS = [
  'Bolsa 500g',
  'Bolsa 1kg',
  'Botella 250ml',
  'Botella 500ml',
  'Canastilla',
  'Caja corrugada',
];
const VALID_UNITS: MeasurementUnit[] = ['KG', 'G', 'LT', 'ML', 'UND', 'CAJA', 'BOLSA'];
const LOCAL_INGREDIENT_LIBRARY: BomFormulaIngredientCatalogItem[] = [
  {
    id: 'ing-leche-estandarizada',
    code: 'ING-LACT-001',
    name: 'Leche estandarizada',
    defaultUnit: 'LT',
    defaultCost: 1650,
    source: 'LOCAL',
    supplierName: 'Ganaderia La Colina S.A.S.',
  },
  {
    id: 'ing-azucar-refinada',
    code: 'ING-ADI-002',
    name: 'Azucar refinada',
    defaultUnit: 'KG',
    defaultCost: 3850,
    source: 'LOCAL',
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  {
    id: 'ing-pulpa-fresa',
    code: 'ING-FRU-003',
    name: 'Pulpa de fresa',
    defaultUnit: 'KG',
    defaultCost: 9200,
    source: 'LOCAL',
    supplierName: 'Frutales del Norte',
  },
  {
    id: 'ing-estabilizante-lacteo',
    code: 'ING-ADI-004',
    name: 'Estabilizante lacteo',
    defaultUnit: 'KG',
    defaultCost: 14800,
    source: 'LOCAL',
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  {
    id: 'ing-cuajo-liquido',
    code: 'ING-TEC-005',
    name: 'Cuajo liquido',
    defaultUnit: 'LT',
    defaultCost: 26800,
    source: 'LOCAL',
    supplierName: 'Tecnienzimas S.A.S.',
  },
  {
    id: 'ing-cloruro-calcio',
    code: 'ING-TEC-006',
    name: 'Cloruro de calcio',
    defaultUnit: 'KG',
    defaultCost: 8900,
    source: 'LOCAL',
    supplierName: 'Quimiplus Andina S.A.S.',
  },
  {
    id: 'ing-botella-250',
    code: 'ING-EMP-007',
    name: 'Botella PET 250 ml',
    defaultUnit: 'UND',
    defaultCost: 215,
    source: 'LOCAL',
    supplierName: 'Empaques del Caribe Flex',
  },
  {
    id: 'ing-botella-1l',
    code: 'ING-EMP-008',
    name: 'Envase UHT 1L',
    defaultUnit: 'UND',
    defaultCost: 305,
    source: 'LOCAL',
    supplierName: 'Empaques del Caribe Flex',
  },
  {
    id: 'ing-bolsa-500',
    code: 'ING-EMP-009',
    name: 'Bolsa termoencogible 500 g',
    defaultUnit: 'UND',
    defaultCost: 168,
    source: 'LOCAL',
    supplierName: 'Empaques del Caribe Flex',
  },
  {
    id: 'ing-etiqueta-general',
    code: 'ING-ETQ-010',
    name: 'Etiqueta autoadhesiva',
    defaultUnit: 'UND',
    defaultCost: 82,
    source: 'LOCAL',
    supplierName: 'Etiqprint Soluciones Graficas',
  },
  {
    id: 'ing-caja-corrugada',
    code: 'ING-EMB-011',
    name: 'Caja corrugada despacho',
    defaultUnit: 'UND',
    defaultCost: 1180,
    source: 'LOCAL',
    supplierName: 'Empaques del Caribe Flex',
  },
];

@Injectable({
  providedIn: 'root',
})
export class BomFormulaMockRepository implements BomFormulaRepository {
  getDashboard(companyId: string, filters: BomFormulaFilters): Observable<BomFormulaDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const store = this.ensureBaseline(this.readStore(), companyId);
    const catalogs = this.buildCatalogs(companyId, store);
    const formulas = store.formulas
      .filter((item) => item.formula.empresaId === companyId)
      .filter((item) => this.matchesFilters(item.formula, normalizedFilters))
      .sort((left, right) => this.compareAggregates(left, right))
      .map((item) => this.cloneAggregate(item));
    const productIds = new Set(formulas.map((item) => item.formula.productoId));
    const histories = store.histories
      .filter((history) => {
        const aggregate = store.formulas.find((item) => item.formula.id === history.formulaId);
        return aggregate?.formula.empresaId === companyId && (productIds.size === 0 || productIds.has(aggregate.formula.productoId));
      })
      .sort((left, right) => Date.parse(right.fecha) - Date.parse(left.fecha))
      .map((item) => ({ ...item }));

    return of({
      filters: normalizedFilters,
      catalogs,
      kpis: this.buildKpis(formulas),
      formulas,
      histories,
      selectedFormula: formulas[0] ?? null,
    }).pipe(delay(180));
  }

  saveFormula(
    companyId: string,
    payload: SaveBomFormulaPayload,
    formulaId?: string,
  ): Observable<BomFormulaMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = formulaId ? this.findFormula(store, companyId, formulaId) : null;
    const validation = this.validatePayload(store, companyId, payload, formulaId);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    if (current && (current.formula.estado === 'VIGENTE' || current.formula.estado === 'OBSOLETA')) {
      return throwError(() => new Error('La formula seleccionada no se puede editar directamente. Genera una nueva version.'));
    }

    const product = this.resolveFinishedProducts(companyId).find((item) => item.id === payload.productoId) ?? null;

    if (!product) {
      return throwError(() => new Error('El producto terminado seleccionado no existe.'));
    }

    const ingredients = payload.ingredientes.map((item, index) => this.buildDetail(current?.formula.id ?? `formula-${Date.now()}`, item, index));
    const costs = calculateCosts(ingredients, payload.rendimientoEsperado);
    const nextFormula: BomFormula = {
      id: current?.formula.id ?? `formula-${companyId}-${Date.now()}`,
      empresaId: companyId,
      empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      codigoFormula: current?.formula.codigoFormula ?? `BOM-${slugify(product.sku).toUpperCase()}`,
      productoId: product.id,
      productoCodigo: product.sku,
      productoNombre: product.nombre,
      version: current?.formula.version ?? '1.0',
      estado: payload.estado,
      vigenciaDesde: payload.vigenciaDesde,
      vigenciaHasta: payload.vigenciaHasta,
      mermaEsperada: round(payload.mermaEsperada),
      tiempoProceso: round(payload.tiempoProceso),
      rendimientoEsperado: round(payload.rendimientoEsperado),
      unidadRendimiento: payload.unidadRendimiento,
      empaqueRequerido: payload.empaqueRequerido,
      responsableAprobacion: payload.responsableAprobacion,
      fechaAprobacion: current?.formula.fechaAprobacion ?? null,
      observacionesSanitarias: payload.observacionesSanitarias?.trim() || null,
      usuarioCreador: current?.formula.usuarioCreador ?? payload.usuarioCreador.trim(),
      fechaCreacion: current?.formula.fechaCreacion ?? new Date().toISOString(),
      costoEstandarTotal: costs.totalCost,
      costoPorUnidad: costs.unitCost,
      versionOrigenId: current?.formula.versionOrigenId ?? null,
      motivoRechazo: current?.formula.motivoRechazo ?? null,
    };
    const aggregate: BomFormulaAggregate = {
      formula: nextFormula,
      ingredients: ingredients.map((item) => ({ ...item, formulaId: nextFormula.id })),
    };
    const nextStore = {
      ...store,
      formulas: current
        ? store.formulas.map((item) => (item.formula.id === current.formula.id ? aggregate : item))
        : [aggregate, ...store.formulas.map((item) => this.cloneAggregate(item))],
      histories: [
        {
          id: `history-${nextFormula.id}-${Date.now()}`,
          formulaId: nextFormula.id,
          versionOrigen: current?.formula.version ?? null,
          versionNueva: nextFormula.version,
          usuario: payload.usuarioCreador.trim(),
          fecha: new Date().toISOString(),
          motivoCambio: current ? 'Actualizacion tecnica de formula y costeo.' : 'Creacion inicial de formula.',
        },
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'edit' : 'create',
      companyId,
      nextFormula.id,
      `${nextFormula.codigoFormula} v${nextFormula.version}`,
      current ? 'Formula actualizada correctamente.' : 'Formula creada correctamente.',
      current ? this.sanitizeAggregate(current) : null,
      this.sanitizeAggregate(aggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<BomFormulaMutationResult>({
      action: current ? 'updated' : 'created',
      formula: this.cloneAggregate(aggregate),
      message: current ? 'Formula actualizada correctamente.' : 'Formula creada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  approveFormula(
    companyId: string,
    formulaId: string,
    payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = this.findFormula(store, companyId, formulaId);

    if (!current) {
      return throwError(() => new Error('No se encontro la formula seleccionada.'));
    }

    if (current.formula.estado !== 'BORRADOR' && current.formula.estado !== 'PENDIENTE') {
      return throwError(() => new Error('Solo las formulas en BORRADOR o PENDIENTE se pueden aprobar.'));
    }

    if (!current.ingredients.length) {
      return throwError(() => new Error('La formula debe tener al menos un ingrediente antes de aprobarse.'));
    }

    const vigenciaDesde = payload.vigenciaDesde?.trim() || current.formula.vigenciaDesde || todayDate();
    const approvedAt = new Date().toISOString();
    const approvedFormula: BomFormula = {
      ...current.formula,
      estado: 'VIGENTE',
      vigenciaDesde,
      responsableAprobacion: payload.responsableAprobacion.trim(),
      fechaAprobacion: approvedAt,
      motivoRechazo: null,
    };
    const previousCurrent = store.formulas.find(
      (item) =>
        item.formula.empresaId === companyId &&
        item.formula.productoId === current.formula.productoId &&
        item.formula.id !== current.formula.id &&
        item.formula.estado === 'VIGENTE',
    ) ?? null;
    const nextFormulas = store.formulas.map((item) => {
      if (item.formula.id === current.formula.id) {
        return {
          formula: approvedFormula,
          ingredients: item.ingredients.map((detail) => ({ ...detail })),
        };
      }

      if (previousCurrent && item.formula.id === previousCurrent.formula.id) {
        return {
          formula: {
            ...previousCurrent.formula,
            estado: 'OBSOLETA' as const,
            vigenciaHasta: vigenciaDesde,
          },
          ingredients: item.ingredients.map((detail) => ({ ...detail })),
        };
      }

      return this.cloneAggregate(item);
    });
    const nextAggregate = nextFormulas.find((item) => item.formula.id === current.formula.id)!;
    const nextStore: BomFormulaStore = {
      ...store,
      formulas: nextFormulas,
      histories: [
        {
          id: `history-approve-${current.formula.id}-${Date.now()}`,
          formulaId: current.formula.id,
          versionOrigen: previousCurrent?.formula.version ?? current.formula.version,
          versionNueva: approvedFormula.version,
          usuario: payload.usuario.trim(),
          fecha: approvedAt,
          motivoCambio: previousCurrent
            ? `Aprobacion de nueva version y obsolescencia de la version ${previousCurrent.formula.version}.`
            : 'Aprobacion inicial de formula.',
        },
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'approve',
      companyId,
      approvedFormula.id,
      `${approvedFormula.codigoFormula} v${approvedFormula.version}`,
      `Formula aprobada por ${payload.usuario.trim()}.`,
      this.sanitizeAggregate(current),
      this.sanitizeAggregate(nextAggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<BomFormulaMutationResult>({
      action: 'approved',
      formula: this.cloneAggregate(nextAggregate),
      message: 'Formula aprobada y marcada como vigente.',
      auditDraft,
    }).pipe(delay(220));
  }

  rejectFormula(
    companyId: string,
    formulaId: string,
    payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = this.findFormula(store, companyId, formulaId);

    if (!current) {
      return throwError(() => new Error('No se encontro la formula seleccionada.'));
    }

    if (!payload.observacion?.trim()) {
      return throwError(() => new Error('Debes registrar una observacion para rechazar la formula.'));
    }

    const nextAggregate: BomFormulaAggregate = {
      formula: {
        ...current.formula,
        estado: 'RECHAZADA',
        responsableAprobacion: payload.responsableAprobacion.trim(),
        motivoRechazo: payload.observacion.trim(),
      },
      ingredients: current.ingredients.map((item) => ({ ...item })),
    };
    const nextStore: BomFormulaStore = {
      ...store,
      formulas: store.formulas.map((item) => (item.formula.id === current.formula.id ? nextAggregate : this.cloneAggregate(item))),
      histories: [
        {
          id: `history-reject-${current.formula.id}-${Date.now()}`,
          formulaId: current.formula.id,
          versionOrigen: current.formula.version,
          versionNueva: current.formula.version,
          usuario: payload.usuario.trim(),
          fecha: new Date().toISOString(),
          motivoCambio: payload.observacion.trim(),
        },
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'reject',
      companyId,
      nextAggregate.formula.id,
      `${nextAggregate.formula.codigoFormula} v${nextAggregate.formula.version}`,
      `Formula rechazada por ${payload.usuario.trim()}.`,
      this.sanitizeAggregate(current),
      this.sanitizeAggregate(nextAggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<BomFormulaMutationResult>({
      action: 'rejected',
      formula: this.cloneAggregate(nextAggregate),
      message: 'Formula rechazada y trazada en el historial.',
      auditDraft,
    }).pipe(delay(220));
  }

  createNewVersion(
    companyId: string,
    formulaId: string,
    payload: BomFormulaNewVersionPayload,
  ): Observable<BomFormulaMutationResult> {
    const store = this.ensureBaseline(this.readStore(), companyId);
    const current = this.findFormula(store, companyId, formulaId);

    if (!current) {
      return throwError(() => new Error('No se encontro la formula seleccionada.'));
    }

    const nextVersion = this.nextVersionForProduct(store, companyId, current.formula.productoId);
    const createdAt = new Date().toISOString();
    const nextFormula: BomFormula = {
      ...current.formula,
      id: `formula-${companyId}-${Date.now()}`,
      version: nextVersion,
      estado: 'BORRADOR',
      vigenciaDesde: todayDate(),
      vigenciaHasta: null,
      fechaAprobacion: null,
      usuarioCreador: payload.usuario.trim(),
      fechaCreacion: createdAt,
      versionOrigenId: current.formula.id,
      motivoRechazo: null,
    };
    const nextAggregate: BomFormulaAggregate = {
      formula: nextFormula,
      ingredients: current.ingredients.map((item, index) => ({
        ...item,
        id: `detail-${nextFormula.id}-${index + 1}`,
        formulaId: nextFormula.id,
      })),
    };
    const nextStore: BomFormulaStore = {
      ...store,
      formulas: [nextAggregate, ...store.formulas.map((item) => this.cloneAggregate(item))],
      histories: [
        {
          id: `history-version-${nextFormula.id}-${Date.now()}`,
          formulaId: nextFormula.id,
          versionOrigen: current.formula.version,
          versionNueva: nextVersion,
          usuario: payload.usuario.trim(),
          fecha: createdAt,
          motivoCambio: payload.motivoCambio.trim(),
        },
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'new-version',
      companyId,
      nextFormula.id,
      `${nextFormula.codigoFormula} v${nextFormula.version}`,
      `Nueva version creada desde ${current.formula.version}.`,
      this.sanitizeAggregate(current),
      this.sanitizeAggregate(nextAggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<BomFormulaMutationResult>({
      action: 'new-version',
      formula: this.cloneAggregate(nextAggregate),
      message: `Nueva version ${nextFormula.version} creada para continuar ajustes tecnicos.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): BomFormulaStore {
    if (typeof window === 'undefined') {
      return createEmptyStore();
    }

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const empty = createEmptyStore();
      this.writeStore(empty);
      return empty;
    }

    try {
      const parsed = JSON.parse(raw) as BomFormulaStore;
      return {
        formulas: parsed.formulas ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const empty = createEmptyStore();
      this.writeStore(empty);
      return empty;
    }
  }

  private writeStore(store: BomFormulaStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(store: BomFormulaStore, companyId: string): BomFormulaStore {
    if (store.formulas.some((item) => item.formula.empresaId === companyId)) {
      return store;
    }

    const seeded = this.seedCompany(store, companyId);
    this.writeStore(seeded);
    return seeded;
  }

  private seedCompany(store: BomFormulaStore, companyId: string): BomFormulaStore {
    const finishedProducts = this.resolveFinishedProducts(companyId);

    if (!finishedProducts.length) {
      return store;
    }

    const formulas: BomFormulaAggregate[] = [];
    const histories: BomFormulaHistory[] = [];

    if (companyId === 'medussa-holding') {
      const yogurt = finishedProducts.find((item) => item.sku === 'ARB-YOG-200-FR') ?? finishedProducts[0];
      const milk = finishedProducts.find((item) => item.sku === 'ARB-UHT-1L') ?? finishedProducts[0];
      const cheese = finishedProducts.find((item) => item.sku === 'ARB-QUE-500') ?? finishedProducts[0];

      const yogurtV1 = this.createSeedFormula(companyId, yogurt, '1.0', 'VIGENTE', {
        vigenciaDesde: '2026-03-01',
        vigenciaHasta: null,
        mermaEsperada: 2.4,
        tiempoProceso: 135,
        rendimientoEsperado: 1200,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Botella 250ml',
        responsableAprobacion: 'Jefe de Produccion',
        fechaAprobacion: '2026-03-01T08:00:00-05:00',
        observacionesSanitarias: 'Mantener cadena de frio y sanitizacion CIP completa.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-02-26T09:00:00-05:00',
        versionOrigenId: null,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 182, 'LT', 1650),
          this.seedPayload('prod-arb-006', 'ARB-MP-CLM', 'Cultivo lactico mix', 0.9, 'KG', 71008),
          this.seedPayload('ing-azucar-refinada', 'ING-ADI-002', 'Azucar refinada', 28, 'KG', 3850),
          this.seedPayload('ing-pulpa-fresa', 'ING-FRU-003', 'Pulpa de fresa', 36, 'KG', 9200),
          this.seedPayload('ing-estabilizante-lacteo', 'ING-ADI-004', 'Estabilizante lacteo', 3.2, 'KG', 14800),
          this.seedPayload('ing-botella-250', 'ING-EMP-007', 'Botella PET 250 ml', 1200, 'UND', 215),
          this.seedPayload('ing-etiqueta-general', 'ING-ETQ-010', 'Etiqueta autoadhesiva', 1200, 'UND', 82),
        ],
      });
      const yogurtV2Rejected = this.createSeedFormula(companyId, yogurt, '2.0', 'RECHAZADA', {
        vigenciaDesde: '2026-04-18',
        vigenciaHasta: null,
        mermaEsperada: 3.1,
        tiempoProceso: 140,
        rendimientoEsperado: 1180,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Botella 250ml',
        responsableAprobacion: 'Director Tecnico',
        fechaAprobacion: null,
        observacionesSanitarias: 'Ajuste de fruta rechazado por desviacion de Brix.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-04-18T07:40:00-05:00',
        versionOrigenId: yogurtV1.formula.id,
        motivoRechazo: 'La pulpa propuesta altera el perfil sensorial y no cumple laboratorio.',
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 179, 'LT', 1650),
          this.seedPayload('prod-arb-006', 'ARB-MP-CLM', 'Cultivo lactico mix', 0.9, 'KG', 71008),
          this.seedPayload('ing-azucar-refinada', 'ING-ADI-002', 'Azucar refinada', 27.5, 'KG', 3850),
          this.seedPayload('ing-pulpa-fresa', 'ING-FRU-003', 'Pulpa de fresa', 42, 'KG', 9200),
          this.seedPayload('ing-estabilizante-lacteo', 'ING-ADI-004', 'Estabilizante lacteo', 3.5, 'KG', 14800),
          this.seedPayload('ing-botella-250', 'ING-EMP-007', 'Botella PET 250 ml', 1180, 'UND', 215),
          this.seedPayload('ing-etiqueta-general', 'ING-ETQ-010', 'Etiqueta autoadhesiva', 1180, 'UND', 82),
        ],
      });
      const milkV1 = this.createSeedFormula(companyId, milk, '1.0', 'OBSOLETA', {
        vigenciaDesde: '2026-01-12',
        vigenciaHasta: '2026-03-22',
        mermaEsperada: 1.8,
        tiempoProceso: 210,
        rendimientoEsperado: 1020,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Caja corrugada',
        responsableAprobacion: 'Jefe de Produccion',
        fechaAprobacion: '2026-01-12T08:30:00-05:00',
        observacionesSanitarias: 'Esterilizacion comercial validada y retencion por lote.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-01-08T07:30:00-05:00',
        versionOrigenId: null,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 1035, 'LT', 1650),
          this.seedPayload('ing-estabilizante-lacteo', 'ING-ADI-004', 'Estabilizante lacteo', 2.4, 'KG', 14800),
          this.seedPayload('ing-botella-1l', 'ING-EMP-008', 'Envase UHT 1L', 1020, 'UND', 305),
          this.seedPayload('ing-caja-corrugada', 'ING-EMB-011', 'Caja corrugada despacho', 85, 'UND', 1180),
        ],
      });
      const milkV2 = this.createSeedFormula(companyId, milk, '2.0', 'VIGENTE', {
        vigenciaDesde: '2026-03-22',
        vigenciaHasta: null,
        mermaEsperada: 1.2,
        tiempoProceso: 195,
        rendimientoEsperado: 1100,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Caja corrugada',
        responsableAprobacion: 'Director Tecnico',
        fechaAprobacion: '2026-03-22T10:05:00-05:00',
        observacionesSanitarias: 'Version vigente con mejor rendimiento de homogenizacion.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-03-18T14:30:00-05:00',
        versionOrigenId: milkV1.formula.id,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 1112, 'LT', 1650),
          this.seedPayload('ing-estabilizante-lacteo', 'ING-ADI-004', 'Estabilizante lacteo', 2.1, 'KG', 14800),
          this.seedPayload('ing-botella-1l', 'ING-EMP-008', 'Envase UHT 1L', 1100, 'UND', 305),
          this.seedPayload('ing-caja-corrugada', 'ING-EMB-011', 'Caja corrugada despacho', 92, 'UND', 1180),
        ],
      });
      const cheeseV1 = this.createSeedFormula(companyId, cheese, '1.0', 'VIGENTE', {
        vigenciaDesde: '2026-02-10',
        vigenciaHasta: null,
        mermaEsperada: 4.6,
        tiempoProceso: 255,
        rendimientoEsperado: 540,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Bolsa 500g',
        responsableAprobacion: 'Jefe de Produccion',
        fechaAprobacion: '2026-02-10T09:10:00-05:00',
        observacionesSanitarias: 'Control estricto de cuajada y corte sanitario.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-02-06T08:15:00-05:00',
        versionOrigenId: null,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 585, 'LT', 1650),
          this.seedPayload('ing-cuajo-liquido', 'ING-TEC-005', 'Cuajo liquido', 1.8, 'LT', 26800),
          this.seedPayload('ing-cloruro-calcio', 'ING-TEC-006', 'Cloruro de calcio', 2.4, 'KG', 8900),
          this.seedPayload('ing-bolsa-500', 'ING-EMP-009', 'Bolsa termoencogible 500 g', 540, 'UND', 168),
          this.seedPayload('ing-etiqueta-general', 'ING-ETQ-010', 'Etiqueta autoadhesiva', 540, 'UND', 82),
        ],
      });
      const cheeseV2 = this.createSeedFormula(companyId, cheese, '2.0', 'PENDIENTE', {
        vigenciaDesde: '2026-04-25',
        vigenciaHasta: null,
        mermaEsperada: 4.1,
        tiempoProceso: 245,
        rendimientoEsperado: 560,
        unidadRendimiento: 'UND',
        empaqueRequerido: 'Bolsa 500g',
        responsableAprobacion: 'Calidad',
        fechaAprobacion: null,
        observacionesSanitarias: 'Pendiente validacion microbiologica y stress test de empaque.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: '2026-04-19T11:00:00-05:00',
        versionOrigenId: cheeseV1.formula.id,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-leche-estandarizada', 'ING-LACT-001', 'Leche estandarizada', 592, 'LT', 1650),
          this.seedPayload('ing-cuajo-liquido', 'ING-TEC-005', 'Cuajo liquido', 1.6, 'LT', 26800),
          this.seedPayload('ing-cloruro-calcio', 'ING-TEC-006', 'Cloruro de calcio', 2.2, 'KG', 8900),
          this.seedPayload('ing-bolsa-500', 'ING-EMP-009', 'Bolsa termoencogible 500 g', 560, 'UND', 168),
          this.seedPayload('ing-etiqueta-general', 'ING-ETQ-010', 'Etiqueta autoadhesiva', 560, 'UND', 82),
        ],
      });

      formulas.push(yogurtV2Rejected, cheeseV2, milkV2, cheeseV1, milkV1, yogurtV1);
      histories.push(
        buildHistory(yogurtV1.formula.id, null, '1.0', 'demo.formulador', '2026-02-26T09:00:00-05:00', 'Creacion inicial de formula.'),
        buildHistory(yogurtV1.formula.id, '1.0', '1.0', 'Jefe de Produccion', '2026-03-01T08:00:00-05:00', 'Formula aprobada y liberada para planta.'),
        buildHistory(yogurtV2Rejected.formula.id, '1.0', '2.0', 'demo.formulador', '2026-04-18T07:40:00-05:00', 'Nueva version por ajuste de sabor y rendimiento.'),
        buildHistory(yogurtV2Rejected.formula.id, '2.0', '2.0', 'Director Tecnico', '2026-04-18T15:20:00-05:00', 'Version rechazada por desviacion sensorial.'),
        buildHistory(milkV1.formula.id, null, '1.0', 'demo.formulador', '2026-01-08T07:30:00-05:00', 'Creacion inicial de formula UHT.'),
        buildHistory(milkV2.formula.id, '1.0', '2.0', 'demo.formulador', '2026-03-18T14:30:00-05:00', 'Nueva version por mejora de rendimiento y ciclo de proceso.'),
        buildHistory(milkV2.formula.id, '1.0', '2.0', 'Director Tecnico', '2026-03-22T10:05:00-05:00', 'Aprobacion de version 2.0 y obsolescencia de 1.0.'),
        buildHistory(cheeseV1.formula.id, null, '1.0', 'demo.formulador', '2026-02-06T08:15:00-05:00', 'Creacion inicial de formula queso campesino.'),
        buildHistory(cheeseV1.formula.id, '1.0', '1.0', 'Jefe de Produccion', '2026-02-10T09:10:00-05:00', 'Formula aprobada para operacion regular.'),
        buildHistory(cheeseV2.formula.id, '1.0', '2.0', 'demo.formulador', '2026-04-19T11:00:00-05:00', 'Nueva version pendiente por mejora de rendimiento y empaque.'),
      );
    } else {
      const product = finishedProducts[0];
      const generic = this.createSeedFormula(companyId, product, '1.0', 'BORRADOR', {
        vigenciaDesde: todayDate(),
        vigenciaHasta: null,
        mermaEsperada: 2,
        tiempoProceso: 120,
        rendimientoEsperado: 100,
        unidadRendimiento: 'UND',
        empaqueRequerido: PACKAGING_OPTIONS[0],
        responsableAprobacion: APPROVER_CATALOG[0],
        fechaAprobacion: null,
        observacionesSanitarias: 'Formula base local pendiente de ajuste por la empresa activa.',
        usuarioCreador: 'demo.formulador',
        fechaCreacion: new Date().toISOString(),
        versionOrigenId: null,
        motivoRechazo: null,
        ingredients: [
          this.seedPayload('ing-azucar-refinada', 'ING-ADI-002', 'Azucar refinada', 10, 'KG', 3850),
          this.seedPayload('ing-etiqueta-general', 'ING-ETQ-010', 'Etiqueta autoadhesiva', 100, 'UND', 82),
        ],
      });
      formulas.push(generic);
      histories.push(buildHistory(generic.formula.id, null, '1.0', 'demo.formulador', new Date().toISOString(), 'Creacion inicial de formula local.'));
    }

    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      `seed-${companyId}`,
      'Seed BOM / Formulas',
      'Carga inicial de formulas versionadas, costos e historial.',
      null,
      {
        formulas: formulas.length,
        histories: histories.length,
      },
    );

    return {
      ...store,
      formulas: [...formulas, ...store.formulas.map((item) => this.cloneAggregate(item))],
      histories: [...histories, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: [auditDraft, ...store.auditTrail],
    };
  }

  private createSeedFormula(
    companyId: string,
    product: Product,
    version: string,
    status: BomFormulaStatus,
    input: {
      vigenciaDesde: string;
      vigenciaHasta: string | null;
      mermaEsperada: number;
      tiempoProceso: number;
      rendimientoEsperado: number;
      unidadRendimiento: MeasurementUnit;
      empaqueRequerido: string;
      responsableAprobacion: string;
      fechaAprobacion: string | null;
      observacionesSanitarias: string | null;
      usuarioCreador: string;
      fechaCreacion: string;
      versionOrigenId: string | null;
      motivoRechazo: string | null;
      ingredients: SaveBomFormulaIngredientPayload[];
    },
  ): BomFormulaAggregate {
    const formulaId = `formula-${companyId}-${slugify(`${product.sku}-${version}`)}`;
    const details = input.ingredients.map((item, index) => this.buildDetail(formulaId, item, index));
    const costs = calculateCosts(details, input.rendimientoEsperado);

    return {
      formula: {
        id: formulaId,
        empresaId: companyId,
        empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
        codigoFormula: `BOM-${slugify(product.sku).toUpperCase()}`,
        productoId: product.id,
        productoCodigo: product.sku,
        productoNombre: product.nombre,
        version,
        estado: status,
        vigenciaDesde: input.vigenciaDesde,
        vigenciaHasta: input.vigenciaHasta,
        mermaEsperada: input.mermaEsperada,
        tiempoProceso: input.tiempoProceso,
        rendimientoEsperado: input.rendimientoEsperado,
        unidadRendimiento: input.unidadRendimiento,
        empaqueRequerido: input.empaqueRequerido,
        responsableAprobacion: input.responsableAprobacion,
        fechaAprobacion: input.fechaAprobacion,
        observacionesSanitarias: input.observacionesSanitarias,
        usuarioCreador: input.usuarioCreador,
        fechaCreacion: input.fechaCreacion,
        costoEstandarTotal: costs.totalCost,
        costoPorUnidad: costs.unitCost,
        versionOrigenId: input.versionOrigenId,
        motivoRechazo: input.motivoRechazo,
      },
      ingredients: details,
    };
  }

  private seedPayload(
    ingredienteId: string,
    ingredienteCodigo: string,
    ingredienteNombre: string,
    cantidad: number,
    unidadMedida: MeasurementUnit,
    costoUnitario: number,
  ): SaveBomFormulaIngredientPayload {
    return {
      ingredienteId,
      ingredienteCodigo,
      ingredienteNombre,
      cantidad,
      unidadMedida,
      costoUnitario,
    };
  }

  private buildCatalogs(companyId: string, store: BomFormulaStore): BomFormulaCatalogs {
    const formulas = store.formulas.filter((item) => item.formula.empresaId === companyId);
    const versions = Array.from(new Set(formulas.map((item) => item.formula.version))).sort(compareVersionsDesc);

    return {
      finishedProducts: this.resolveFinishedProducts(companyId)
        .map((item) => ({
          value: item.id,
          label: `${item.sku} · ${item.nombre}`,
          productCode: item.sku,
          productName: item.nombre,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
      ingredientOptions: this.resolveIngredientCatalog(companyId),
      statuses: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'VIGENTE', label: 'Vigente' },
        { value: 'OBSOLETA', label: 'Obsoleta' },
        { value: 'RECHAZADA', label: 'Rechazada' },
      ],
      draftStatuses: [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'PENDIENTE', label: 'Pendiente' },
      ],
      vigenciaOptions: [
        { value: 'TODAS', label: 'Todas' },
        { value: 'ACTIVA', label: 'Activa' },
        { value: 'PROGRAMADA', label: 'Programada' },
        { value: 'VENCIDA', label: 'Vencida' },
      ],
      units: VALID_UNITS.map((value) => ({ value, label: value })),
      packagingOptions: PACKAGING_OPTIONS.map((value) => ({ value, label: value })),
      approvers: APPROVER_CATALOG.map((value) => ({ value, label: value })),
      versions: versions.map((value) => ({ value, label: value })),
    };
  }

  private resolveFinishedProducts(companyId: string): Product[] {
    const activeProducts = this.readProductsStore().products.filter(
      (item) => item.empresaId === companyId && item.estado === 'ACTIVO',
    );
    const finished = activeProducts.filter((item) => item.familia === 'Producto terminado');

    return (finished.length ? finished : activeProducts).map((item) => ({ ...item }));
  }

  private resolveIngredientCatalog(companyId: string): BomFormulaIngredientCatalogItem[] {
    const products = this.readProductsStore().products.filter(
      (item) => item.empresaId === companyId && item.estado === 'ACTIVO',
    );
    const productIngredients = products
      .filter((item) => item.familia !== 'Producto terminado' || products.every((product) => product.familia !== 'Producto terminado'))
      .map((item) => ({
        id: item.id,
        code: item.sku,
        name: item.nombre,
        defaultUnit: normalizeProductUnit(item.unidadBase),
        defaultCost: Math.max(1, round(item.precioNeto ?? item.precioBruto ?? 0)),
        source: 'PRODUCTO' as const,
        supplierName: null,
      }));

    return [...productIngredients, ...LOCAL_INGREDIENT_LIBRARY]
      .reduce<BomFormulaIngredientCatalogItem[]>((acc, item) => {
        if (acc.some((current) => current.id === item.id)) {
          return acc;
        }

        return [...acc, item];
      }, [])
      .sort((left, right) => left.name.localeCompare(right.name, 'es-CO'));
  }

  private buildDetail(
    formulaId: string,
    ingredient: SaveBomFormulaIngredientPayload,
    index: number,
  ): BomFormulaDetail {
    return {
      id: `detail-${formulaId}-${index + 1}`,
      formulaId,
      ingredienteId: ingredient.ingredienteId,
      ingredienteCodigo: ingredient.ingredienteCodigo,
      ingredienteNombre: ingredient.ingredienteNombre,
      cantidad: round(ingredient.cantidad),
      unidadMedida: ingredient.unidadMedida,
      costoUnitario: round(ingredient.costoUnitario),
      costoTotalLinea: round(ingredient.cantidad * ingredient.costoUnitario),
    };
  }

  private validatePayload(
    store: BomFormulaStore,
    companyId: string,
    payload: SaveBomFormulaPayload,
    formulaId?: string,
  ): string | null {
    const product = this.resolveFinishedProducts(companyId).find((item) => item.id === payload.productoId) ?? null;

    if (!product) {
      return 'Debes seleccionar un producto terminado valido.';
    }

    if (!payload.vigenciaDesde) {
      return 'Debes indicar la vigencia inicial de la formula.';
    }

    if (payload.rendimientoEsperado <= 0) {
      return 'El rendimiento esperado debe ser mayor a cero.';
    }

    if (payload.mermaEsperada < 0 || payload.mermaEsperada > 100) {
      return 'La merma esperada debe estar entre 0 y 100%.';
    }

    if (payload.tiempoProceso <= 0) {
      return 'El tiempo de proceso debe ser mayor a cero.';
    }

    if (!payload.responsableAprobacion.trim()) {
      return 'Debes registrar el responsable de aprobacion.';
    }

    if (!payload.ingredientes.length) {
      return 'La formula debe tener al menos un ingrediente.';
    }

    const ingredientIds = new Set<string>();

    for (const ingredient of payload.ingredientes) {
      if (!ingredient.ingredienteId.trim()) {
        return 'Todos los ingredientes deben existir en el catalogo tecnico.';
      }

      if (ingredientIds.has(ingredient.ingredienteId)) {
        return `El ingrediente ${ingredient.ingredienteNombre} esta repetido en la formula.`;
      }

      ingredientIds.add(ingredient.ingredienteId);

      if (ingredient.cantidad <= 0) {
        return `La cantidad de ${ingredient.ingredienteNombre} debe ser mayor a cero.`;
      }

      if (!VALID_UNITS.includes(ingredient.unidadMedida)) {
        return `La unidad ${ingredient.unidadMedida} no es valida.`;
      }

      if (ingredient.costoUnitario <= 0) {
        return `El costo unitario de ${ingredient.ingredienteNombre} debe ser mayor a cero.`;
      }
    }

    if (!formulaId) {
      const existingProductVersions = store.formulas.filter(
        (item) => item.formula.empresaId === companyId && item.formula.productoId === payload.productoId,
      );

      if (existingProductVersions.length) {
        return 'Ese producto ya tiene formulas registradas. Usa la accion Nueva version para continuar.';
      }
    }

    return null;
  }

  private findFormula(
    store: BomFormulaStore,
    companyId: string,
    formulaId: string,
  ): BomFormulaAggregate | null {
    const aggregate = store.formulas.find(
      (item) => item.formula.empresaId === companyId && item.formula.id === formulaId,
    );

    return aggregate ? this.cloneAggregate(aggregate) : null;
  }

  private buildKpis(formulas: BomFormulaAggregate[]) {
    return {
      totalFormulas: formulas.length,
      vigenteCount: formulas.filter((item) => item.formula.estado === 'VIGENTE').length,
      pendingCount: formulas.filter((item) => item.formula.estado === 'PENDIENTE').length,
      obsoleteCount: formulas.filter((item) => item.formula.estado === 'OBSOLETA').length,
      averageStandardCost: formulas.length
        ? round(formulas.reduce((sum, item) => sum + item.formula.costoEstandarTotal, 0) / formulas.length)
        : 0,
    };
  }

  private matchesFilters(formula: BomFormula, filters: BomFormulaFilters): boolean {
    return (
      (!filters.productoId || formula.productoId === filters.productoId) &&
      (filters.estado === 'TODOS' || formula.estado === filters.estado) &&
      (!filters.version || formula.version.includes(filters.version)) &&
      (!filters.responsableAprobacion || formula.responsableAprobacion === filters.responsableAprobacion) &&
      this.matchesVigencia(formula, filters.vigencia)
    );
  }

  private matchesVigencia(formula: BomFormula, vigencia: BomFormulaFilters['vigencia']): boolean {
    if (vigencia === 'TODAS') {
      return true;
    }

    const today = todayDate();
    const from = formula.vigenciaDesde;
    const to = formula.vigenciaHasta;

    if (vigencia === 'ACTIVA') {
      return from <= today && (!to || to >= today);
    }

    if (vigencia === 'PROGRAMADA') {
      return from > today;
    }

    return !!to && to < today;
  }

  private nextVersionForProduct(store: BomFormulaStore, companyId: string, productId: string): string {
    const versions = store.formulas
      .filter((item) => item.formula.empresaId === companyId && item.formula.productoId === productId)
      .map((item) => parseFloat(item.formula.version))
      .filter((item) => Number.isFinite(item));
    const currentMax = versions.length ? Math.max(...versions) : 0;

    return `${Math.floor(currentMax) + 1}.0`;
  }

  private normalizeFilters(filters: BomFormulaFilters): BomFormulaFilters {
    return {
      ...DEFAULT_BOM_FORMULA_FILTERS,
      ...filters,
      productoId: filters.productoId ?? null,
      estado: filters.estado ?? 'TODOS',
      version: filters.version?.trim() || null,
      vigencia: filters.vigencia ?? 'TODAS',
      responsableAprobacion: filters.responsableAprobacion ?? null,
    };
  }

  private compareAggregates(left: BomFormulaAggregate, right: BomFormulaAggregate): number {
    if (left.formula.productoNombre !== right.formula.productoNombre) {
      return left.formula.productoNombre.localeCompare(right.formula.productoNombre, 'es-CO');
    }

    return compareVersionsDesc(left.formula.version, right.formula.version);
  }

  private buildAuditDraft(
    action: BomFormulaAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): BomFormulaAuditDraft {
    return {
      module: 'bom-formulas',
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

  private sanitizeAggregate(aggregate: BomFormulaAggregate): Record<string, unknown> {
    return {
      formula: {
        id: aggregate.formula.id,
        codigoFormula: aggregate.formula.codigoFormula,
        productoNombre: aggregate.formula.productoNombre,
        version: aggregate.formula.version,
        estado: aggregate.formula.estado,
        vigenciaDesde: aggregate.formula.vigenciaDesde,
        vigenciaHasta: aggregate.formula.vigenciaHasta,
        costoEstandarTotal: aggregate.formula.costoEstandarTotal,
        costoPorUnidad: aggregate.formula.costoPorUnidad,
        mermaEsperada: aggregate.formula.mermaEsperada,
        tiempoProceso: aggregate.formula.tiempoProceso,
        rendimientoEsperado: aggregate.formula.rendimientoEsperado,
      },
      ingredients: aggregate.ingredients.map((item) => ({
        ingredienteCodigo: item.ingredienteCodigo,
        ingredienteNombre: item.ingredienteNombre,
        cantidad: item.cantidad,
        unidadMedida: item.unidadMedida,
        costoUnitario: item.costoUnitario,
      })),
    };
  }

  private cloneAggregate(aggregate: BomFormulaAggregate): BomFormulaAggregate {
    return {
      formula: { ...aggregate.formula },
      ingredients: aggregate.ingredients.map((item) => ({ ...item })),
    };
  }

  private readProductsStore(): ProductStore {
    if (typeof window === 'undefined') {
      return cloneJson(INITIAL_PRODUCTS_STORE);
    }

    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);

    if (!raw) {
      return cloneJson(INITIAL_PRODUCTS_STORE);
    }

    try {
      return JSON.parse(raw) as ProductStore;
    } catch {
      return cloneJson(INITIAL_PRODUCTS_STORE);
    }
  }
}

function createEmptyStore(): BomFormulaStore {
  return {
    formulas: [],
    histories: [],
    auditTrail: [],
  };
}

function buildHistory(
  formulaId: string,
  versionOrigen: string | null,
  versionNueva: string,
  usuario: string,
  fecha: string,
  motivoCambio: string,
): BomFormulaHistory {
  return {
    id: `history-${formulaId}-${Date.parse(fecha)}`,
    formulaId,
    versionOrigen,
    versionNueva,
    usuario,
    fecha,
    motivoCambio,
  };
}

function calculateCosts(ingredients: BomFormulaDetail[], rendimientoEsperado: number) {
  const totalCost = round(ingredients.reduce((sum, item) => sum + item.costoTotalLinea, 0));
  const unitCost = rendimientoEsperado > 0 ? round(totalCost / rendimientoEsperado) : 0;

  return {
    totalCost,
    unitCost,
  };
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}

function cloneJson<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function compareVersionsDesc(left: string, right: string): number {
  return parseFloat(right) - parseFloat(left);
}

function normalizeProductUnit(unit: string): MeasurementUnit {
  if (VALID_UNITS.includes(unit as MeasurementUnit)) {
    return unit as MeasurementUnit;
  }

  return 'UND';
}
