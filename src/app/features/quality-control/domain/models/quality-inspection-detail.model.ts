export interface QualityInspectionDetail {
  id: string;
  inspeccionId: string;
  templateId?: string | null;
  parametro: string;
  resultado: number;
  unidadMedida: string;
  rangoMin: number;
  rangoMax: number;
  conforme: boolean;
  esCritico?: boolean | null;
}
