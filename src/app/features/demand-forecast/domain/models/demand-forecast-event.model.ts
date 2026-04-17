export interface DemandForecastEvent {
  id: string;
  forecastId: string;
  tipoEvento: string;
  descripcion: string;
  impactoPorcentaje: number;
  fechaInicio: string;
  fechaFin: string;
  skuId?: string | null;
  canal?: string | null;
  zona?: string | null;
  segmento?: string | null;
  periodo?: string | null;
  observacion?: string | null;
  createdAt: string;
  createdBy: string;
}
