import { QualityControlType, QualityLotStatus } from './quality-status.model';

export interface QualityInspectionFilters {
  tipoControl: QualityControlType | 'TODOS';
  loteId: string | null;
  productoId: string | null;
  proveedorId: string | null;
  estadoLote: QualityLotStatus | 'TODOS';
  analista: string | null;
  fechaDesde: string;
  fechaHasta: string;
}

export const DEFAULT_QUALITY_INSPECTION_FILTERS: QualityInspectionFilters = {
  tipoControl: 'TODOS',
  loteId: null,
  productoId: null,
  proveedorId: null,
  estadoLote: 'TODOS',
  analista: null,
  fechaDesde: resolveDateOffset(-30),
  fechaHasta: resolveDateOffset(0),
};

function resolveDateOffset(offsetDays: number): string {
  const current = new Date();
  current.setDate(current.getDate() + offsetDays);
  return current.toISOString().slice(0, 10);
}
