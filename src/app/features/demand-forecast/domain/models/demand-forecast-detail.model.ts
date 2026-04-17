export interface DemandForecastDetail {
  id: string;
  forecastId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  canal: string;
  zona: string;
  segmento: string;
  clienteId?: string | null;
  clienteNombre?: string | null;
  periodo: string;
  demandaHistorica: number;
  forecastSistema: number;
  ajusteManual: number;
  forecastFinal: number;
  inventarioActual: number;
  stockSeguridad: number;
  coberturaDias: number;
  riesgoFaltante: boolean;
  riesgoSobrestock: boolean;
  confianzaForecast: number;
  observacionAjuste?: string | null;
}
