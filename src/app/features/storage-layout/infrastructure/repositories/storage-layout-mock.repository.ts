import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  SaveStorageAssignmentPayload,
  SaveStorageLocationPayload,
  SaveWarehousePayload,
  StorageLayoutRepository,
} from '../../domain/repositories/storage-layout.repository';
import { DEFAULT_STORAGE_LAYOUT_FILTERS, StorageLayoutFilters } from '../../domain/models/storage-layout-filters.model';
import {
  StorageLayoutDashboard,
  StorageLayoutMutationResult,
  StorageLayoutStore,
} from '../../domain/models/storage-layout-response.model';
import {
  buildStorageLayoutAuditDraft,
  buildStorageLayoutDashboard,
  ensureStorageLayoutBaseline,
  readStorageLayoutStore,
  recalculateStorageLayoutCompany,
  writeStorageLayoutStore,
} from '../data/storage-layout-store.utils';

@Injectable({
  providedIn: 'root',
})
export class StorageLayoutMockRepository implements StorageLayoutRepository {
  getDashboard(
    companyId: string,
    filters: StorageLayoutFilters,
  ): Observable<StorageLayoutDashboard> {
    const normalizedFilters = {
      ...DEFAULT_STORAGE_LAYOUT_FILTERS,
      ...filters,
      bodegaId: filters.bodegaId ?? null,
      zona: filters.zona ?? null,
      tipoAlmacenamiento: filters.tipoAlmacenamiento ?? null,
      restriccionSanitaria: filters.restriccionSanitaria ?? null,
      ocupacion: filters.ocupacion ?? 'TODAS',
      sku: filters.sku ?? null,
      categoriaABC: filters.categoriaABC ?? 'TODAS',
    } satisfies StorageLayoutFilters;
    const store = ensureStorageLayoutBaseline(companyId);

    return of(buildStorageLayoutDashboard(store, companyId, normalizedFilters)).pipe(delay(180));
  }

  saveWarehouse(
    companyId: string,
    payload: SaveWarehousePayload,
    warehouseId?: string,
  ): Observable<StorageLayoutMutationResult> {
    const store = ensureStorageLayoutBaseline(companyId);
    const currentWarehouse =
      store.warehouses.find((item) => item.empresaId === companyId && item.id === warehouseId) ?? null;
    const normalizedCode = payload.codigo.trim().toUpperCase();
    const normalizedName = payload.nombre.trim();

    if (!normalizedCode || !normalizedName) {
      return throwError(() => new Error('Codigo y nombre de bodega son obligatorios.'));
    }

    const duplicatedCode = store.warehouses.some(
      (item) =>
        item.empresaId === companyId &&
        item.id !== warehouseId &&
        item.codigo.trim().toUpperCase() === normalizedCode,
    );

    if (duplicatedCode) {
      return throwError(() => new Error('Ya existe una bodega con ese codigo en la empresa activa.'));
    }

    const nextWarehouse = {
      id: currentWarehouse?.id ?? `warehouse-${companyId}-${normalizedCode.toLowerCase()}`,
      empresaId: companyId,
      codigo: normalizedCode,
      nombre: normalizedName,
      tipo: payload.tipo,
      estado: payload.estado,
    };
    const beforePayload = currentWarehouse ? { ...currentWarehouse } : null;
    const nextStore: StorageLayoutStore = {
      ...store,
      warehouses: currentWarehouse
        ? store.warehouses.map((item) =>
            item.id === currentWarehouse.id ? nextWarehouse : { ...item },
          )
        : [nextWarehouse, ...store.warehouses.map((item) => ({ ...item }))],
    };
    const recalculated = recalculateStorageLayoutCompany(nextStore, companyId);
    const auditDraft = buildStorageLayoutAuditDraft(
      currentWarehouse ? 'warehouse-edit' : 'warehouse-create',
      companyId,
      nextWarehouse.id,
      nextWarehouse.nombre,
      currentWarehouse
        ? `Bodega ${nextWarehouse.nombre} actualizada.`
        : `Bodega ${nextWarehouse.nombre} creada.`,
      beforePayload,
      { ...nextWarehouse },
    );

    writeStorageLayoutStore({
      ...recalculated,
      auditTrail: [auditDraft, ...recalculated.auditTrail],
    });

    return of<StorageLayoutMutationResult>({
      action: currentWarehouse ? 'warehouse-updated' : 'warehouse-created',
      warehouse: { ...nextWarehouse },
      location: null,
      assignment: null,
      message: currentWarehouse
        ? 'Bodega actualizada correctamente.'
        : 'Bodega creada correctamente en localStorage.',
      auditDraft,
    }).pipe(delay(220));
  }

