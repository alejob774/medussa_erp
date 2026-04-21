import { BomFormulaStatus } from './bom-status.model';
import { BomFormulaDetail } from './bom-formula-detail.model';
import { MeasurementUnit } from './measurement-unit.model';

export interface BomFormula {
  id: string;
  empresaId: string;
  empresaNombre: string;
  codigoFormula: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  version: string;
  estado: BomFormulaStatus;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  mermaEsperada: number;
  tiempoProceso: number;
  rendimientoEsperado: number;
  unidadRendimiento: MeasurementUnit;
  empaqueRequerido: string;
  responsableAprobacion: string;
  fechaAprobacion: string | null;
  observacionesSanitarias: string | null;
  usuarioCreador: string;
  fechaCreacion: string;
  costoEstandarTotal: number;
  costoPorUnidad: number;
  versionOrigenId?: string | null;
  motivoRechazo?: string | null;
}

export interface BomFormulaAggregate {
  formula: BomFormula;
  ingredients: BomFormulaDetail[];
}
