import { BiAlertSeverity, BiAlertStatus, BiBaseDateFilters } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export type ManagerialAlertType =
  | 'QUIEBRE_STOCK'
  | 'CAIDA_VENTAS'
  | 'OEE_BAJO'
  | 'PEDIDOS_ATRASADOS'
  | 'DESVIACION_PRESUPUESTO'
  | 'MARGEN_BAJO'
  | 'MARGEN'
  | 'VENTAS'
  | 'INVENTARIO'
  | 'PRODUCCION'
  | 'CALIDAD'
  | 'FORECAST'
  | 'CLIENTE';

export interface ManagerialAlertsFilters extends BiBaseDateFilters {
  sedeId?: string | null;
  estado?: BiAlertStatus | 'TODAS' | null;
  severidad?: BiAlertSeverity | 'TODAS' | null;
  tipoAlerta?: ManagerialAlertType | 'TODAS' | null;
}

export interface ManagerialAlert {
  id: string;
  empresaId: string;
  titulo: string;
  descripcion: string;
  tipoAlerta: ManagerialAlertType;
  severidad: BiAlertSeverity;
  estado: BiAlertStatus;
  fechaDeteccion: string;
  valorDetectado?: string | number | null;
  umbral?: string | number | null;
  responsableSugerido?: string | null;
  sedeId?: string | null;
  sedeNombre?: string | null;
  moduloOrigen?: string | null;
  entidadId?: string | null;
  grafanaPanelUid?: string | null;
}

export interface ManagerialTrafficLightSummary {
  rojas: number;
  amarillas: number;
  verdes: number;
}

export interface ManagerialAlertsResponse {
  filters: ManagerialAlertsFilters;
  alertas: ManagerialAlert[];
  resumenSemaforo: ManagerialTrafficLightSummary;
  totalAbiertas: number;
  totalRojas: number;
  totalAmarillas: number;
  totalVerdes: number;
  grafana?: BiDashboardEmbedConfig | null;
}
