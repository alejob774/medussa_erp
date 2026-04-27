import { Observable } from 'rxjs';
import { InventoryBalance } from '../models/inventory-balance.model';
import { InventoryLotStatus } from '../models/inventory-lot.model';
import { InventoryMovement, InventoryMovementType } from '../models/inventory-movement.model';
import { InventoryReservation } from '../models/inventory-reservation.model';

export interface InventoryStockFilters {
  productoId?: string | null;
  sku?: string | null;
  bodegaId?: string | null;
  ubicacionId?: string | null;
  loteId?: string | null;
}

export interface InventoryMovementFilters extends InventoryStockFilters {
  tipoMovimiento?: InventoryMovementType | 'TODOS' | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export interface InventoryStockCommandPayload {
  productoId: string;
  sku: string;
  productoNombre: string;
  bodegaId: string;
  ubicacionId: string;
  loteId: string | null;
  lote: string | null;
  cantidad: number;
  costoUnitario?: number | null;
  saldoDisponibleMock?: number | null;
  reservationId?: string | null;
  origenTipo?: string | null;
  origenId?: string | null;
  documentoOrigen?: string | null;
  moduloOrigen: string;
  usuarioId: string;
  observacion?: string | null;
}

export interface InventoryReservationPayload extends InventoryStockCommandPayload {
  origenTipo: string;
  origenId: string;
}

export interface InventoryReleaseReservationPayload {
  reservationId: string;
  usuarioId: string;
  documentoOrigen?: string | null;
  moduloOrigen: string;
  estadoFinal?: 'LIBERADA' | 'CONSUMIDA' | 'CANCELADA';
  registrarMovimiento?: boolean;
  observacion?: string | null;
}

export interface InventoryLotCommandPayload {
  productoId: string;
  sku: string;
  productoNombre: string;
  bodegaId: string;
  ubicacionId: string;
  loteId: string;
  lote: string;
  estado?: InventoryLotStatus;
  documentoOrigen?: string | null;
  moduloOrigen: string;
  usuarioId: string;
  observacion?: string | null;
}

export interface InventoryTransferPayload extends InventoryStockCommandPayload {
  destinoBodegaId: string;
  destinoUbicacionId: string;
  destinoLoteId?: string | null;
  destinoLote?: string | null;
}

export abstract class InventoryCoreRepository {
  abstract getStock(
    companyId: string,
    filters: InventoryStockFilters,
  ): Observable<InventoryBalance[]>;

  abstract getMovements(
    companyId: string,
    filters: InventoryMovementFilters,
  ): Observable<InventoryMovement[]>;

  abstract adjustStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement>;

  abstract issueStock(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement>;

  abstract reserveStock(
    companyId: string,
    payload: InventoryReservationPayload,
  ): Observable<InventoryReservation>;

  abstract releaseReservation(
    companyId: string,
    payload: InventoryReleaseReservationPayload,
  ): Observable<InventoryReservation>;

  abstract blockLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement>;

  abstract releaseLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement>;

  abstract rejectLot(
    companyId: string,
    payload: InventoryLotCommandPayload,
  ): Observable<InventoryMovement>;

  abstract qualityWaste(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement>;

  abstract transferStock(
    companyId: string,
    payload: InventoryTransferPayload,
  ): Observable<InventoryMovement[]>;

  abstract consumeSparePart(
    companyId: string,
    payload: InventoryStockCommandPayload,
  ): Observable<InventoryMovement>;
}