  saveLocation(
    companyId: string,
    payload: SaveStorageLocationPayload,
    locationId?: string,
  ): Observable<StorageLayoutMutationResult> {
    const store = ensureStorageLayoutBaseline(companyId);
    const currentLocation =
      store.locations.find((item) => item.empresaId === companyId && item.id === locationId) ?? null;
    const warehouse = store.warehouses.find(
      (item) => item.empresaId === companyId && item.id === payload.bodegaId,
    );

    if (!warehouse) {
      return throwError(() => new Error('Debes seleccionar una bodega valida.'));
    }

    if (payload.capacidad < 0) {
      return throwError(() => new Error('La capacidad no puede ser negativa.'));
    }

    const logicalKey = [
      payload.bodegaId,
      payload.zona.trim().toUpperCase(),
      payload.pasillo.trim().toUpperCase(),
      payload.rack.trim().toUpperCase(),
      payload.nivel.trim().toUpperCase(),
      payload.posicion.trim().toUpperCase(),
    ].join('|');
    const duplicatedLocation = store.locations.some((item) => {
      const itemKey = [
        item.bodegaId,
        item.zona.trim().toUpperCase(),
        item.pasillo.trim().toUpperCase(),
        item.rack.trim().toUpperCase(),
        item.nivel.trim().toUpperCase(),
        item.posicion.trim().toUpperCase(),
      ].join('|');

      return item.empresaId === companyId && item.id !== locationId && itemKey === logicalKey;
    });

    if (duplicatedLocation) {
      return throwError(() => new Error('Ya existe una ubicacion logicamente igual en esa bodega.'));
    }

    const locationCode = `${warehouse.codigo}-${payload.zona.trim().slice(0, 3).toUpperCase()}-${payload.pasillo
      .trim()
      .toUpperCase()}-${payload.nivel.trim().toUpperCase()}-${payload.posicion.trim().toUpperCase()}`;
    const nextLocation = {
      id: currentLocation?.id ?? `location-${companyId}-${slugify(locationCode)}`,
      empresaId: companyId,
      bodegaId: warehouse.id,
      codigo: currentLocation?.codigo ?? locationCode,
      zona: payload.zona.trim(),
      pasillo: payload.pasillo.trim().toUpperCase(),
      rack: payload.rack.trim().toUpperCase(),
      nivel: payload.nivel.trim().toUpperCase(),
      posicion: payload.posicion.trim().toUpperCase(),
      capacidad: Math.round(payload.capacidad),
      tipoAlmacenamiento: payload.tipoAlmacenamiento,
      restriccionSanitaria: payload.restriccionSanitaria,
      estado: payload.estado,
    };
    const beforePayload = currentLocation ? { ...currentLocation } : null;
    const nextStore: StorageLayoutStore = {
      ...store,
      locations: currentLocation
        ? store.locations.map((item) =>
            item.id === currentLocation.id ? nextLocation : { ...item },
          )
        : [nextLocation, ...store.locations.map((item) => ({ ...item }))],
    };
    const recalculated = recalculateStorageLayoutCompany(nextStore, companyId);
    const auditDraft = buildStorageLayoutAuditDraft(
      currentLocation ? 'location-edit' : 'location-create',
      companyId,
      nextLocation.id,
      nextLocation.codigo,
      currentLocation
        ? `Ubicacion ${nextLocation.codigo} actualizada.`
        : `Ubicacion ${nextLocation.codigo} creada.`,
      beforePayload,
      { ...nextLocation },
    );

    writeStorageLayoutStore({
      ...recalculated,
      auditTrail: [auditDraft, ...recalculated.auditTrail],
    });

    return of<StorageLayoutMutationResult>({
      action: currentLocation ? 'location-updated' : 'location-created',
      warehouse: null,
      location: { ...nextLocation },
      assignment: null,
      message: currentLocation
        ? 'Ubicacion actualizada correctamente.'
        : 'Ubicacion creada correctamente en localStorage.',
      auditDraft,
    }).pipe(delay(220));
  }

