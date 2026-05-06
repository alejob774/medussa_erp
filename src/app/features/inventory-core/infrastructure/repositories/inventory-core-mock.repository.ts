import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { InventoryBalance } from '../../domain/models/inventory-balance.model';
import { InventoryLot } from '../../domain/models/inventory-lot.model';
import { InventoryMovement } from '../../domain/models/inventory-movement.model';
import { InventoryReservation } from '../../domain/models/inventory-reservation.model';
import {
  InventoryCoreRepository,
  InventoryLotCommandPayload,
  InventoryLotFilters,
  InventoryMovementFilters,
  InventoryReleaseReservationPayload,
  InventoryReservationFilters,
  InventoryReservationPayload,
  InventoryStockCommandPayload,
  InventoryStockFilters,
  InventoryTransferPayload,
} from '../../domain/repositories/inventory-core.repository';
import {
  ensureStorageLayoutBaseline,
  updateStorageLayoutLotStock,
} from '../../../storage-layout/infrastructure/data/storage-layout-store.utils';
import {
  projectStorageLayoutLotsToInventoryLots,
  projectStorageLayoutLotsToBalances,
  readInventoryCoreStore,
  recordInventoryCoreMovement,
  upsertInventoryCoreLot,
  writeInventoryCoreStore,
} from './inventory-core-store.utils';

@Injectable({
  providedIn: 'root',
})
export class InventoryCoreMockRepository implements InventoryCoreRepository {
  getStock(
    companyId: string,
    filters: InventoryStockFilters,
  ): Observable<InventoryBalance[]> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const balances = projectStorageLayoutLotsToBalances(companyId, layoutStore.lots)
      .filter((item) => this.matchesStockFilters(item, filters));

