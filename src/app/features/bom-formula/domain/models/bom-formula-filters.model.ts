import { BomFormulaStatus } from './bom-status.model';

export interface BomFormulaFilters {
  productoId: string | null;
  estado: BomFormulaStatus | 'TODOS';
  version: string | null;
  vigencia: 'TODAS' | 'ACTIVA' | 'PROGRAMADA' | 'VENCIDA';
  responsableAprobacion: string | null;
}

export const DEFAULT_BOM_FORMULA_FILTERS: BomFormulaFilters = {
  productoId: null,
  estado: 'TODOS',
  version: null,
  vigencia: 'TODAS',
  responsableAprobacion: null,
};
