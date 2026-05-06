import { BiBaseDateFilters, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface QualityNonconformityFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  lineaId?: string | null;
  productoId?: string | null;
  clienteId?: string | null;
  tipoEvento?: string | null;
}

export interface QualityCausePareto {
  causaId: string;
  causaNombre: string;
  eventos: number;
  participacionPct: number;
  costoEstimado: number;
}

export interface QualityEventSummary {
  eventoId: string;
  fecha: string;
  productoId: string;
  productoNombre: string;
  lineaId?: string | null;
  lineaNombre?: string | null;
  clienteId?: string | null;
  clienteNombre?: string | null;
  lote: string;
  tipo: 'RECHAZO_LOTE' | 'RECLAMO_CLIENTE' | 'SCRAP' | 'RETRABAJO' | 'DEVOLUCION';
  cantidad: number;
  costoEstimado: number;
  causa?: string | null;
  estado: 'ABIERTO' | 'EN_ANALISIS' | 'CERRADO';
}

export interface QualityTrendPoint extends BiTrendPoint {
  reclamos?: number | null;
  scrapKg?: number | null;
  costoMalaCalidad?: number | null;
}

export interface QualityNonconformityResponse {
  filters: QualityNonconformityFilters;
  lotesRechazados: number;
  reclamosCliente: number;
  scrapKg: number;
  retrabajos: number;
  costoMalaCalidad: number;
  causasTop: QualityCausePareto[];
  eventosRecientes: QualityEventSummary[];
  tendenciaMensual: QualityTrendPoint[];
  grafanaEmbedConfig?: BiDashboardEmbedConfig | null;
}