  saveAssignment(
    companyId: string,
    payload: SaveStorageAssignmentPayload,
    assignmentId?: string,
  ): Observable<StorageLayoutMutationResult> {
    const store = ensureStorageLayoutBaseline(companyId);
    const currentAssignment =
      store.assignments.find((item) => item.empresaId === companyId && item.id === assignmentId) ?? null;
    const location = store.locations.find(
      (item) => item.empresaId === companyId && item.id === payload.ubicacionId,
    );

    if (!location) {
      return throwError(() => new Error('La ubicacion seleccionada no existe.'));
    }

    const duplicate = store.assignments.some(
      (item) =>
        item.empresaId === companyId &&
        item.id !== assignmentId &&
        item.ubicacionId === payload.ubicacionId &&
        item.skuId === payload.skuId,
    );

    if (duplicate) {
      return throwError(() => new Error('Ese SKU ya esta asignado a la ubicacion seleccionada.'));
    }

    const nextAssignment = {
      id: currentAssignment?.id ?? `assignment-${companyId}-${payload.ubicacionId}-${payload.skuId}`,
      empresaId: companyId,
      ubicacionId: payload.ubicacionId,
      skuId: payload.skuId,
      sku: payload.sku.trim().toUpperCase(),
      productoNombre: payload.productoNombre.trim(),
      prioridad: payload.prioridad,
      categoriaABC: payload.categoriaABC,
      rotacion: payload.rotacion,
      fechaAsignacion: currentAssignment?.fechaAsignacion ?? new Date().toISOString(),
    };
    const beforePayload = currentAssignment ? { ...currentAssignment } : null;
    const nextStore: StorageLayoutStore = {
      ...store,
      assignments: currentAssignment
        ? store.assignments.map((item) =>
            item.id === currentAssignment.id ? nextAssignment : { ...item },
          )
        : [nextAssignment, ...store.assignments.map((item) => ({ ...item }))],
    };
    const recalculated = recalculateStorageLayoutCompany(nextStore, companyId);
    const auditDraft = buildStorageLayoutAuditDraft(
      currentAssignment ? 'assignment-edit' : 'assignment-create',
      companyId,
      nextAssignment.id,
      nextAssignment.productoNombre,
      currentAssignment
        ? `Asignacion de ${nextAssignment.sku} actualizada.`
        : `Asignacion de ${nextAssignment.sku} creada para ${location.codigo}.`,
      beforePayload,
      { ...nextAssignment },
    );

    writeStorageLayoutStore({
      ...recalculated,
      auditTrail: [auditDraft, ...recalculated.auditTrail],
    });

    return of<StorageLayoutMutationResult>({
      action: currentAssignment ? 'assignment-updated' : 'assignment-created',
      warehouse: null,
      location: null,
      assignment: { ...nextAssignment },
      message: currentAssignment
        ? 'Asignacion SKU actualizada correctamente.'
        : 'Asignacion SKU creada correctamente.',
      auditDraft,
    }).pipe(delay(220));
  }

  recalculateOccupancy(
    companyId: string,
    usuario: string,
  ): Observable<StorageLayoutMutationResult> {
    const store = ensureStorageLayoutBaseline(companyId);
    const recalculated = recalculateStorageLayoutCompany(readStorageLayoutStore(), companyId);
    const auditDraft = buildStorageLayoutAuditDraft(
      'recalculate',
      companyId,
      `layout-recalculate-${companyId}`,
      'Recalculo de ocupacion',
      `Ocupacion y alertas recalculadas por ${usuario}.`,
      null,
      {
        occupancies: recalculated.occupancies.filter((item) => item.empresaId === companyId).length,
        alerts: recalculated.alerts.filter((item) => item.empresaId === companyId).length,
      },
    );

    writeStorageLayoutStore({
      ...recalculated,
      auditTrail: [auditDraft, ...recalculated.auditTrail],
    });

    return of<StorageLayoutMutationResult>({
      action: 'occupancy-recalculated',
      warehouse: null,
      location: null,
      assignment: null,
      message: 'Ocupacion y alertas recalculadas correctamente.',
      auditDraft,
    }).pipe(delay(200));
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
