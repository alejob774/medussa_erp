import { InventoryMovementSign, InventoryMovementType } from '../../../inventory-core/domain/models/inventory-movement.model';
import { CostingMethod } from './product-cost.model';

export interface CostMovement {
  id: string;
  empresaId: string;
  inventoryMovementId: string;
  productoId: string;
  sku: string;
  productoNombre: string;
  cantidad: number;
  signo: InventoryMovementSign;
  costoUnitario: number;
  costoTotal: number;
  tipoOrigen: InventoryMovementType;
  moduloOrigen: string;
  documentoOrigen: string | null;
  metodoCosto: CostingMethod;
  fecha: string;
}

export interface CostMovementFilters {
  productoId?: string | null;
  sku?: string | null;
  tipoOrigen?: InventoryMovementType | 'TODOS' | null;
  moduloOrigen?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}
