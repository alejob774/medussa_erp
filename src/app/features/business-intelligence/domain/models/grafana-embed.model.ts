import { BiFilterContext } from './bi-filter-context.model';

export type BiDashboardKey =
  | 'executive-dashboard'
  | 'profitability'
  | 'managerial-alerts'
  | 'commercial-performance'
  | 'strategic-clients'
  | 'demand-vs-forecast';

export interface GrafanaDashboardConfig {
  dashboardKey: BiDashboardKey;
  dashboardUid: string;
  folderUid?: string | null;
  title: string;
  datasource: 'dw' | 'datamart';
  refreshInterval: string;
  requiredPermission: string;
}

export interface BiDashboardEmbedConfig {
  dashboardKey: BiDashboardKey;
  dashboardUid: string;
  dashboardUrl?: string | null;
  iframeAllowed: boolean;
  filters: BiFilterContext;
  signedAt?: string | null;
  expiresAt?: string | null;
}
