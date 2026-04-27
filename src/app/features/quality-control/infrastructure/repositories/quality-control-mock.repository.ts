import { Injectable, inject } from '@angular/core';
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
import { InventoryLotCommandPayload } from '../../../inventory-core/domain/repositories/inventory-core.repository';
import { InventoryCoreMockRepository } from '../../../inventory-core/infrastructure/repositories/inventory-core-mock.repository';
import {
  EMPTY_QUALITY_EVALUATION,
  QualityControlAuditDraft,
  QualityControlCatalogs,
  QualityControlDashboard,
  QualityControlMutationResult,
  QualityControlStore,
  QualityParameterTemplate,
} from '../../domain/models/quality-control-response.model';
import {
  DEFAULT_QUALITY_INSPECTION_FILTERS,
  QualityInspectionFilters,
} from '../../domain/models/quality-inspection-filters.model';
import { QualityLotHistory } from '../../domain/models/quality-lot-history.model';
import {
  QualityInspection,
  QualityInspectionAggregate,
  QualityInspectionEvaluation,
} from '../../domain/models/quality-inspection.model';
import { QualityInspectionDetail } from '../../domain/models/quality-inspection-detail.model';
import { QualityNonConformity } from '../../domain/models/quality-nonconformity.model';
import {
  QualityControlType,
  QualityDecisionAction,
  QualityLotStatus,
  QualityNonConformityStatus,
} from '../../domain/models/quality-status.model';
import {
  CloseQualityNonConformityPayload,
  QualityControlRepository,
  QualityLotDecisionPayload,
  SaveQualityInspectionParameterPayload,
  SaveQualityInspectionPayload,
  SaveQualityNonConformityPayload,
} from '../../domain/repositories/quality-control.repository';
import {
  evaluateInspectionParameters,
  isAuthorizedQualityReleaser,
  resolveParameterConformity,
} from '../../domain/utils/quality-control-evaluation.utils';

const STORAGE_KEY = 'medussa.erp.mock.quality-control';
const PRODUCTS_STORAGE_KEY = 'medussa.erp.mock.products';
const SUPPLIERS_STORAGE_KEY = 'medussa.erp.mock.suppliers';

const COMPANY_NAMES: Record<string, string> = {
  'medussa-holding': 'Industrias Alimenticias El Arbolito',
  'medussa-retail': 'Medussa Holding',
  'medussa-industrial': 'Medussa Industrial',
  'medussa-services': 'Medussa Services',
};

const ANALYSTS = [
  'Analista Calidad 1',
  'Analista Calidad 2',
  'Jefe de Calidad',
  'Director Técnico',
];

const EQUIPMENTS = [
  'PH-METER-01',
  'PH-METER-02',
  'REFRACTOMETRO-01',
  'BALANZA-01',
  'TERMOMETRO-01',
  'KIT-MICRO-01',
];

const RELEASERS = ['Jefe de Calidad', 'Director Técnico'];

const QUALITY_PARAMETER_TEMPLATES: QualityParameterTemplate[] = [
  {
    id: 'recepcion-ph',
    parametro: 'pH',
    unidadMedida: 'pH',
    rangoMin: 6.4,
    rangoMax: 6.8,
    esCritico: true,
    tiposControl: ['RECEPCION'],
    equipoSugerido: 'PH-METER-01',
  },
  {
    id: 'recepcion-temperatura',
    parametro: 'Temperatura',
    unidadMedida: '°C',
    rangoMin: 2,
    rangoMax: 8,
    esCritico: true,
    tiposControl: ['RECEPCION'],
    equipoSugerido: 'TERMOMETRO-01',
  },
  {
    id: 'recepcion-humedad',
    parametro: 'Humedad',
    unidadMedida: '%',
    rangoMin: 2,
    rangoMax: 5,
    esCritico: false,
    tiposControl: ['RECEPCION'],
    equipoSugerido: 'BALANZA-01',
  },
  {
    id: 'recepcion-micro',
    parametro: 'Microbiologia',
    unidadMedida: 'UFC/g',
    rangoMin: 0,
    rangoMax: 10,
    esCritico: true,
    tiposControl: ['RECEPCION'],
    equipoSugerido: 'KIT-MICRO-01',
  },
  {
    id: 'proceso-ph',
    parametro: 'pH',
    unidadMedida: 'pH',
    rangoMin: 4.1,
    rangoMax: 4.6,
    esCritico: true,
    tiposControl: ['PROCESO'],
    equipoSugerido: 'PH-METER-02',
  },
  {
    id: 'proceso-temperatura',
    parametro: 'Temperatura',
    unidadMedida: '°C',
    rangoMin: 4,
    rangoMax: 6,
    esCritico: false,
    tiposControl: ['PROCESO'],
    equipoSugerido: 'TERMOMETRO-01',
  },
  {
    id: 'proceso-brix',
    parametro: 'Brix',
    unidadMedida: '°Bx',
    rangoMin: 12.5,
    rangoMax: 14.5,
    esCritico: false,
    tiposControl: ['PROCESO'],
    equipoSugerido: 'REFRACTOMETRO-01',
  },
  {
    id: 'proceso-peso',
    parametro: 'Peso neto',
    unidadMedida: 'g',
    rangoMin: 198,
    rangoMax: 202,
    esCritico: false,
    tiposControl: ['PROCESO'],
    equipoSugerido: 'BALANZA-01',
  },
  {
    id: 'pt-ph',
    parametro: 'pH',
    unidadMedida: 'pH',
    rangoMin: 4.1,
    rangoMax: 4.6,
    esCritico: true,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'PH-METER-01',
  },
  {
    id: 'pt-peso',
    parametro: 'Peso neto',
    unidadMedida: 'g',
    rangoMin: 198,
    rangoMax: 202,
    esCritico: false,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'BALANZA-01',
  },
  {
    id: 'pt-humedad',
    parametro: 'Humedad',
    unidadMedida: '%',
    rangoMin: 40,
    rangoMax: 46,
    esCritico: false,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'BALANZA-01',
  },
  {
    id: 'pt-brix',
    parametro: 'Brix',
    unidadMedida: '°Bx',
    rangoMin: 12.5,
    rangoMax: 14.5,
    esCritico: false,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'REFRACTOMETRO-01',
  },
  {
    id: 'pt-micro',
    parametro: 'Microbiologia',
    unidadMedida: 'UFC/g',
    rangoMin: 0,
    rangoMax: 10,
    esCritico: true,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'KIT-MICRO-01',
  },
  {
    id: 'pt-sello',
    parametro: 'Sello/empaque',
    unidadMedida: 'score',
    rangoMin: 1,
    rangoMax: 1,
    esCritico: true,
    tiposControl: ['PRODUCTO_TERMINADO'],
    equipoSugerido: 'BALANZA-01',
  },
];

