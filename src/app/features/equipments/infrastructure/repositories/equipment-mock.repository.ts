import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from '../../domain/models/equipment-filters.model';
import { SaveEquipmentPayload } from '../../domain/models/equipment-form.model';
import { Equipment, EquipmentCatalogs, EquipmentStatus } from '../../domain/models/equipment.model';
import {
  EquipmentAuditDraft,
  EquipmentListResponse,
  EquipmentMutationAction,
  EquipmentMutationResult,
  EquipmentStore,
} from '../../domain/models/equipment-response.model';
import { EquipmentsRepository } from '../../domain/repositories/equipment.repository';
import {
  CAPACITY_UNIT_OPTIONS,
  EQUIPMENT_LOCATION_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  INITIAL_EQUIPMENTS_STORE,
} from '../data/equipments.mock';

@Injectable({
  providedIn: 'root',
})
export class EquipmentMockRepository implements EquipmentsRepository {
  private readonly storageKey = 'medussa.erp.mock.equipments';

  getCatalogs(companyId: string): Observable<EquipmentCatalogs> {
    void companyId;
    return of({
      capacityUnits: CAPACITY_UNIT_OPTIONS.map((item) => ({ ...item })),
      equipmentTypes: EQUIPMENT_TYPE_OPTIONS.map((item) => ({ ...item })),
      equipmentLocations: EQUIPMENT_LOCATION_OPTIONS.map((item) => ({ ...item })),
    }).pipe(delay(120));
  }