    return of(balances).pipe(delay(120));
  }

  getMovements(
    companyId: string,
    filters: InventoryMovementFilters,
  ): Observable<InventoryMovement[]> {
    const storedMovements = readInventoryCoreStore().movements
      .filter((item) => item.empresaId === companyId)
      .filter((item) => this.matchesMovementFilters(item, filters));
    const movements = (storedMovements.length ? storedMovements : this.buildReadOnlyBaselineMovements(companyId))
      .filter((item) => this.matchesMovementFilters(item, filters))
      .sort((left, right) => Date.parse(right.fechaMovimiento) - Date.parse(left.fechaMovimiento));

    return of(movements).pipe(delay(120));
  }

  getLots(
    companyId: string,
    filters: InventoryLotFilters,
  ): Observable<InventoryLot[]> {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const balances = projectStorageLayoutLotsToBalances(companyId, layoutStore.lots);
    const lots = projectStorageLayoutLotsToInventoryLots(companyId, layoutStore.lots)
      .filter((item) => this.matchesLotFilters(item, filters, balances));

    return of(lots).pipe(delay(120));
  }

  getReservations(
    companyId: string,
    filters: InventoryReservationFilters,
  ): Observable<InventoryReservation[]> {
    const storeReservations = readInventoryCoreStore().reservations
      .filter((item) => item.empresaId === companyId);
    const reservations = (storeReservations.length ? storeReservations : this.buildReadOnlyBaselineReservations(companyId))
      .filter((item) => this.matchesReservationFilters(item, filters))
      .sort((left, right) => Date.parse(right.fechaCrea) - Date.parse(left.fechaCrea));

    return of(reservations).pipe(delay(120));
  }

  adjustStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.updateLayoutBackedStock(companyId, payload, payload.cantidad, {
      positiveType: 'AJUSTE_POS',
      negativeType: 'AJUSTE_NEG',
    });
  }

  issueStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    return this.updateLayoutBackedStock(companyId, payload, -Math.abs(payload.cantidad), {
      positiveType: 'AJUSTE_POS',
      negativeType: 'DESPACHO_VENTA',
    });
  }

  reserveStock(
    companyId: string,
    payload: InventoryReservationPayload,
  ): Observable<InventoryReservation> {
    if (payload.cantidad <= 0) {
      return throwError(() => new Error('La cantidad a reservar debe ser mayor a cero.'));
    }

    const balance = this.findBalance(companyId, payload);
    const existingReservation = this.findActiveReservation(companyId, {
      productoId: payload.productoId,
      bodegaId: payload.bodegaId,
      loteId: payload.loteId,
      origenTipo: payload.origenTipo,
      origenId: payload.origenId,
    });

    if (existingReservation && existingReservation.cantidad === Math.round(payload.cantidad)) {
      return of({ ...existingReservation }).pipe(delay(120));
    }

    if (!this.canDispatchLot(companyId, payload.loteId)) {
      return throwError(() => new Error('El lote esta bloqueado, retenido, en cuarentena o rechazado.'));
    }

    if (!balance || payload.cantidad > balance.cantidadDisponible - this.sumActiveReserved(companyId, balance)) {
      return throwError(() => new Error('Stock insuficiente para reservar.'));
    }

    const now = new Date().toISOString();
    const reservation: InventoryReservation = {
      id: `res-${companyId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      empresaId: companyId,
      productoId: payload.productoId,
      sku: payload.sku,
      bodegaId: payload.bodegaId,
      loteId: payload.loteId ?? 'SIN_LOTE',
      lote: payload.lote ?? 'SIN_LOTE',
      cantidad: Math.round(payload.cantidad),
      origenTipo: payload.origenTipo,
      origenId: payload.origenId,
      estado: 'ACTIVA',
      fechaCrea: now,
    };
    const store = readInventoryCoreStore();
    const nextBalance = {
      ...balance,
      cantidadReservada: balance.cantidadReservada + reservation.cantidad,
      fechaUltimoMovimiento: now,
    };

    writeInventoryCoreStore({
      ...store,
      reservations: [reservation, ...store.reservations.map((item) => ({ ...item }))],
      balances: [
        nextBalance,
        ...store.balances.filter((item) => item.id !== nextBalance.id).map((item) => ({ ...item })),
      ],
    });
    recordInventoryCoreMovement({
      ...this.toMovementDraft(companyId, payload, 'RESERVA_STOCK', 0),
      cantidad: reservation.cantidad,
      saldoResultante: balance.cantidadDisponible,
    });

    return of({ ...reservation }).pipe(delay(160));
  }

  releaseReservation(
    companyId: string,
    payload: InventoryReleaseReservationPayload,
  ): Observable<InventoryReservation> {
    const store = readInventoryCoreStore();
    const reservation = store.reservations.find(
      (item) => item.empresaId === companyId && item.id === payload.reservationId,
    ) ?? null;

    if (!reservation) {
      return throwError(() => new Error('No se encontro la reserva solicitada.'));
    }

    if (reservation.estado !== 'ACTIVA') {
      return throwError(() => new Error('La reserva ya no esta activa.'));
    }

    const now = new Date().toISOString();
    const released: InventoryReservation = {
      ...reservation,
      estado: payload.estadoFinal ?? 'LIBERADA',
    };
    const balance = this.findBalance(companyId, {
      productoId: reservation.productoId,
      sku: reservation.sku,
      bodegaId: reservation.bodegaId,
      ubicacionId: '',
      loteId: reservation.loteId,
    });

    writeInventoryCoreStore({
      ...store,
      reservations: store.reservations.map((item) => (item.id === released.id ? released : { ...item })),
      balances: store.balances.map((item) =>
        item.id === balance?.id
          ? {
              ...item,
              cantidadReservada: Math.max(0, item.cantidadReservada - reservation.cantidad),
              fechaUltimoMovimiento: now,
            }
          : { ...item },
      ),
    });
    if (payload.registrarMovimiento !== false) {
      recordInventoryCoreMovement({
        empresaId: companyId,
        tipoMovimiento: 'LIBERACION_RESERVA',
        documentoOrigen: payload.documentoOrigen ?? reservation.origenId,
        moduloOrigen: payload.moduloOrigen,
        productoId: reservation.productoId,
        sku: reservation.sku,
        productoNombre: reservation.sku,
        bodegaId: reservation.bodegaId,
        ubicacionId: balance?.ubicacionId ?? '',
        loteId: reservation.loteId,
        lote: reservation.lote,
        cantidad: reservation.cantidad,
        signo: 0,
        costoUnitario: balance?.costoUnitario ?? 0,
        saldoResultante: balance?.cantidadDisponible ?? 0,
        usuarioId: payload.usuarioId,
        observacion: payload.observacion ?? null,
      });
    }

    return of({ ...released }).pipe(delay(160));
  }

  blockLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    return of(this.recordLotState(companyId, payload, payload.estado ?? 'BLOQUEADO', 'BLOQUEO_CALIDAD')).pipe(delay(160));
  }

  releaseLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    if (this.resolveInventoryLotStatus(payload.loteId) === 'RECHAZADO') {
      return throwError(() => new Error('Un lote rechazado no puede liberarse.'));
    }

    return of(this.recordLotState(companyId, payload, 'LIBERADO', 'LIBERACION_CALIDAD')).pipe(delay(160));
  }

  rejectLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement> {
    return of(this.recordLotState(companyId, payload, 'RECHAZADO', 'RECHAZO_CALIDAD')).pipe(delay(160));
  }

  qualityWaste(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    if (payload.cantidad <= 0) {
      return throwError(() => new Error('La merma de calidad debe ser mayor a cero.'));
    }

    return this.updateLayoutBackedStock(companyId, payload, -Math.abs(payload.cantidad), {
      positiveType: 'AJUSTE_POS',
      negativeType: 'MERMA_CALIDAD',
    });
  }

  transferStock(
    companyId: string,
    payload: InventoryTransferPayload,
  ): Observable<InventoryMovement[]> {
    if (payload.cantidad <= 0) {
      return throwError(() => new Error('La cantidad a transferir debe ser mayor a cero.'));
    }

    const balance = this.findBalance(companyId, payload);

    if (!this.canDispatchLot(companyId, payload.loteId)) {
      return throwError(() => new Error('El lote esta bloqueado, retenido, en cuarentena o rechazado.'));
    }

    if (!balance || payload.cantidad > balance.cantidadDisponible) {
      return throwError(() => new Error('Stock insuficiente para transferir.'));
    }

    const requested = Math.round(payload.cantidad);
    const reservedByOthers = this.sumActiveReserved(companyId, balance);

    if (requested > balance.cantidadDisponible - reservedByOthers) {
      return throwError(() => new Error('Stock insuficiente o reservado por otro origen.'));
    }

    const destinationBalance = this.findTechnicalBalance(companyId, {
      productoId: payload.productoId,
      sku: payload.sku,
      bodegaId: payload.destinoBodegaId,
      ubicacionId: payload.destinoUbicacionId,
      loteId: payload.destinoLoteId ?? payload.loteId,
    });
    const destinationAvailable = Math.max(0, Math.round(destinationBalance?.cantidadDisponible ?? 0));
    const transferOut = recordInventoryCoreMovement({
      ...this.toMovementDraft(companyId, payload, 'TRANSFER_OUT', -1),
      cantidad: requested,
      saldoResultante: balance.cantidadDisponible - requested,
    });
    const transferIn = recordInventoryCoreMovement({
      ...this.toMovementDraft(companyId, payload, 'TRANSFER_IN', 1),
      bodegaId: payload.destinoBodegaId,
      ubicacionId: payload.destinoUbicacionId,
      loteId: payload.destinoLoteId ?? payload.loteId,
      lote: payload.destinoLote ?? payload.lote,
      cantidad: requested,
      saldoResultante: destinationAvailable + requested,
    });

    return of([transferOut, transferIn]).pipe(delay(180));
  }

  consumeSparePart(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement> {
    if (!payload.loteId) {
      return this.recordTechnicalStockOut(companyId, payload, 'CONSUMO_REPUESTO_TPM');
    }

    return this.updateLayoutBackedStock(companyId, payload, -Math.abs(payload.cantidad), {
      positiveType: 'AJUSTE_POS',
      negativeType: 'CONSUMO_REPUESTO_TPM',
    });
  }

  private updateLayoutBackedStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
    delta: number,
    types: { positiveType: InventoryMovement['tipoMovimiento']; negativeType: InventoryMovement['tipoMovimiento'] },
  ): Observable<InventoryMovement> {
    if (!payload.loteId) {
      return throwError(() => new Error('El movimiento mock requiere lote para mantener trazabilidad.'));
    }

    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const lot = layoutStore.lots.find((item) => item.empresaId === companyId && item.id === payload.loteId) ?? null;

    if (!lot) {
      return throwError(() => new Error('El lote no existe en el layout compartido.'));
    }

    const nextStock = lot.stockSistema + Math.round(delta);

    if (nextStock < 0) {
      return throwError(() => new Error('La politica mock no permite stock negativo.'));
    }

    const movementType = delta >= 0 ? types.positiveType : types.negativeType;

    if (
      delta < 0 &&
      (movementType === 'DESPACHO_VENTA' || movementType === 'TRANSFER_OUT') &&
      !this.canDispatchLot(companyId, lot.id)
    ) {
      return throwError(() => new Error('El lote esta bloqueado, retenido, en cuarentena o rechazado.'));
    }

    if (delta < 0 && movementType === 'DESPACHO_VENTA') {
      const balance = this.findBalance(companyId, payload);
      const requested = Math.abs(Math.round(delta));
      const reservedByOthers = balance
        ? this.sumActiveReserved(companyId, balance, {
            reservationId: payload.reservationId ?? null,
            origenTipo: payload.origenTipo ?? null,
            origenId: payload.origenId ?? null,
          })
        : 0;

      if (!balance || requested > balance.cantidadDisponible - reservedByOthers) {
        return throwError(() => new Error('Stock insuficiente o reservado por otro origen.'));
      }
    }

    updateStorageLayoutLotStock(companyId, lot.id, nextStock, {
      tipoMovimiento: movementType,
      documentoOrigen: payload.documentoOrigen ?? null,
      moduloOrigen: payload.moduloOrigen,
      usuarioId: payload.usuarioId,
      observacion: payload.observacion ?? null,
      costoUnitario: payload.costoUnitario ?? 0,
    });

    const movement = readInventoryCoreStore().movements.find(
      (item) => item.empresaId === companyId && item.loteId === lot.id,
    ) ?? null;

    if (!movement) {
      return throwError(() => new Error('No fue posible registrar el movimiento de inventario.'));
    }

    return of({ ...movement }).pipe(delay(160));
  }

  private recordTechnicalStockOut(
    companyId: string,
    payload: InventoryStockCommandPayload,
    tipoMovimiento: InventoryMovement['tipoMovimiento'],
  ): Observable<InventoryMovement> {
    if (payload.cantidad <= 0) {
      return throwError(() => new Error('La cantidad consumida debe ser mayor a cero.'));
    }

    const amount = Math.abs(Math.round(payload.cantidad));
    const balance = this.findTechnicalBalance(companyId, payload);
    const available = Math.max(0, Math.round(balance?.cantidadDisponible ?? payload.saldoDisponibleMock ?? 0));
    const shortage = amount > available;
    const movement = recordInventoryCoreMovement({
      empresaId: companyId,
      tipoMovimiento,
      documentoOrigen: payload.documentoOrigen ?? null,
      moduloOrigen: payload.moduloOrigen,
      productoId: payload.productoId,
      sku: payload.sku,
      productoNombre: payload.productoNombre,
      bodegaId: payload.bodegaId,
      ubicacionId: payload.ubicacionId,
      loteId: payload.loteId,
      lote: payload.lote,
      cantidad: amount,
      signo: -1,
      costoUnitario: payload.costoUnitario ?? balance?.costoUnitario ?? 0,
      saldoResultante: Math.max(0, available - amount),
      usuarioId: payload.usuarioId,
      observacion: [
        payload.observacion?.trim() || null,
        shortage ? `Consumo mock excede saldo tecnico disponible (${available}).` : null,
      ].filter(Boolean).join(' | ') || null,
    });

    return of({ ...movement }).pipe(delay(160));
  }

  private recordLotState(
    companyId: string,
    payload: InventoryLotCommandPayload,
    estado: InventoryLot['estado'],
    tipoMovimiento: InventoryMovement['tipoMovimiento'],
  ): InventoryMovement {
    const balance = this.findBalance(companyId, payload);
    const lot: InventoryLot = {
      id: payload.loteId,
      empresaId: companyId,
      productoId: payload.productoId,
      sku: payload.sku,
      numeroLote: payload.lote,
      fechaFabricacion: null,
      fechaVencimiento: null,
      estado,
      proveedorId: null,
      ordenProduccionId: null,
    };

    upsertInventoryCoreLot(lot);

    return recordInventoryCoreMovement({
      empresaId: companyId,
      tipoMovimiento,
      documentoOrigen: payload.documentoOrigen ?? null,
      moduloOrigen: payload.moduloOrigen,
      productoId: payload.productoId,
      sku: payload.sku,
      productoNombre: payload.productoNombre,
      bodegaId: payload.bodegaId,
      ubicacionId: payload.ubicacionId,
      loteId: payload.loteId,
      lote: payload.lote,
      cantidad: 0,
      signo: 0,
      costoUnitario: balance?.costoUnitario ?? 0,
      saldoResultante: balance?.cantidadDisponible ?? 0,
      usuarioId: payload.usuarioId,
      observacion: payload.observacion ?? null,
    });
  }

  private findBalance(
    companyId: string,
    payload: Pick<
      InventoryStockCommandPayload,
      'productoId' | 'sku' | 'bodegaId' | 'ubicacionId' | 'loteId'
    >,
  ): InventoryBalance | null {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    return (
      projectStorageLayoutLotsToBalances(companyId, layoutStore.lots).find(
        (item) =>
          item.empresaId === companyId &&
          item.productoId === payload.productoId &&
          item.sku === payload.sku &&
          item.bodegaId === payload.bodegaId &&
          (!payload.ubicacionId || item.ubicacionId === payload.ubicacionId) &&
          item.loteId === payload.loteId,
      ) ?? null
    );
  }

  private findTechnicalBalance(
    companyId: string,
    payload: Pick<InventoryStockCommandPayload, 'productoId' | 'sku' | 'bodegaId' | 'ubicacionId' | 'loteId'>,
  ): InventoryBalance | null {
    const balanceId = `${companyId}|${payload.productoId}|${payload.bodegaId}|${payload.ubicacionId}|${payload.loteId ?? 'SIN_LOTE'}`;

    return readInventoryCoreStore().balances.find((item) => item.id === balanceId) ?? null;
  }

  private findActiveReservation(
    companyId: string,
    filters: {
      productoId: string;
      bodegaId: string;
      loteId: string | null;
      origenTipo?: string | null;
      origenId?: string | null;
    },
  ): InventoryReservation | null {
    return readInventoryCoreStore().reservations.find(
      (item) =>
        item.empresaId === companyId &&
        item.estado === 'ACTIVA' &&
        item.productoId === filters.productoId &&
        item.bodegaId === filters.bodegaId &&
        item.loteId === (filters.loteId ?? 'SIN_LOTE') &&
        (!filters.origenTipo || item.origenTipo === filters.origenTipo) &&
        (!filters.origenId || item.origenId === filters.origenId),
    ) ?? null;
  }

  private sumActiveReserved(
    companyId: string,
    balance: InventoryBalance,
    exclude?: { reservationId?: string | null; origenTipo?: string | null; origenId?: string | null },
  ): number {
    return readInventoryCoreStore().reservations
      .filter((item) => item.empresaId === companyId && item.estado === 'ACTIVA')
      .filter((item) => item.productoId === balance.productoId && item.bodegaId === balance.bodegaId)
      .filter((item) => item.loteId === (balance.loteId ?? 'SIN_LOTE'))
      .filter((item) => item.id !== exclude?.reservationId)
      .filter((item) => !(exclude?.origenTipo && item.origenTipo === exclude.origenTipo && item.origenId === exclude.origenId))
      .reduce((sum, item) => sum + item.cantidad, 0);
  }

  private canDispatchLot(companyId: string, lotId: string | null): boolean {
    if (!lotId) {
      return true;
    }

    const status = this.resolveInventoryLotStatus(lotId);

    if (status) {
      return status === 'LIBERADO';
    }

    const layoutLot = ensureStorageLayoutBaseline(companyId).lots.find((item) => item.id === lotId) ?? null;
    return layoutLot?.estado === 'ACTIVO' || layoutLot?.estado === 'PROXIMO_VENCER';
  }

  private resolveInventoryLotStatus(lotId: string | null): InventoryLot['estado'] | null {
    if (!lotId) {
      return null;
    }

    return readInventoryCoreStore().lots.find((item) => item.id === lotId)?.estado ?? null;
  }

  private toMovementDraft(
    companyId: string,
    payload: InventoryStockCommandPayload,
    tipoMovimiento: InventoryMovement['tipoMovimiento'],
    signo: InventoryMovement['signo'],
  ) {
    const balance = this.findBalance(companyId, payload);

    return {
      empresaId: companyId,
      tipoMovimiento,
      documentoOrigen: payload.documentoOrigen ?? null,
      moduloOrigen: payload.moduloOrigen,
      productoId: payload.productoId,
      sku: payload.sku,
      productoNombre: payload.productoNombre,
      bodegaId: payload.bodegaId,
      ubicacionId: payload.ubicacionId,
      loteId: payload.loteId,
      lote: payload.lote,
      cantidad: Math.abs(Math.round(payload.cantidad)),
      signo,
      costoUnitario: payload.costoUnitario ?? balance?.costoUnitario ?? 0,
      saldoResultante: balance?.cantidadDisponible ?? 0,
      usuarioId: payload.usuarioId,
      observacion: payload.observacion ?? null,
    };
  }

  private matchesStockFilters(balance: InventoryBalance, filters: InventoryStockFilters): boolean {
    return (
      (!filters.productoId || balance.productoId === filters.productoId) &&
      (!filters.sku || balance.sku === filters.sku) &&
      (!filters.bodegaId || balance.bodegaId === filters.bodegaId) &&
      (!filters.ubicacionId || balance.ubicacionId === filters.ubicacionId) &&
      (!filters.loteId || balance.loteId === filters.loteId)
    );
  }

  private matchesMovementFilters(movement: InventoryMovement, filters: InventoryMovementFilters): boolean {
    return (
      (!filters.productoId || movement.productoId === filters.productoId) &&
      (!filters.sku || movement.sku === filters.sku) &&
      (!filters.bodegaId || movement.bodegaId === filters.bodegaId) &&
      (!filters.ubicacionId || movement.ubicacionId === filters.ubicacionId) &&
      (!filters.loteId || movement.loteId === filters.loteId) &&
      (!filters.tipoMovimiento ||
        filters.tipoMovimiento === 'TODOS' ||
        movement.tipoMovimiento === filters.tipoMovimiento) &&
      (!filters.fechaDesde || movement.fechaMovimiento.slice(0, 10) >= filters.fechaDesde) &&
      (!filters.fechaHasta || movement.fechaMovimiento.slice(0, 10) <= filters.fechaHasta)
    );
  }

  private matchesLotFilters(
    lot: InventoryLot,
    filters: InventoryLotFilters,
    balances: InventoryBalance[],
  ): boolean {
    const relatedBalances = balances.filter((item) => item.loteId === lot.id);

    return (
      (!filters.productoId || lot.productoId === filters.productoId) &&
      (!filters.sku || lot.sku === filters.sku) &&
      (!filters.loteId || lot.id === filters.loteId || lot.numeroLote === filters.loteId) &&
      (!filters.estado || filters.estado === 'TODOS' || lot.estado === filters.estado) &&
      (!filters.bodegaId || relatedBalances.some((item) => item.bodegaId === filters.bodegaId)) &&
      (!filters.ubicacionId || relatedBalances.some((item) => item.ubicacionId === filters.ubicacionId))
    );
  }

  private matchesReservationFilters(
    reservation: InventoryReservation,
    filters: InventoryReservationFilters,
  ): boolean {
    return (
      (!filters.productoId || reservation.productoId === filters.productoId) &&
      (!filters.sku || reservation.sku === filters.sku) &&
      (!filters.bodegaId || reservation.bodegaId === filters.bodegaId) &&
      (!filters.loteId || reservation.loteId === filters.loteId || reservation.lote === filters.loteId) &&
      (!filters.estado || filters.estado === 'TODOS' || reservation.estado === filters.estado)
    );
  }

  private buildReadOnlyBaselineMovements(companyId: string): InventoryMovement[] {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const balances = projectStorageLayoutLotsToBalances(companyId, layoutStore.lots).slice(0, 8);
    const movementTypes: InventoryMovement['tipoMovimiento'][] = [
      'INGRESO_PT',
      'COMPRA_RECEPCION',
      'TRANSFER_IN',
      'RESERVA_STOCK',
      'DESPACHO_VENTA',
      'BLOQUEO_CALIDAD',
      'LIBERACION_CALIDAD',
      'AJUSTE_POS',
    ];

    return balances.map((balance, index) => {
      const quantity = Math.max(1, Math.round(balance.cantidadDisponible * (index % 3 === 0 ? 0.12 : 0.08)));
      const unitCost = this.resolveBaselineUnitCost(balance.sku);

      return {
        id: `mov-readonly-${companyId}-${index + 1}`,
        empresaId: companyId,
        fechaMovimiento: `2026-05-${String(Math.max(1, 5 - Math.floor(index / 2))).padStart(2, '0')}T${String(8 + index).padStart(2, '0')}:20:00-05:00`,
        tipoMovimiento: movementTypes[index % movementTypes.length],
        documentoOrigen: `DOC-INV-${String(2400 + index).padStart(4, '0')}`,
        moduloOrigen: index % 2 === 0 ? 'INVENTORY_CORE' : 'LAYOUT_ALMACENAMIENTO',
        productoId: balance.productoId,
        sku: balance.sku,
        productoNombre: balance.sku,
        bodegaId: balance.bodegaId,
        ubicacionId: balance.ubicacionId,
        loteId: balance.loteId,
        lote: balance.lote,
        cantidad: quantity,
        signo: index % 4 === 3 ? -1 : index % 4 === 2 ? 0 : 1,
        costoUnitario: unitCost,
        costoTotal: quantity * unitCost,
        saldoResultante: balance.cantidadDisponible,
        usuarioId: 'mock.inventory-core',
        observacion: 'Movimiento tecnico mock para visor interno de Inventario Central.',
      };
    });
  }

  private buildReadOnlyBaselineReservations(companyId: string): InventoryReservation[] {
    const layoutStore = ensureStorageLayoutBaseline(companyId);
    const balances = projectStorageLayoutLotsToBalances(companyId, layoutStore.lots)
      .filter((item) => item.cantidadDisponible > 0)
      .slice(0, 4);
    const statuses: InventoryReservation['estado'][] = ['ACTIVA', 'ACTIVA', 'CONSUMIDA', 'LIBERADA'];

    return balances.map((balance, index) => ({
      id: `res-readonly-${companyId}-${index + 1}`,
      empresaId: companyId,
      productoId: balance.productoId,
      sku: balance.sku,
      bodegaId: balance.bodegaId,
      loteId: balance.loteId ?? 'SIN_LOTE',
      lote: balance.lote ?? 'SIN_LOTE',
      cantidad: Math.max(1, Math.round(balance.cantidadDisponible * (index === 0 ? 0.08 : 0.04))),
      origenTipo: index % 2 === 0 ? 'PEDIDO_VENTA' : 'MPS',
      origenId: index % 2 === 0 ? `PV-ARB-${1200 + index}` : `MPS-ARB-${340 + index}`,
      estado: statuses[index % statuses.length],
      fechaCrea: `2026-05-${String(3 + index).padStart(2, '0')}T09:${String(10 + index).padStart(2, '0')}:00-05:00`,
    }));
  }

  private resolveBaselineUnitCost(sku: string): number {
    if (sku.includes('UHT')) {
      return 1800;
    }

    if (sku.includes('YOG')) {
      return 920;
    }

    if (sku.includes('QUE')) {
      return 4800;
    }

    if (sku.includes('EMP')) {
      return 110;
    }

    return 1500;
  }
}
