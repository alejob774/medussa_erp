export interface BomFormulaHistory {
  id: string;
  formulaId: string;
  versionOrigen: string | null;
  versionNueva: string;
  usuario: string;
  fecha: string;
  motivoCambio: string;
}