@Injectable({
  providedIn: 'root',
})
export class QualityControlMockRepository implements QualityControlRepository {
  private readonly inventoryCore = inject(InventoryCoreMockRepository);

  getDashboard(companyId: string, filters: QualityInspectionFilters): Observable<QualityControlDashboard> {
    const normalizedFilters = this.normalizeFilters(filters);
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const inspections = store.inspections
      .filter((item) => item.inspection.empresaId === companyId)
      .filter((item) => this.matchesFilters(item.inspection, normalizedFilters))
      .sort((left, right) => new Date(right.inspection.fechaMuestra).getTime() - new Date(left.inspection.fechaMuestra).getTime())
      .map((item) => this.cloneAggregate(item));
    const visibleInspectionIds = new Set(inspections.map((item) => item.inspection.id));
    const visibleLotIds = new Set(inspections.map((item) => item.inspection.loteId));
    const nonConformities = store.nonConformities
      .filter(
        (item) =>
          item.empresaId === companyId &&
          (visibleInspectionIds.has(item.inspeccionId) || visibleLotIds.has(item.loteId)),
      )
      .sort((left, right) => new Date(right.fechaRegistro).getTime() - new Date(left.fechaRegistro).getTime())
      .map((item) => ({ ...item }));
    const histories = store.histories
      .filter((item) => visibleLotIds.has(item.loteId))
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
      .map((item) => ({ ...item }));
    const selectedInspection =
      inspections.find((item) => item.inspection.estadoLote === 'PENDIENTE') ??
      inspections.find((item) => item.inspection.estadoLote === 'CUARENTENA') ??
      inspections[0] ??
      null;

    return of({
      filters: normalizedFilters,
      catalogs: this.buildCatalogs(companyId, layoutStore),
      kpis: {
        totalInspections: inspections.length,
        pendingCount: inspections.filter((item) => item.inspection.estadoLote === 'PENDIENTE').length,
        approvedCount: inspections.filter((item) => item.inspection.estadoLote === 'APROBADO').length,
        rejectedCount: inspections.filter((item) => item.inspection.estadoLote === 'RECHAZADO').length,
        quarantineCount: inspections.filter((item) => item.inspection.estadoLote === 'CUARENTENA').length,
        openNonConformities: nonConformities.filter((item) => item.estado !== 'CERRADA').length,
      },
      inspections,
      nonConformities,
      histories,
      selectedInspection,
    }).pipe(delay(180));
  }

  saveInspection(
    companyId: string,
    payload: SaveQualityInspectionPayload,
    inspectionId?: string,
  ): Observable<QualityControlMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = inspectionId ? this.findInspection(store, companyId, inspectionId) : null;
    const validation = this.validatePayload(companyId, payload, layoutStore);

    if (validation) {
      return throwError(() => new Error(validation));
    }

    if (current?.inspection.liberado) {
      return throwError(() => new Error('La inspeccion ya libero el lote y no se puede editar directamente.'));
    }

    const context = this.resolveLotContext(companyId, payload.loteId, layoutStore);

    if (!context) {
      return throwError(() => new Error('No se pudo resolver el lote seleccionado dentro del layout.'));
    }

    if (context.product.id !== payload.productoId) {
      return throwError(() => new Error('El producto seleccionado no coincide con el lote elegido.'));
    }

    const nextInspectionId = current?.inspection.id ?? `qc-${companyId}-${Date.now()}`;
    const parameters = payload.parametros.map((item, index) =>
      this.buildParameter(nextInspectionId, item, index),
    );
    const evaluation = evaluateInspectionParameters(payload.tipoControl, parameters);
    const nextStatus = evaluation.inspeccionConforme ? 'PENDIENTE' : evaluation.sugerenciaEstado;
    const now = new Date().toISOString();
    const nextInspection: QualityInspection = {
      id: nextInspectionId,
      empresaId: companyId,
      empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
      tipoControl: payload.tipoControl,
      loteId: context.lot.id,
      loteCodigo: context.lot.lote,
      productoId: context.product.id,
      productoCodigo: context.product.sku,
      productoNombre: context.product.nombre,
      proveedorId:
        payload.tipoControl === 'RECEPCION'
          ? payload.proveedorId ?? context.supplier?.id ?? null
          : payload.proveedorId ?? null,
      proveedorNombre:
        payload.tipoControl === 'RECEPCION'
          ? this.findSupplierName(companyId, payload.proveedorId ?? context.supplier?.id ?? null)
          : null,
      ordenProduccion:
        payload.tipoControl === 'RECEPCION'
          ? null
          : payload.ordenProduccion?.trim() || context.orderProduction,
      fechaMuestra: payload.fechaMuestra,
      analista: payload.analista,
      equipoUtilizado: payload.equipoUtilizado,
      estadoLote: nextStatus,
      liberado: false,
      observaciones: payload.observaciones?.trim() || null,
      usuarioCrea: current?.inspection.usuarioCrea ?? payload.usuarioCrea.trim(),
      fechaCrea: current?.inspection.fechaCrea ?? now,
      responsableLiberacion: null,
      fechaLiberacion: null,
    };
    const aggregate: QualityInspectionAggregate = {
      inspection: nextInspection,
      parameters,
      evaluation,
    };
    const eventDate = current?.inspection.fechaCrea ?? now;
    const nextHistories = current
      ? store.histories.filter((item) => item.inspeccionId !== current.inspection.id).map((item) => ({ ...item }))
      : store.histories.map((item) => ({ ...item }));

    nextHistories.unshift(
      this.buildHistory(
        context.lot.id,
        nextInspection.id,
        current ? 'ACTUALIZACION_INSPECCION' : 'REGISTRO_INSPECCION',
        payload.usuarioCrea.trim(),
        now,
        current
          ? `Inspeccion ${nextInspection.tipoControl} actualizada para lote ${context.lot.lote}.`
          : `Inspeccion ${nextInspection.tipoControl} registrada para lote ${context.lot.lote}.`,
      ),
    );
    nextHistories.unshift(
      this.buildHistory(
        context.lot.id,
        nextInspection.id,
        'VALIDACION_AUTOMATICA',
        payload.usuarioCrea.trim(),
        now,
        this.describeEvaluation(evaluation),
      ),
    );

