import { InventoryCycleAlertSeverity } from './inventory-cycle-alert.model';
import { InventoryCycleCountStatus } from './inventory-cycle-count.model';

export interface InventoryCycleFilters {
  bodegaId: string | null;
  ubicacionId: string | null;
  sku: string | null;
  loteId: string | null;
  estado: InventoryCycleCountStatus | 'TODOS';
  fechaDesde: string;
  fechaHasta: string;
  severidad: InventoryCycleAlertSeverity | 'TODAS';
}

const today = new Date();
const currentDate = today.toISOString().slice(0, 10);
const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

export const DEFAULT_INVENTORY_CYCLE_FILTERS: InventoryCycleFilters = {
  bodegaId: null,
  ubicacionId: null,
  sku: null,
  loteId: null,
  estado: 'TODOS',
  fechaDesde: monthStart,
  fechaHasta: currentDate,
  severidad: 'TODAS',
};
