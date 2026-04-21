import { Observable } from 'rxjs';
import { MeasurementUnit } from '../models/measurement-unit.model';
import { BomFormulaFilters } from '../models/bom-formula-filters.model';
import { BomFormulaMutationResult, BomFormulaDashboard } from '../models/bom-formula-response.model';
import { BomFormulaStatus } from '../models/bom-status.model';

export interface SaveBomFormulaIngredientPayload {
  ingredienteId: string;
  ingredienteCodigo: string;
  ingredienteNombre: string;
  cantidad: number;
  unidadMedida: MeasurementUnit;
  costoUnitario: number;
}

export interface SaveBomFormulaPayload {
  productoId: string;
  estado: Extract<BomFormulaStatus, 'BORRADOR' | 'PENDIENTE'>;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  mermaEsperada: number;
  tiempoProceso: number;
  rendimientoEsperado: number;
  unidadRendimiento: MeasurementUnit;
  empaqueRequerido: string;
  responsableAprobacion: string;
  observacionesSanitarias: string | null;
  usuarioCreador: string;
  ingredientes: SaveBomFormulaIngredientPayload[];
}

export interface BomFormulaDecisionPayload {
  usuario: string;
  responsableAprobacion: string;
  observacion: string | null;
  vigenciaDesde?: string | null;
}

export interface BomFormulaNewVersionPayload {
  usuario: string;
  motivoCambio: string;
}

export interface BomFormulaRepository {
  getDashboard(companyId: string, filters: BomFormulaFilters): Observable<BomFormulaDashboard>;
  saveFormula(
    companyId: string,
    payload: SaveBomFormulaPayload,
    formulaId?: string,
  ): Observable<BomFormulaMutationResult>;
  approveFormula(
    companyId: string,
    formulaId: string,
    payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult>;
  rejectFormula(
    companyId: string,
    formulaId: string,
    payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult>;
  createNewVersion(
    companyId: string,
    formulaId: string,
    payload: BomFormulaNewVersionPayload,
  ): Observable<BomFormulaMutationResult>;
}
