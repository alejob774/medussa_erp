import { MeasurementUnit } from './measurement-unit.model';

export interface BomFormulaDetail {
  id: string;
  formulaId: string;
  ingredienteId: string;
  ingredienteCodigo: string;
  ingredienteNombre: string;
  cantidad: number;
  unidadMedida: MeasurementUnit;
  costoUnitario: number;
  costoTotalLinea: number;
}