    const nextStore: QualityControlStore = {
      ...store,
      inspections: current
        ? store.inspections.map((item) => (item.inspection.id === current.inspection.id ? aggregate : this.cloneAggregate(item)))
        : [aggregate, ...store.inspections.map((item) => this.cloneAggregate(item))],
      nonConformities: store.nonConformities.map((item) => ({ ...item })),
      histories: nextHistories,
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      current ? 'inspection-edit' : 'inspection-create',
      companyId,
      nextInspection.id,
      `${nextInspection.tipoControl} · ${nextInspection.loteCodigo}`,
      current ? 'Inspeccion de calidad actualizada.' : 'Inspeccion de calidad registrada.',
      current ? this.sanitizeAggregate(current) : null,
      this.sanitizeAggregate(aggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    if (nextInspection.estadoLote === 'CUARENTENA' || nextInspection.estadoLote === 'RECHAZADO') {
      this.syncInventoryCoreLotDecision(
        companyId,
        current?.inspection.estadoLote ?? 'PENDIENTE',
        nextInspection,
        {
          accion: nextInspection.estadoLote === 'RECHAZADO' ? 'RECHAZAR' : 'CUARENTENA',
          usuario: payload.usuarioCrea,
          observacion: this.describeEvaluation(evaluation),
        },
        layoutStore,
      );
    }

    return of<QualityControlMutationResult>({
      action: current ? 'inspection-updated' : 'inspection-created',
      inspection: this.cloneAggregate(aggregate),
      nonConformity: null,
      message:
        nextStatus === 'PENDIENTE'
          ? 'Inspeccion registrada y pendiente de liberacion.'
          : `Inspeccion registrada con estado sugerido ${nextStatus.toLowerCase()}.`,
      auditDraft,
    }).pipe(delay(220));
  }

  takeLotDecision(
    companyId: string,
    inspectionId: string,
    payload: QualityLotDecisionPayload,
  ): Observable<QualityControlMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = this.findInspection(store, companyId, inspectionId);

    if (!current) {
      return throwError(() => new Error('No se encontro la inspeccion seleccionada.'));
    }

    if (payload.accion === 'APROBAR') {
      if (current.inspection.estadoLote === 'RECHAZADO') {
        return throwError(() => new Error('Un lote rechazado no puede liberarse.'));
      }

      if (!current.evaluation.inspeccionConforme) {
        return throwError(() => new Error('La inspeccion tiene parametros fuera de rango y no puede aprobarse.'));
      }

      if (!isAuthorizedQualityReleaser(payload.responsableLiberacion)) {
        return throwError(() => new Error('Solo Jefe de Calidad o Director Técnico pueden liberar lotes.'));
      }
    }

    const decidedAt = new Date().toISOString();
    const nextInspection: QualityInspection = {
      ...current.inspection,
      estadoLote: this.resolveDecisionState(payload.accion),
      liberado: payload.accion === 'APROBAR',
      responsableLiberacion:
        payload.accion === 'APROBAR' ? payload.responsableLiberacion?.trim() || null : null,
      fechaLiberacion: payload.accion === 'APROBAR' ? decidedAt : null,
    };
    const nextAggregate: QualityInspectionAggregate = {
      inspection: nextInspection,
      parameters: current.parameters.map((item) => ({ ...item })),
      evaluation: { ...current.evaluation },
    };
    const nextStore: QualityControlStore = {
      ...store,
      inspections: store.inspections.map((item) =>
        item.inspection.id === inspectionId ? nextAggregate : this.cloneAggregate(item),
      ),
      nonConformities: store.nonConformities.map((item) => ({ ...item })),
      histories: [
        this.buildHistory(
          current.inspection.loteId,
          inspectionId,
          this.resolveDecisionEvent(payload.accion),
          payload.usuario.trim(),
          decidedAt,
          payload.observacion?.trim() || this.resolveDecisionMessage(payload.accion),
        ),
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      this.resolveDecisionAudit(payload.accion),
      companyId,
      inspectionId,
      `${current.inspection.tipoControl} · ${current.inspection.loteCodigo}`,
      this.resolveDecisionMessage(payload.accion),
      this.sanitizeAggregate(current),
      this.sanitizeAggregate(nextAggregate),
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });
    this.syncInventoryCoreLotDecision(
      companyId,
      current.inspection.estadoLote,
      nextInspection,
      payload,
      layoutStore,
    );

    return of<QualityControlMutationResult>({
      action: this.resolveDecisionMutation(payload.accion),
      inspection: this.cloneAggregate(nextAggregate),
      nonConformity: null,
      message: this.resolveDecisionMessage(payload.accion),
      auditDraft,
    }).pipe(delay(220));
  }

