import { Injectable, inject } from '@angular/core';
import { delay, map, Observable, of, throwError } from 'rxjs';
import {
  SaveStorageAssignmentPayload,
  SaveStorageLocationPayload,
  SaveWarehousePayload,
  StorageLayoutRepository,
  TransferStorageLayoutStockPayload,
} from '../../domain/repositories/storage-layout.repository';
import { DEFAULT_STORAGE_LAYOUT_FILTERS, StorageLayoutFilters } from '../../domain/models/storage-layout-filters.model';
import {
  StorageLayoutDashboard,
  StorageLayoutLot,
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
import { InventoryCoreMockRepository } from '../../../inventory-core/infrastructure/repositories/inventory-core-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class StorageLayoutMockRepository implements StorageLayoutRepository {
  private readonly inventoryCore = inject(InventoryCoreMockRepository);

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

  transferStock(
    companyId: string,
    payload: TransferStorageLayoutStockPayload,
  ): Observable<StorageLayoutMutationResult> {
    const store = ensureStorageLayoutBaseline(companyId);
    const sourceLot = store.lots.find((item) => item.empresaId === companyId && item.id === payload.loteId) ?? null;
    const destinationLocation = store.locations.find(
      (item) =>
        item.empresaId === companyId &&
        item.id === payload.destinoUbicacionId &&
        item.bodegaId === payload.destinoBodegaId,
    ) ?? null;

    if (!sourceLot) {
      return throwError(() => new Error('El lote origen no existe en el layout operativo.'));
    }

    if (!destinationLocation) {
      return throwError(() => new Error('La ubicacion destino no existe en la bodega seleccionada.'));
    }

    if (payload.cantidad <= 0) {
      return throwError(() => new Error('La cantidad a transferir debe ser mayor a cero.'));
    }

    const quantity = Math.round(payload.cantidad);

    if (quantity > sourceLot.stockSistema) {
      return throwError(() => new Error('Stock insuficiente para reubicar desde layout.'));
    }

    const sourceLocation = store.locations.find((item) => item.id === sourceLot.ubicacionId) ?? null;
    const destinationLot =
      store.lots.find(
        (item) =>
          item.empresaId === companyId &&
          item.ubicacionId === payload.destinoUbicacionId &&
          item.skuId === sourceLot.skuId &&
          item.lote === sourceLot.lote,
      ) ?? null;
    const isFullMove = quantity >= sourceLot.stockSistema;
    const destinationLotId = destinationLot?.id ?? (isFullMove ? sourceLot.id : `${sourceLot.id}-split-${slugify(payload.destinoUbicacionId)}`);
    const documentId = `relocation-${sourceLocation?.codigo ?? sourceLot.ubicacionId}-${destinationLocation.codigo}`;

    return this.inventoryCore.transferStock(companyId, {
      productoId: sourceLot.skuId,
      sku: sourceLot.sku,
      productoNombre: sourceLot.productoNombre,
      bodegaId: sourceLot.bodegaId,
      ubicacionId: sourceLot.ubicacionId,
      loteId: sourceLot.id,
      lote: sourceLot.lote,
      destinoBodegaId: payload.destinoBodegaId,
      destinoUbicacionId: payload.destinoUbicacionId,
      destinoLoteId: destinationLotId,
      destinoLote: sourceLot.lote,
      cantidad: quantity,
      costoUnitario: 0,
      documentoOrigen: documentId,
      moduloOrigen: 'STORAGE_LAYOUT',
      usuarioId: payload.usuario,
      observacion:
        payload.observacion?.trim() ||
        `Reubicacion desde ${sourceLocation?.codigo ?? sourceLot.ubicacionId} hacia ${destinationLocation.codigo}.`,
    }).pipe(
      map(() => {
        const updated = this.applyProjectedTransfer(companyId, sourceLot, destinationLocation.id, destinationLotId, quantity);
        const auditDraft = buildStorageLayoutAuditDraft(
          'stock-transfer',
          companyId,
          destinationLotId,
          sourceLot.lote,
          `Lote ${sourceLot.lote} reubicado hacia ${destinationLocation.codigo}.`,
          {
            loteId: sourceLot.id,
            ubicacionId: sourceLot.ubicacionId,
            stockSistema: sourceLot.stockSistema,
          },
          {
            loteId: destinationLotId,
            ubicacionId: destinationLocation.id,
            cantidad: quantity,
          },
        );
        const recalculated = recalculateStorageLayoutCompany(updated, companyId);

        writeStorageLayoutStore({
          ...recalculated,
          auditTrail: [auditDraft, ...recalculated.auditTrail],
        });

        return {
          action: 'stock-transferred',
          warehouse: null,
          location: { ...destinationLocation },
          assignment: null,
          message: 'Transferencia de stock registrada en Inventory Core y proyectada en layout.',
          auditDraft,
        } satisfies StorageLayoutMutationResult;
      }),
      delay(220),
    );
  }

  private applyProjectedTransfer(
    companyId: string,
    sourceLot: StorageLayoutLot,
    destinationLocationId: string,
    destinationLotId: string,
    quantity: number,
  ): StorageLayoutStore {
    const store = ensureStorageLayoutBaseline(companyId);
    const destinationLot =
      store.lots.find(
        (item) =>
          item.empresaId === companyId &&
          item.id === destinationLotId,
      ) ?? null;
    const destinationLocation = store.locations.find((item) => item.id === destinationLocationId) ?? null;
    const isSameLotMove = destinationLotId === sourceLot.id;
    const nextLots = store.lots
      .map((lot) => {
        if (lot.empresaId !== companyId) {
          return { ...lot };
        }

        if (isSameLotMove && lot.id === sourceLot.id) {
          return {
            ...lot,
            bodegaId: destinationLocation?.bodegaId ?? sourceLot.bodegaId,
            ubicacionId: destinationLocationId,
            stockSistema: quantity,
          };
        }

        if (lot.id === sourceLot.id) {
          const nextSourceStock = Math.max(0, lot.stockSistema - quantity);

          return nextSourceStock > 0
            ? {
                ...lot,
                stockSistema: nextSourceStock,
              }
            : null;
        }

        if (destinationLot && lot.id === destinationLot.id) {
          return {
            ...lot,
            stockSistema: lot.stockSistema + quantity,
          };
        }

        return { ...lot };
      })
      .filter((item): item is StorageLayoutLot => !!item);

    if (!destinationLot && !isSameLotMove) {
      nextLots.push({
        ...sourceLot,
        id: destinationLotId,
        ubicacionId: destinationLocationId,
        bodegaId: destinationLocation?.bodegaId ?? sourceLot.bodegaId,
        stockSistema: quantity,
        fechaIngreso: new Date().toISOString().slice(0, 10),
      });
    }

    return {
      ...store,
      lots: nextLots,
    };
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
