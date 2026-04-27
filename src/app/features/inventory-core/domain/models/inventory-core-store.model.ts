import { InventoryBalance } from './inventory-balance.model';
import { InventoryLot } from './inventory-lot.model';
import { InventoryMovement } from './inventory-movement.model';
import { InventoryReservation } from './inventory-reservation.model';

export interface InventoryCoreStore {
  movements: InventoryMovement[];
  balances: InventoryBalance[];
  lots: InventoryLot[];
  reservations: InventoryReservation[];
}

export const EMPTY_INVENTORY_CORE_STORE: InventoryCoreStore = {
  movements: [],
  balances: [],
  lots: [],
  reservations: [],
};
