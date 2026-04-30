import { BiFilterContext, BiMetricValue, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface ExecutiveDashboardFilters extends BiFilterContext {}

export type ExecutiveAlertSeverity = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type ExecutiveAlertStatus = 'ABIERTA' | 'EN_GESTION' | 'CERRADA';

export interface ExecutiveCriticalAlert {
  id: string;
  mensaje: string;
  severidad: ExecutiveAlertSeverity;
  tipo: 'INVENTARIO' | 'OEE' | 'OTIF' | 'PRESUPUESTO' | 'MARGEN' | 'FORECAST';
  responsableSugerido: string;
  estado: ExecutiveAlertStatus;
  fechaDeteccion: string;
  moduloOrigen?: string | null;
}

export interface ExecutiveDashboard360Response {
  filters: ExecutiveDashboardFilters;
  ventasMes: BiMetricValue;
  cumplimientoPresupuesto: BiMetricValue;
  produccionVsPlan: BiMetricValue;
  inventarioTotal: BiMetricValue;
  otif: BiMetricValue;
  margenEstimado: BiMetricValue;
  alertasCriticas: BiMetricValue;
  alertas?: ExecutiveCriticalAlert[];
  tendencias?: {
    ventas?: BiTrendPoint[];
    margen?: BiTrendPoint[];
    otif?: BiTrendPoint[];
  };
  grafana?: BiDashboardEmbedConfig | null;
}
