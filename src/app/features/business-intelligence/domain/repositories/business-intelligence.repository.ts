import { Observable } from 'rxjs';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../models/executive-dashboard.model';
import { GrafanaDashboardConfig } from '../models/grafana-embed.model';
import { ManagerialAlertsFilters, ManagerialAlertsResponse } from '../models/managerial-alerts.model';
import { ProfitabilityFilters, ProfitabilityProductLineResponse } from '../models/profitability.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../models/strategic-clients.model';

export abstract class BusinessIntelligenceRepository {
  abstract getExecutiveDashboard(
    companyId: string,
    filters: ExecutiveDashboardFilters,
  ): Observable<ExecutiveDashboard360Response>;

  abstract getProfitability(
    companyId: string,
    filters: ProfitabilityFilters,
  ): Observable<ProfitabilityProductLineResponse>;

  abstract getManagerialAlerts(
    companyId: string,
    filters: ManagerialAlertsFilters,
  ): Observable<ManagerialAlertsResponse>;

  abstract getCommercialPerformance(
    companyId: string,
    filters: CommercialPerformanceFilters,
  ): Observable<CommercialPerformanceResponse>;

  abstract getStrategicClients(
    companyId: string,
    filters: StrategicClientsFilters,
  ): Observable<StrategicClientsResponse>;

  abstract getDemandVsForecast(
    companyId: string,
    filters: DemandVsForecastFilters,
  ): Observable<DemandVsForecastResponse>;

  abstract getGrafanaDashboards(companyId: string): Observable<GrafanaDashboardConfig[]>;
}
