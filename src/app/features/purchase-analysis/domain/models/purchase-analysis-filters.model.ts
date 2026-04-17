import { PurchaseAnalysisAlertSeverity } from './purchase-analysis-alert.model';

export interface PurchaseAnalysisFilters {
  fechaDesde: string;
  fechaHasta: string;
  proveedorId: string | null;
  categoria: string | null;
  tipoAbastecimiento: 'MIR' | 'LOGISTICA' | null;
  ciudad: string | null;
  severidad: PurchaseAnalysisAlertSeverity | 'TODAS';
}

export const DEFAULT_PURCHASE_ANALYSIS_FILTERS: PurchaseAnalysisFilters = {
  fechaDesde: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0, 10),
  fechaHasta: new Date().toISOString().slice(0, 10),
  proveedorId: null,
  categoria: null,
  tipoAbastecimiento: null,
  ciudad: null,
  severidad: 'TODAS',
};
