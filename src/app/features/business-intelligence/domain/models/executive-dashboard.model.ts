import { BiFilterContext, BiMetricValue, BiTrendPoint } from './bi-filter-context.model';
import { BiDashboardEmbedConfig } from './grafana-embed.model';

export interface ExecutiveDashboardFilters extends BiFilterContext {}

export interface ExecutiveDashboard360Response {
  filters: ExecutiveDashboardFilters;
  ventasMes: BiMetricValue;
  cumplimientoPresupuesto: BiMetricValue;
  produccionVsPlan: BiMetricValue;
  inventarioTotal: BiMetricValue;
  otif: BiMetricValue;
  margenEstimado: BiMetricValue;
  alertasCriticas: BiMetricValue;
  tendencias?: {
    ventas?: BiTrendPoint[];
    margen?: BiTrendPoint[];
    otif?: BiTrendPoint[];
  };
  grafana?: BiDashboardEmbedConfig | null;
}