  saveNonConformity(
    companyId: string,
    inspectionId: string,
    payload: SaveQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const inspection = this.findInspection(store, companyId, inspectionId);

    if (!inspection) {
      return throwError(() => new Error('No se encontro la inspeccion asociada a la no conformidad.'));
    }

    if (!payload.motivo.trim()) {
      return throwError(() => new Error('Debes registrar el motivo de la no conformidad.'));
    }

    if (!payload.accionCorrectiva.trim()) {
      return throwError(() => new Error('Debes registrar la accion correctiva basica.'));
    }

    if (!payload.responsable.trim()) {
      return throwError(() => new Error('Debes registrar un responsable para la no conformidad.'));
    }

    const createdAt = new Date().toISOString();
    const nonConformity: QualityNonConformity = {
      id: `nc-${companyId}-${Date.now()}`,
      empresaId: companyId,
      loteId: inspection.inspection.loteId,
      inspeccionId: inspectionId,
      motivo: payload.motivo.trim(),
      accionCorrectiva: payload.accionCorrectiva.trim(),
      responsable: payload.responsable.trim(),
      fechaRegistro: createdAt,
      fechaCierre: null,
      estado: payload.estado ?? 'ABIERTA',
    };
    const nextStore: QualityControlStore = {
      ...store,
      inspections: store.inspections.map((item) => this.cloneAggregate(item)),
      nonConformities: [nonConformity, ...store.nonConformities.map((item) => ({ ...item }))],
      histories: [
        this.buildHistory(
          inspection.inspection.loteId,
          inspectionId,
          'NO_CONFORMIDAD_REGISTRADA',
          payload.usuario.trim(),
          createdAt,
          `NC registrada: ${nonConformity.motivo}`,
        ),
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const auditDraft = this.buildAuditDraft(
      'nc-create',
      companyId,
      nonConformity.id,
      `NC · ${inspection.inspection.loteCodigo}`,
      'No conformidad registrada para el lote.',
      null,
      {
        motivo: nonConformity.motivo,
        accionCorrectiva: nonConformity.accionCorrectiva,
        responsable: nonConformity.responsable,
        estado: nonConformity.estado,
      },
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<QualityControlMutationResult>({
      action: 'nc-created',
      inspection: this.cloneAggregate(inspection),
      nonConformity: { ...nonConformity },
      message: 'No conformidad registrada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  closeNonConformity(
    companyId: string,
    nonConformityId: string,
    payload: CloseQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const store = this.ensureBaseline(this.readStore(), companyId, layoutStore);
    const current = store.nonConformities.find(
      (item) => item.empresaId === companyId && item.id === nonConformityId,
    ) ?? null;

    if (!current) {
      return throwError(() => new Error('No se encontro la no conformidad seleccionada.'));
    }

    if (current.estado === 'CERRADA') {
      return throwError(() => new Error('La no conformidad ya se encuentra cerrada.'));
    }

    const closedAt = new Date().toISOString();
    const nextNonConformity: QualityNonConformity = {
      ...current,
      responsable: payload.responsable.trim() || current.responsable,
      fechaCierre: closedAt,
      estado: 'CERRADA',
    };
    const nextStore: QualityControlStore = {
      ...store,
      inspections: store.inspections.map((item) => this.cloneAggregate(item)),
      nonConformities: store.nonConformities.map((item) =>
        item.id === nonConformityId ? nextNonConformity : { ...item },
      ),
      histories: [
        this.buildHistory(
          current.loteId,
          current.inspeccionId,
          'NO_CONFORMIDAD_CERRADA',
          payload.usuario.trim(),
          closedAt,
          payload.observacion?.trim() || 'No conformidad cerrada con accion correctiva ejecutada.',
        ),
        ...store.histories.map((item) => ({ ...item })),
      ],
      auditTrail: store.auditTrail.map((item) => ({ ...item })),
    };
    const inspection = this.findInspection(store, companyId, current.inspeccionId);
    const auditDraft = this.buildAuditDraft(
      'nc-close',
      companyId,
      nonConformityId,
      `NC · ${current.loteId}`,
      'No conformidad cerrada correctamente.',
      {
        estado: current.estado,
        fechaCierre: current.fechaCierre,
      },
      {
        estado: nextNonConformity.estado,
        fechaCierre: nextNonConformity.fechaCierre,
      },
    );

    this.writeStore({
      ...nextStore,
      auditTrail: [auditDraft, ...nextStore.auditTrail],
    });

    return of<QualityControlMutationResult>({
      action: 'nc-closed',
      inspection: inspection ? this.cloneAggregate(inspection) : null,
      nonConformity: { ...nextNonConformity },
      message: 'No conformidad cerrada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  private syncInventoryCoreLotDecision(
    companyId: string,
    previousStatus: QualityLotStatus,
    inspection: QualityInspection,
    payload: QualityLotDecisionPayload,
    layoutStore: StorageLayoutStore,
  ): void {
    if (previousStatus === inspection.estadoLote) {
      return;
    }

    const command = this.buildInventoryLotCommand(companyId, inspection, payload, layoutStore);
    const result =
      payload.accion === 'APROBAR'
        ? this.inventoryCore.releaseLot(companyId, command)
        : payload.accion === 'RECHAZAR'
          ? this.inventoryCore.rejectLot(companyId, command)
          : this.inventoryCore.blockLot(companyId, {
              ...command,
              estado: 'CUARENTENA',
            });

    result.subscribe({ error: () => undefined });
  }

  private buildInventoryLotCommand(
    companyId: string,
    inspection: QualityInspection,
    payload: QualityLotDecisionPayload,
    layoutStore: StorageLayoutStore,
  ): InventoryLotCommandPayload {
    const context = this.resolveLotContext(companyId, inspection.loteId, layoutStore);

    return {
      productoId: inspection.productoId,
      sku: inspection.productoCodigo,
      productoNombre: inspection.productoNombre,
      bodegaId: context?.lot.bodegaId ?? `${companyId}-quality-warehouse`,
      ubicacionId: context?.lot.ubicacionId ?? `${companyId}-quality-location`,
      loteId: inspection.loteId,
      lote: inspection.loteCodigo,
      documentoOrigen: inspection.id,
      moduloOrigen: 'QUALITY_CONTROL',
      usuarioId: payload.usuario.trim(),
      observacion: payload.observacion?.trim() || this.resolveDecisionMessage(payload.accion),
    };
  }

  private readStore(): QualityControlStore {
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
      const parsed = JSON.parse(raw) as QualityControlStore;
      return {
        inspections: parsed.inspections ?? [],
        nonConformities: parsed.nonConformities ?? [],
        histories: parsed.histories ?? [],
        auditTrail: parsed.auditTrail ?? [],
      };
    } catch {
      const emptyStore = createEmptyStore();
      this.writeStore(emptyStore);
      return emptyStore;
    }
  }

  private writeStore(store: QualityControlStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  private ensureBaseline(
    store: QualityControlStore,
    companyId: string,
    layoutStore: StorageLayoutStore,
  ): QualityControlStore {
    const hasCompanyData = store.inspections.some((item) => item.inspection.empresaId === companyId);

    if (hasCompanyData) {
      return store;
    }

    const seededStore = this.seedCompany(store, companyId, layoutStore);
    this.writeStore(seededStore);
    return seededStore;
  }

  private seedCompany(
    store: QualityControlStore,
    companyId: string,
    layoutStore: StorageLayoutStore,
  ): QualityControlStore {
    const inspections: QualityInspectionAggregate[] = [];
    const nonConformities: QualityNonConformity[] = [];
    const histories: QualityLotHistory[] = [];

    if (companyId === 'medussa-holding') {
      const milkPowder = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'LPE25-0407'), layoutStore);
      const culture = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'CLM-0328'), layoutStore);
      const yogurt = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'YOG-0420-FR'), layoutStore);
      const uht = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'UHT-2404-A'), layoutStore);
      const uhtReserve = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'UHT-2404-B'), layoutStore);
      const cheeseRejected = this.resolveLotContext(companyId, this.findLotId(layoutStore, companyId, 'QUE-0321-R'), layoutStore);

      const approvedReception = milkPowder
        ? this.createSeedInspection(companyId, milkPowder, {
            id: 'qc-seed-recepcion-lpe',
            tipoControl: 'RECEPCION',
            fechaMuestra: '2026-04-08T07:20:00-05:00',
            analista: 'Analista Calidad 1',
            equipoUtilizado: 'TERMOMETRO-01',
            observaciones: 'Recepcion de leche en polvo para respaldo de produccion UHT.',
            usuarioCrea: 'demo.analista-calidad-1',
            proveedorId: milkPowder.supplier?.id ?? null,
            ordenProduccion: null,
            liberado: true,
            responsableLiberacion: 'Jefe de Calidad',
            fechaLiberacion: '2026-04-08T10:40:00-05:00',
            parameters: [
              this.seedParameter('recepcion-temperatura', 5.1, 2, 8),
              this.seedParameter('recepcion-humedad', 3.2, 2, 5),
              this.seedParameter('recepcion-micro', 4, 0, 10),
            ],
          })
        : null;

      const quarantineReception = culture
        ? this.createSeedInspection(companyId, culture, {
            id: 'qc-seed-recepcion-clm',
            tipoControl: 'RECEPCION',
            fechaMuestra: '2026-04-18T08:05:00-05:00',
            analista: 'Analista Calidad 2',
            equipoUtilizado: 'TERMOMETRO-01',
            observaciones: 'Ingreso de cultivo lactico con desviacion termica en recepcion.',
            usuarioCrea: 'demo.analista-calidad-2',
            proveedorId: culture.supplier?.id ?? null,
            ordenProduccion: null,
            forceStatus: 'CUARENTENA',
            parameters: [
              this.seedParameter('recepcion-temperatura', 11.3, 2, 8),
              this.seedParameter('recepcion-humedad', 3.4, 2, 5),
              this.seedParameter('recepcion-micro', 6, 0, 10),
            ],
          })
        : null;

      const processQuarantine = yogurt
        ? this.createSeedInspection(companyId, yogurt, {
            id: 'qc-seed-proceso-yog',
            tipoControl: 'PROCESO',
            fechaMuestra: '2026-04-19T09:15:00-05:00',
            analista: 'Analista Calidad 1',
            equipoUtilizado: 'PH-METER-02',
            observaciones: 'Control intermedio de tanque con desviacion termica leve.',
            usuarioCrea: 'demo.analista-calidad-1',
            proveedorId: null,
            ordenProduccion: yogurt.orderProduction,
            forceStatus: 'CUARENTENA',
            parameters: [
              this.seedParameter('proceso-ph', 4.28, 4.1, 4.6),
              this.seedParameter('proceso-brix', 13.4, 12.5, 14.5),
              this.seedParameter('proceso-temperatura', 6.7, 4, 6),
              this.seedParameter('proceso-peso', 200, 198, 202),
            ],
          })
        : null;

      const approvedFinished = uht
        ? this.createSeedInspection(companyId, uht, {
            id: 'qc-seed-pt-uht',
            tipoControl: 'PRODUCTO_TERMINADO',
            fechaMuestra: '2026-04-17T14:20:00-05:00',
            analista: 'Jefe de Calidad',
            equipoUtilizado: 'KIT-MICRO-01',
            observaciones: 'Lote UHT conforme para despacho nacional.',
            usuarioCrea: 'demo.jefe-calidad',
            proveedorId: null,
            ordenProduccion: uht.orderProduction,
            liberado: true,
            responsableLiberacion: 'Director Técnico',
            fechaLiberacion: '2026-04-17T17:05:00-05:00',
            parameters: [
              this.seedCustomParameter('pH', 6.62, 'pH', 6.5, 6.8, true),
              this.seedCustomParameter('Microbiologia', 2, 'UFC/ml', 0, 10, true),
              this.seedCustomParameter('Sello/empaque', 1, 'score', 1, 1, true),
            ],
          })
        : null;

      const pendingFinished = uhtReserve
        ? this.createSeedInspection(companyId, uhtReserve, {
            id: 'qc-seed-pt-uht-pend',
            tipoControl: 'PRODUCTO_TERMINADO',
            fechaMuestra: '2026-04-20T06:40:00-05:00',
            analista: 'Analista Calidad 2',
            equipoUtilizado: 'PH-METER-01',
            observaciones: 'Muestra conforme pendiente de firma de liberacion.',
            usuarioCrea: 'demo.analista-calidad-2',
            proveedorId: null,
            ordenProduccion: uhtReserve.orderProduction,
            parameters: [
              this.seedCustomParameter('pH', 6.58, 'pH', 6.5, 6.8, true),
              this.seedCustomParameter('Microbiologia', 1, 'UFC/ml', 0, 10, true),
              this.seedCustomParameter('Sello/empaque', 1, 'score', 1, 1, true),
            ],
          })
        : null;

      const rejectedFinished = cheeseRejected
        ? this.createSeedInspection(companyId, cheeseRejected, {
            id: 'qc-seed-pt-que',
            tipoControl: 'PRODUCTO_TERMINADO',
            fechaMuestra: '2026-04-18T11:30:00-05:00',
            analista: 'Jefe de Calidad',
            equipoUtilizado: 'KIT-MICRO-01',
            observaciones: 'Queso en cuarentena sanitaria por desviacion microbiologica y humedad.',
            usuarioCrea: 'demo.jefe-calidad',
            proveedorId: null,
            ordenProduccion: cheeseRejected.orderProduction,
            forceStatus: 'RECHAZADO',
            parameters: [
              this.seedCustomParameter('Peso neto', 476, 'g', 495, 505, false),
              this.seedCustomParameter('Humedad', 49.2, '%', 40, 46, true),
              this.seedCustomParameter('Microbiologia', 52, 'UFC/g', 0, 10, true),
            ],
          })
        : null;

      [approvedReception, quarantineReception, processQuarantine, approvedFinished, pendingFinished, rejectedFinished]
        .filter((item): item is QualityInspectionAggregate => !!item)
        .forEach((item) => inspections.push(item));

      if (quarantineReception) {
        nonConformities.push({
          id: 'nc-seed-clm',
          empresaId: companyId,
          loteId: quarantineReception.inspection.loteId,
          inspeccionId: quarantineReception.inspection.id,
          motivo: 'Cultivo lactico recibido por encima del rango termico de recepcion.',
          accionCorrectiva: 'Mantener en cuarentena y solicitar contramuestra al proveedor.',
          responsable: 'Analista Calidad 2',
          fechaRegistro: '2026-04-18T08:25:00-05:00',
          fechaCierre: null,
          estado: 'EN_ANALISIS',
        });
      }

      if (processQuarantine) {
        nonConformities.push({
          id: 'nc-seed-yog',
          empresaId: companyId,
          loteId: processQuarantine.inspection.loteId,
          inspeccionId: processQuarantine.inspection.id,
          motivo: 'Desviacion termica en tanque de yogurt durante control en proceso.',
          accionCorrectiva: 'Ajustar enfriamiento, repetir muestra y verificar equipo.',
          responsable: 'Jefe de Calidad',
          fechaRegistro: '2026-04-19T09:40:00-05:00',
          fechaCierre: '2026-04-19T13:15:00-05:00',
          estado: 'CERRADA',
        });
      }

      if (rejectedFinished) {
        nonConformities.push({
          id: 'nc-seed-que',
          empresaId: companyId,
          loteId: rejectedFinished.inspection.loteId,
          inspeccionId: rejectedFinished.inspection.id,
          motivo: 'Carga microbiologica y humedad por fuera de especificacion.',
          accionCorrectiva: 'Bloquear lote, ampliar investigacion sanitaria y descartar liberacion.',
          responsable: 'Director Técnico',
          fechaRegistro: '2026-04-18T12:00:00-05:00',
          fechaCierre: null,
          estado: 'ABIERTA',
        });
      }

      inspections.forEach((aggregate) => {
        histories.push(
          this.buildHistory(
            aggregate.inspection.loteId,
            aggregate.inspection.id,
            'REGISTRO_INSPECCION',
            aggregate.inspection.usuarioCrea,
            aggregate.inspection.fechaCrea,
            `Inspeccion ${aggregate.inspection.tipoControl} registrada sobre ${aggregate.inspection.loteCodigo}.`,
          ),
        );
        histories.push(
          this.buildHistory(
            aggregate.inspection.loteId,
            aggregate.inspection.id,
            'VALIDACION_AUTOMATICA',
            aggregate.inspection.usuarioCrea,
            aggregate.inspection.fechaCrea,
            this.describeEvaluation(aggregate.evaluation),
          ),
        );

        if (aggregate.inspection.estadoLote === 'APROBADO' && aggregate.inspection.liberado) {
          histories.push(
            this.buildHistory(
              aggregate.inspection.loteId,
              aggregate.inspection.id,
              'LIBERACION_LOTE',
              aggregate.inspection.responsableLiberacion ?? 'Jefe de Calidad',
              aggregate.inspection.fechaLiberacion ?? aggregate.inspection.fechaCrea,
              'Lote liberado para uso o despacho.',
            ),
          );
        }

        if (aggregate.inspection.estadoLote === 'CUARENTENA') {
          histories.push(
            this.buildHistory(
              aggregate.inspection.loteId,
              aggregate.inspection.id,
              'ENVIO_CUARENTENA',
              aggregate.inspection.analista,
              aggregate.inspection.fechaCrea,
              'Lote retenido preventivamente para analisis adicional.',
            ),
          );
        }

        if (aggregate.inspection.estadoLote === 'RECHAZADO') {
          histories.push(
            this.buildHistory(
              aggregate.inspection.loteId,
              aggregate.inspection.id,
              'RECHAZO_LOTE',
              aggregate.inspection.analista,
              aggregate.inspection.fechaCrea,
              'Lote rechazado por desviaciones criticas de calidad.',
            ),
          );
        }
      });

      nonConformities.forEach((item) => {
        histories.push(
          this.buildHistory(
            item.loteId,
            item.inspeccionId,
            item.estado === 'CERRADA' ? 'NO_CONFORMIDAD_CERRADA' : 'NO_CONFORMIDAD_REGISTRADA',
            item.responsable,
            item.fechaCierre ?? item.fechaRegistro,
            item.estado === 'CERRADA'
              ? 'No conformidad cerrada luego de accion correctiva.'
              : `No conformidad registrada: ${item.motivo}`,
          ),
        );
      });
    } else {
      const lot = layoutStore.lots.find((item) => item.empresaId === companyId) ?? null;
      const context = lot ? this.resolveLotContext(companyId, lot.id, layoutStore) : null;

      if (context) {
        inspections.push(
          this.createSeedInspection(companyId, context, {
            id: `qc-seed-${companyId}-1`,
            tipoControl: 'RECEPCION',
            fechaMuestra: new Date().toISOString(),
            analista: 'Analista Calidad 1',
            equipoUtilizado: 'TERMOMETRO-01',
            observaciones: 'Seed basico de control de calidad para empresa secundaria.',
            usuarioCrea: 'demo.analista-calidad-1',
            proveedorId: context.supplier?.id ?? null,
            ordenProduccion: null,
            parameters: [
              this.seedParameter('recepcion-temperatura', 5, 2, 8),
              this.seedParameter('recepcion-humedad', 3, 2, 5),
            ],
          }),
        );
        histories.push(
          this.buildHistory(
            context.lot.id,
            inspections[0].inspection.id,
            'REGISTRO_INSPECCION',
            'demo.analista-calidad-1',
            inspections[0].inspection.fechaCrea,
            'Seed inicial de control de calidad.',
          ),
        );
      }
    }

    const auditDraft = this.buildAuditDraft(
      'seed',
      companyId,
      `quality-control-${companyId}`,
      `Seed Control de Calidad ${COMPANY_NAMES[companyId] ?? companyId}`,
      'Carga inicial de inspecciones, no conformidades e historial por lote.',
      null,
      {
        inspections: inspections.length,
        nonConformities: nonConformities.length,
        histories: histories.length,
      },
    );

    return {
      ...store,
      inspections: [...inspections, ...store.inspections.map((item) => this.cloneAggregate(item))],
      nonConformities: [...nonConformities, ...store.nonConformities.map((item) => ({ ...item }))],
      histories: [...histories, ...store.histories.map((item) => ({ ...item }))],
      auditTrail: [auditDraft, ...store.auditTrail],
    };
  }

  private buildCatalogs(companyId: string, layoutStore: StorageLayoutStore): QualityControlCatalogs {
    const products = this.readProducts(companyId);
    const suppliers = this.readSuppliers(companyId);
    const lots = layoutStore.lots
      .filter((item) => item.empresaId === companyId)
      .map((lot) => {
        const product = products.find((item) => item.id === lot.skuId);
        const supplier = product ? this.resolveSupplierForProduct(product, suppliers) : null;
        return {
          value: lot.id,
          label: `${lot.lote} · ${lot.productoNombre}`,
          lotCode: lot.lote,
          productId: lot.skuId,
          productName: lot.productoNombre,
          supplierId: supplier?.id ?? null,
          supplierName: supplier?.nombreProveedor ?? null,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label, 'es-CO'));

    return {
      controlTypes: [
        { value: 'RECEPCION', label: 'Recepcion' },
        { value: 'PROCESO', label: 'Proceso' },
        { value: 'PRODUCTO_TERMINADO', label: 'Producto terminado' },
      ],
      lotStatuses: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'APROBADO', label: 'Aprobado' },
        { value: 'RECHAZADO', label: 'Rechazado' },
        { value: 'CUARENTENA', label: 'Cuarentena' },
      ],
      lots,
      products: products
        .filter((item) => item.estado === 'ACTIVO')
        .map((item) => ({
          value: item.id,
          label: `${item.sku} · ${item.nombre}`,
          productCode: item.sku,
          productName: item.nombre,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
      suppliers: suppliers
        .filter((item) => item.estado === 'ACTIVO')
        .map((item) => ({ value: item.id, label: item.nombreProveedor }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
      analysts: ANALYSTS.map((value) => ({ value, label: value })),
      equipments: EQUIPMENTS.map((value) => ({ value, label: value })),
      releasers: RELEASERS.map((value) => ({ value, label: value })),
      actionOptions: [
        { value: 'APROBAR', label: 'Aprobar' },
        { value: 'RECHAZAR', label: 'Rechazar' },
        { value: 'CUARENTENA', label: 'Enviar a cuarentena' },
        { value: 'REINSPECCION', label: 'Reinspeccion' },
      ],
      nonConformityStatuses: [
        { value: 'ABIERTA', label: 'Abierta' },
        { value: 'EN_ANALISIS', label: 'En analisis' },
        { value: 'CERRADA', label: 'Cerrada' },
      ],
      parameterTemplates: QUALITY_PARAMETER_TEMPLATES.map((item) => ({ ...item })),
      orderProductionOptions: lots
        .map((item) => ({
          value: `OP-${(COMPANY_NAMES[companyId] ?? 'ARB').slice(0, 3).toUpperCase()}-${item.lotCode.replace(/[^A-Z0-9]/gi, '').slice(0, 8)}`,
          label: `${item.lotCode} · Orden mock`,
          productId: item.productId,
          lotId: item.value,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es-CO')),
    };
  }

  private validatePayload(
    companyId: string,
    payload: SaveQualityInspectionPayload,
    layoutStore: StorageLayoutStore,
  ): string | null {
    if (!payload.tipoControl) {
      return 'Debes seleccionar el tipo de control.';
    }

    const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === payload.loteId) ?? null;

    if (!lot) {
      return 'Debes seleccionar un lote valido.';
    }

    if (!payload.productoId) {
      return 'Debes seleccionar el producto o materia prima asociada.';
    }

    if (!payload.fechaMuestra) {
      return 'Debes registrar la fecha de muestra.';
    }

    if (!payload.analista.trim()) {
      return 'Debes registrar el analista.';
    }

    if (!payload.parametros.length) {
      return 'Debes registrar al menos un parametro medido.';
    }

    for (const parameter of payload.parametros) {
      if (!parameter.parametro.trim()) {
        return 'Todos los parametros deben tener nombre.';
      }

      if (!parameter.unidadMedida.trim()) {
        return `Debes registrar la unidad para ${parameter.parametro}.`;
      }

      if (!Number.isFinite(parameter.resultado)) {
        return `El resultado de ${parameter.parametro} debe ser numerico.`;
      }

      if (Number(parameter.rangoMin) > Number(parameter.rangoMax)) {
        return `El rango de ${parameter.parametro} es invalido.`;
      }
    }

    return null;
  }

  private normalizeFilters(filters: QualityInspectionFilters): QualityInspectionFilters {
    return {
      ...DEFAULT_QUALITY_INSPECTION_FILTERS,
      ...filters,
      loteId: filters.loteId ?? null,
      productoId: filters.productoId ?? null,
      proveedorId: filters.proveedorId ?? null,
      estadoLote: filters.estadoLote ?? 'TODOS',
      analista: filters.analista ?? null,
    };
  }

  private matchesFilters(inspection: QualityInspection, filters: QualityInspectionFilters): boolean {
    const sampleDate = inspection.fechaMuestra.slice(0, 10);

    return (
      (filters.tipoControl === 'TODOS' || inspection.tipoControl === filters.tipoControl) &&
      (!filters.loteId || inspection.loteId === filters.loteId) &&
      (!filters.productoId || inspection.productoId === filters.productoId) &&
      (!filters.proveedorId || inspection.proveedorId === filters.proveedorId) &&
      (filters.estadoLote === 'TODOS' || inspection.estadoLote === filters.estadoLote) &&
      (!filters.analista || inspection.analista === filters.analista) &&
      sampleDate >= filters.fechaDesde &&
      sampleDate <= filters.fechaHasta
    );
  }

  private buildParameter(
    inspectionId: string,
    payload: SaveQualityInspectionParameterPayload,
    index: number,
  ): QualityInspectionDetail {
    const result = round(payload.resultado);
    const min = round(payload.rangoMin);
    const max = round(payload.rangoMax);

    return {
      id: `qc-param-${inspectionId}-${index + 1}`,
      inspeccionId: inspectionId,
      templateId: payload.templateId ?? null,
      parametro: payload.parametro.trim(),
      resultado: result,
      unidadMedida: payload.unidadMedida.trim(),
      rangoMin: min,
      rangoMax: max,
      conforme: resolveParameterConformity(result, min, max),
      esCritico: payload.esCritico,
    };
  }

  private resolveLotContext(
    companyId: string,
    lotId: string | null,
    layoutStore: StorageLayoutStore,
  ): {
    lot: StorageLayoutLot;
    product: Product;
    supplier: Supplier | null;
    orderProduction: string | null;
  } | null {
    if (!lotId) {
      return null;
    }

    const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === lotId) ?? null;

    if (!lot) {
      return null;
    }

    const product = this.readProducts(companyId).find((item) => item.id === lot.skuId) ?? null;

    if (!product) {
      return null;
    }

    const supplier = this.resolveSupplierForProduct(product, this.readSuppliers(companyId));
    const orderProduction =
      product.familia === 'Producto terminado'
        ? `OP-ARB-${slugify(product.sku).toUpperCase()}-${lot.fechaIngreso.replace(/-/g, '')}`
        : null;

    return {
      lot,
      product,
      supplier,
      orderProduction,
    };
  }

  private resolveSupplierForProduct(product: Product, suppliers: Supplier[]): Supplier | null {
    const normalizedName = normalize(product.nombre);

    if (normalizedName.includes('leche en polvo')) {
      return suppliers.find((item) => normalize(item.productoPrincipal).includes('leche en polvo')) ?? null;
    }

    if (normalizedName.includes('cultivo') || normalizedName.includes('cloruro') || normalizedName.includes('quim')) {
      return suppliers.find((item) => normalize(item.nombreProveedor).includes('quimiplus')) ?? null;
    }

    if (normalizedName.includes('doypack') || normalizedName.includes('envase') || normalizedName.includes('etiqueta')) {
      return suppliers.find((item) => normalize(item.nombreProveedor).includes('empaques')) ?? null;
    }

    if (normalizedName.includes('leche cruda')) {
      return suppliers.find((item) => normalize(item.productoPrincipal).includes('leche cruda')) ?? null;
    }

    return null;
  }

  private findSupplierName(companyId: string, supplierId: string | null): string | null {
    if (!supplierId) {
      return null;
    }

    return (
      this.readSuppliers(companyId).find((item) => item.id === supplierId)?.nombreProveedor ?? null
    );
  }

  private findInspection(
    store: QualityControlStore,
    companyId: string,
    inspectionId: string,
  ): QualityInspectionAggregate | null {
    const aggregate = store.inspections.find(
      (item) => item.inspection.empresaId === companyId && item.inspection.id === inspectionId,
    );

    return aggregate ? this.cloneAggregate(aggregate) : null;
  }

  private createSeedInspection(
    companyId: string,
    context: {
      lot: StorageLayoutLot;
      product: Product;
      supplier: Supplier | null;
      orderProduction: string | null;
    },
    input: {
      id: string;
      tipoControl: QualityControlType;
      fechaMuestra: string;
      analista: string;
      equipoUtilizado: string;
      observaciones: string;
      usuarioCrea: string;
      proveedorId: string | null;
      ordenProduccion: string | null;
      parameters: SaveQualityInspectionParameterPayload[];
      liberado?: boolean;
      responsableLiberacion?: string | null;
      fechaLiberacion?: string | null;
      forceStatus?: QualityLotStatus;
    },
  ): QualityInspectionAggregate {
    const parameters = input.parameters.map((item, index) => this.buildParameter(input.id, item, index));
    const evaluation = evaluateInspectionParameters(input.tipoControl, parameters);
    const status =
      input.forceStatus ??
      (input.liberado ? 'APROBADO' : evaluation.inspeccionConforme ? 'PENDIENTE' : evaluation.sugerenciaEstado);

    return {
      inspection: {
        id: input.id,
        empresaId: companyId,
        empresaNombre: COMPANY_NAMES[companyId] ?? 'Empresa activa',
        tipoControl: input.tipoControl,
        loteId: context.lot.id,
        loteCodigo: context.lot.lote,
        productoId: context.product.id,
        productoCodigo: context.product.sku,
        productoNombre: context.product.nombre,
        proveedorId: input.tipoControl === 'RECEPCION' ? input.proveedorId : null,
        proveedorNombre:
          input.tipoControl === 'RECEPCION'
            ? this.findSupplierName(companyId, input.proveedorId ?? context.supplier?.id ?? null)
            : null,
        ordenProduccion:
          input.tipoControl === 'RECEPCION'
            ? null
            : input.ordenProduccion ?? context.orderProduction,
        fechaMuestra: input.fechaMuestra,
        analista: input.analista,
        equipoUtilizado: input.equipoUtilizado,
        estadoLote: status,
        liberado: !!input.liberado,
        observaciones: input.observaciones,
        usuarioCrea: input.usuarioCrea,
        fechaCrea: input.fechaMuestra,
        responsableLiberacion: input.liberado ? input.responsableLiberacion ?? null : null,
        fechaLiberacion: input.liberado ? input.fechaLiberacion ?? input.fechaMuestra : null,
      },
      parameters,
      evaluation,
    };
  }

  private seedParameter(
    templateId: string,
    resultado: number,
    rangoMin?: number,
    rangoMax?: number,
  ): SaveQualityInspectionParameterPayload {
    const template = QUALITY_PARAMETER_TEMPLATES.find((item) => item.id === templateId)!;

    return {
      templateId,
      parametro: template.parametro,
      resultado,
      unidadMedida: template.unidadMedida,
      rangoMin: rangoMin ?? template.rangoMin,
      rangoMax: rangoMax ?? template.rangoMax,
      esCritico: template.esCritico,
    };
  }

  private seedCustomParameter(
    parametro: string,
    resultado: number,
    unidadMedida: string,
    rangoMin: number,
    rangoMax: number,
    esCritico: boolean,
  ): SaveQualityInspectionParameterPayload {
    return {
      templateId: null,
      parametro,
      resultado,
      unidadMedida,
      rangoMin,
      rangoMax,
      esCritico,
    };
  }

  private buildHistory(
    loteId: string,
    inspeccionId: string,
    evento: string,
    usuario: string,
    fecha: string,
    observacion: string,
  ): QualityLotHistory {
    return {
      id: `${inspeccionId}-${evento}-${Date.parse(fecha)}`,
      loteId,
      inspeccionId,
      evento,
      usuario,
      fecha,
      observacion,
    };
  }

  private buildAuditDraft(
    action: QualityControlAuditDraft['action'],
    companyId: string,
    entityId: string,
    entityName: string,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): QualityControlAuditDraft {
    return {
      module: 'control-calidad',
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

  private sanitizeAggregate(aggregate: QualityInspectionAggregate): Record<string, unknown> {
    return {
      inspection: {
        id: aggregate.inspection.id,
        tipoControl: aggregate.inspection.tipoControl,
        loteCodigo: aggregate.inspection.loteCodigo,
        productoNombre: aggregate.inspection.productoNombre,
        estadoLote: aggregate.inspection.estadoLote,
        liberado: aggregate.inspection.liberado,
        analista: aggregate.inspection.analista,
        responsableLiberacion: aggregate.inspection.responsableLiberacion,
      },
      parameters: aggregate.parameters.map((item) => ({
        parametro: item.parametro,
        resultado: item.resultado,
        rangoMin: item.rangoMin,
        rangoMax: item.rangoMax,
        conforme: item.conforme,
        esCritico: item.esCritico,
      })),
      evaluation: { ...aggregate.evaluation },
    };
  }

  private cloneAggregate(aggregate: QualityInspectionAggregate): QualityInspectionAggregate {
    return {
      inspection: { ...aggregate.inspection },
      parameters: aggregate.parameters.map((item) => ({ ...item })),
      evaluation: { ...aggregate.evaluation },
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

  private findLotId(layoutStore: StorageLayoutStore, companyId: string, lotCode: string): string | null {
    return layoutStore.lots.find((item) => item.empresaId === companyId && item.lote === lotCode)?.id ?? null;
  }

  private describeEvaluation(evaluation: QualityInspectionEvaluation): string {
    if (evaluation.totalParametros === 0) {
      return 'Sin parametros medidos, inspeccion pendiente de captura.';
    }

    if (evaluation.inspeccionConforme) {
      return 'Todos los parametros quedaron dentro de rango y el lote puede liberarse con autorizacion.';
    }

    if (evaluation.criticosFueraDeRango > 0) {
      return `Se detectaron ${evaluation.criticosFueraDeRango} parametros criticos fuera de rango; el lote debe ${evaluation.accionSugerida === 'RECHAZAR' ? 'rechazarse' : 'pasar a cuarentena'}.`;
    }

    return `Hay ${evaluation.noConformes} parametros fuera de rango sin criticidad alta; se recomienda cuarentena o reinspeccion.`;
  }

  private resolveDecisionState(action: QualityLotDecisionPayload['accion']): QualityLotStatus {
    if (action === 'APROBAR') {
      return 'APROBADO';
    }

    if (action === 'RECHAZAR') {
      return 'RECHAZADO';
    }

    return 'CUARENTENA';
  }

  private resolveDecisionEvent(action: QualityLotDecisionPayload['accion']): string {
    if (action === 'APROBAR') {
      return 'LIBERACION_LOTE';
    }

    if (action === 'RECHAZAR') {
      return 'RECHAZO_LOTE';
    }

    return 'ENVIO_CUARENTENA';
  }

  private resolveDecisionAudit(
    action: QualityLotDecisionPayload['accion'],
  ): QualityControlAuditDraft['action'] {
    if (action === 'APROBAR') {
      return 'lot-approve';
    }

    if (action === 'RECHAZAR') {
      return 'lot-reject';
    }

    return 'lot-quarantine';
  }

  private resolveDecisionMutation(
    action: QualityLotDecisionPayload['accion'],
  ): QualityControlMutationResult['action'] {
    if (action === 'APROBAR') {
      return 'lot-approved';
    }

    if (action === 'RECHAZAR') {
      return 'lot-rejected';
    }

    return 'lot-quarantine';
  }

  private resolveDecisionMessage(action: QualityLotDecisionPayload['accion']): string {
    if (action === 'APROBAR') {
      return 'Lote aprobado y liberado correctamente.';
    }

    if (action === 'RECHAZAR') {
      return 'Lote rechazado y bloqueado para liberacion.';
    }

    return 'Lote enviado a cuarentena con trazabilidad registrada.';
  }
}

function createEmptyStore(): QualityControlStore {
  return {
    inspections: [],
    nonConformities: [],
    histories: [],
    auditTrail: [],
  };
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

function slugify(value: string): string {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