  listEquipments(companyId: string, filters: EquipmentFilters): Observable<EquipmentListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const equipments = this.readStore().equipments
      .map((equipment) => this.cloneEquipment(equipment))
      .filter((equipment) => equipment.empresaId === normalizedFilters.empresaId)
      .filter((equipment) => this.matchesFilters(equipment, normalizedFilters))
      .sort((left, right) => left.nombreEquipo.localeCompare(right.nombreEquipo, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: equipments.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: equipments.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  getEquipment(companyId: string, equipmentId: string): Observable<Equipment> {
    const equipment = this.readStore().equipments.find(
      (item) => item.empresaId === companyId && item.id === equipmentId,
    );

    if (!equipment) {
      return throwError(() => new Error('No se encontró el equipo solicitado.'));
    }

    return of(this.cloneEquipment(equipment)).pipe(delay(150));
  }

  saveEquipment(
    companyId: string,
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): Observable<EquipmentMutationResult> {
    const store = this.readStore();
    const currentEquipment = equipmentId
      ? store.equipments.find((equipment) => equipment.empresaId === companyId && equipment.id === equipmentId)
      : undefined;
    const validationError = this.validatePayload(store, companyId, payload, equipmentId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const nextEquipment: Equipment = {
      id:
        currentEquipment?.id ??
        this.buildEquipmentId(normalizedPayload.idEquipo, normalizedPayload.nombreEquipo),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      idEquipo: normalizedPayload.idEquipo,
      nombreEquipo: normalizedPayload.nombreEquipo,
      capacidad: normalizedPayload.capacidad,
      unidadCapacidad: normalizedPayload.unidadCapacidad,
      diametro: normalizedPayload.diametro,
      altura: normalizedPayload.altura,
      empresaFabricante: normalizedPayload.empresaFabricante,
      direccionFabricante: normalizedPayload.direccionFabricante,
      correoFabricante: normalizedPayload.correoFabricante,
      tipoEquipo: normalizedPayload.tipoEquipo,
      ubicacionOperativa: normalizedPayload.ubicacionOperativa,
      estado: normalizedPayload.estado,
      createdAt: currentEquipment?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tieneDependenciasActivas: currentEquipment?.tieneDependenciasActivas ?? false,
    };
    const nextEquipments = currentEquipment
      ? store.equipments.map((equipment) =>
          equipment.empresaId === companyId && equipment.id === currentEquipment.id ? nextEquipment : equipment,
        )
      : [nextEquipment, ...store.equipments];
    const action: EquipmentMutationAction = currentEquipment ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextEquipment,
      action === 'created'
        ? `Creación del equipo ${nextEquipment.nombreEquipo}.`
        : `Actualización del equipo ${nextEquipment.nombreEquipo}.`,
      currentEquipment ? sanitizeAuditPayload(currentEquipment) : null,
      sanitizeAuditPayload(nextEquipment),
    );

    this.writeStore({
      ...store,
      equipments: nextEquipments,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<EquipmentMutationResult>({
      action,
      equipment: this.cloneEquipment(nextEquipment),
      message:
        action === 'created'
          ? `El equipo ${nextEquipment.nombreEquipo} fue creado correctamente.`
          : `El equipo ${nextEquipment.nombreEquipo} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteEquipment(companyId: string, equipmentId: string): Observable<EquipmentMutationResult> {
    const store = this.readStore();
    const currentEquipment = store.equipments.find(
      (equipment) => equipment.empresaId === companyId && equipment.id === equipmentId,
    );

    if (!currentEquipment) {
      return throwError(() => new Error('No se encontró el equipo solicitado.'));
    }

    if (currentEquipment.tieneDependenciasActivas) {
      const nextEquipment: Equipment = {
        ...this.cloneEquipment(currentEquipment),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextEquipment,
        `Inactivación preventiva del equipo ${nextEquipment.nombreEquipo} por dependencias activas.`,
        sanitizeAuditPayload(currentEquipment),
        sanitizeAuditPayload(nextEquipment),
      );

      this.writeStore({
        ...store,
        equipments: store.equipments.map((equipment) =>
          equipment.empresaId === companyId && equipment.id === equipmentId ? nextEquipment : equipment,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<EquipmentMutationResult>({
        action: 'inactivated',
        equipment: this.cloneEquipment(nextEquipment),
        message: 'El equipo tiene dependencias activas y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentEquipment,
      `Eliminación del equipo ${currentEquipment.nombreEquipo}.`,
      sanitizeAuditPayload(currentEquipment),
      null,
    );

    this.writeStore({
      ...store,
      equipments: store.equipments.filter(
        (equipment) => !(equipment.empresaId === companyId && equipment.id === equipmentId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<EquipmentMutationResult>({
      action: 'deleted',
      equipment: null,
      message: `El equipo ${currentEquipment.nombreEquipo} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateEquipmentStatus(
    companyId: string,
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult> {
    const store = this.readStore();
    const currentEquipment = store.equipments.find(
      (equipment) => equipment.empresaId === companyId && equipment.id === equipmentId,
    );

    if (!currentEquipment) {
      return throwError(() => new Error('No se encontró el equipo solicitado.'));
    }

    const nextEquipment: Equipment = {
      ...this.cloneEquipment(currentEquipment),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: EquipmentMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextEquipment,
      status === 'ACTIVO'
        ? `Activación del equipo ${nextEquipment.nombreEquipo}.`
        : `Inactivación del equipo ${nextEquipment.nombreEquipo}.`,
      sanitizeAuditPayload(currentEquipment),
      sanitizeAuditPayload(nextEquipment),
    );

    this.writeStore({
      ...store,
      equipments: store.equipments.map((equipment) =>
        equipment.empresaId === companyId && equipment.id === equipmentId ? nextEquipment : equipment,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<EquipmentMutationResult>({
      action,
      equipment: this.cloneEquipment(nextEquipment),
      message:
        status === 'ACTIVO'
          ? `El equipo ${nextEquipment.nombreEquipo} fue activado.`
          : `El equipo ${nextEquipment.nombreEquipo} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): EquipmentStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_EQUIPMENTS_STORE);
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeStore(structuredClone(INITIAL_EQUIPMENTS_STORE));
      return structuredClone(INITIAL_EQUIPMENTS_STORE);
    }

    try {
      const normalizedStore = normalizeEquipmentStore(JSON.parse(raw) as EquipmentStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      this.writeStore(structuredClone(INITIAL_EQUIPMENTS_STORE));
      return structuredClone(INITIAL_EQUIPMENTS_STORE);
    }
  }

  private writeStore(store: EquipmentStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: EquipmentStore,
    companyId: string,
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) return 'La empresa activa es obligatoria.';
    if (!normalizedPayload.empresaNombre) return 'No fue posible resolver el nombre de la empresa activa.';
    if (!normalizedPayload.idEquipo) return 'El ID equipo es obligatorio.';
    if (!normalizedPayload.nombreEquipo) return 'El nombre del equipo es obligatorio.';
    if (normalizedPayload.capacidad === null || normalizedPayload.capacidad === undefined || Number.isNaN(Number(normalizedPayload.capacidad))) {
      return 'La capacidad es obligatoria y debe ser numérica.';
    }
    if (!normalizedPayload.unidadCapacidad) return 'La unidad de capacidad es obligatoria.';
    if (!normalizedPayload.empresaFabricante) return 'La empresa fabricante es obligatoria.';
    if (!normalizedPayload.estado) return 'El estado es obligatorio.';
    if (normalizedPayload.diametro !== null && normalizedPayload.diametro !== undefined && normalizedPayload.diametro < 0) return 'El diámetro no puede ser negativo.';
    if (normalizedPayload.altura !== null && normalizedPayload.altura !== undefined && normalizedPayload.altura < 0) return 'La altura no puede ser negativa.';
    if (normalizedPayload.correoFabricante && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.correoFabricante)) {
      return 'El correo del fabricante no tiene un formato válido.';
    }

    const duplicatedId = store.equipments.some(
      (equipment) =>
        equipment.empresaId === companyId &&
        equipment.id !== equipmentId &&
        normalizeText(equipment.idEquipo) === normalizeText(normalizedPayload.idEquipo),
    );

    if (duplicatedId) {
      return 'Ya existe un equipo con ese ID en la empresa activa.';
    }

    return null;
  }

  private matchesFilters(equipment: Equipment, filters: Required<EquipmentFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [equipment.idEquipo, equipment.nombreEquipo, equipment.tipoEquipo ?? '', equipment.empresaFabricante, equipment.ubicacionOperativa ?? '']
        .some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || equipment.estado === filters.estado;
    const matchesType = !filters.tipoEquipo || equipment.tipoEquipo === filters.tipoEquipo;
    const matchesManufacturer =
      !filters.empresaFabricante || equipment.empresaFabricante === filters.empresaFabricante;
    const matchesLocation =
      !filters.ubicacionOperativa || equipment.ubicacionOperativa === filters.ubicacionOperativa;

    return matchesSearch && matchesStatus && matchesType && matchesManufacturer && matchesLocation;
  }

  private cloneEquipment(equipment: Equipment): Equipment {
    return {
      ...equipment,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt ?? null,
    };
  }

  private buildEquipmentId(idEquipo: string, nombreEquipo: string): string {
    const source = idEquipo || nombreEquipo;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `equipment-${slug}` : `equipment-${Date.now()}`;
  }
}

function normalizeFilters(filters: EquipmentFilters, companyId: string): Required<EquipmentFilters> {
  return {
    ...DEFAULT_EQUIPMENT_FILTERS,
    ...filters,
    empresaId: filters.empresaId ?? companyId,
    estado: filters.estado ?? 'TODOS',
    search: filters.search?.trim() ?? '',
    tipoEquipo: filters.tipoEquipo ?? null,
    empresaFabricante: filters.empresaFabricante ?? null,
    ubicacionOperativa: filters.ubicacionOperativa ?? null,
    page: filters.page ?? DEFAULT_EQUIPMENT_FILTERS.page,
    pageSize: filters.pageSize ?? DEFAULT_EQUIPMENT_FILTERS.pageSize,
  };
}

function normalizePayload(payload: SaveEquipmentPayload, companyId: string): SaveEquipmentPayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    idEquipo: payload.idEquipo.trim().toUpperCase(),
    nombreEquipo: payload.nombreEquipo.trim(),
    capacidad: Number(payload.capacidad),
    unidadCapacidad: payload.unidadCapacidad.trim(),
    diametro: payload.diametro ?? null,
    altura: payload.altura ?? null,
    empresaFabricante: payload.empresaFabricante.trim(),
    direccionFabricante: payload.direccionFabricante?.trim() || null,
    correoFabricante: payload.correoFabricante?.trim().toLowerCase() || null,
    tipoEquipo: payload.tipoEquipo?.trim() || null,
    ubicacionOperativa: payload.ubicacionOperativa?.trim() || null,
    estado: payload.estado,
  };
}

function buildAuditDraft(
  action: EquipmentAuditDraft['action'],
  equipment: Equipment,
  summary: string,
  beforePayload: Record<string, unknown> | null,
  afterPayload: Record<string, unknown> | null,
): EquipmentAuditDraft {
  return {
    module: 'equipos',
    action,
    companyId: equipment.empresaId,
    companyName: equipment.empresaNombre ?? 'Empresa activa',
    entityId: equipment.id,
    entityName: equipment.nombreEquipo,
    summary,
    occurredAt: new Date().toISOString(),
    beforePayload,
    afterPayload,
  };
}

function sanitizeAuditPayload(equipment: Equipment): Record<string, unknown> {
  return {
    id: equipment.id,
    empresaId: equipment.empresaId,
    idEquipo: equipment.idEquipo,
    nombreEquipo: equipment.nombreEquipo,
    capacidad: equipment.capacidad,
    unidadCapacidad: equipment.unidadCapacidad,
    diametro: equipment.diametro ?? null,
    altura: equipment.altura ?? null,
    empresaFabricante: equipment.empresaFabricante,
    direccionFabricante: equipment.direccionFabricante ?? null,
    correoFabricante: equipment.correoFabricante ?? null,
    tipoEquipo: equipment.tipoEquipo ?? null,
    ubicacionOperativa: equipment.ubicacionOperativa ?? null,
    estado: equipment.estado,
    dependenciasActivas: equipment.tieneDependenciasActivas,
  };
}

function normalizeEquipmentStore(store: EquipmentStore): EquipmentStore {
  return {
    equipments: (store.equipments ?? []).map((equipment) => ({
      ...equipment,
      diametro: equipment.diametro ?? null,
      altura: equipment.altura ?? null,
      direccionFabricante: equipment.direccionFabricante?.trim() || null,
      correoFabricante: equipment.correoFabricante?.trim().toLowerCase() || null,
      tipoEquipo: equipment.tipoEquipo?.trim() || null,
      ubicacionOperativa: equipment.ubicacionOperativa?.trim() || null,
      empresaNombre: equipment.empresaNombre ?? null,
      estado: equipment.estado ?? 'ACTIVO',
      tieneDependenciasActivas: equipment.tieneDependenciasActivas ?? false,
      updatedAt: equipment.updatedAt ?? null,
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
