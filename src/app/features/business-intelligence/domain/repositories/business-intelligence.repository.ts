import { Observable } from 'rxjs';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../models/executive-dashboard.model';
import { GrafanaDashboardConfig } from '../models/grafana-embed.model';
import { LogisticsKpiFilters, LogisticsKpiResponse } from '../models/logistics-kpi.model';
import { ManagerialAlertsFilters, ManagerialAlertsResponse } from '../models/managerial-alerts.model';
import { OeePlantFilters, OeePlantResponse } from '../models/oee-plant.model';
import { ProfitabilityFilters, ProfitabilityProductLineResponse } from '../models/profitability.model';
import { ProductionRealtimeFilters, ProductionRealtimeResponse } from '../models/production-realtime.model';
import { QualityNonconformityFilters, QualityNonconformityResponse } from '../models/quality-nonconformity.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../models/strategic-clients.model';
import { StrategicInventoryFilters, StrategicInventoryResponse } from '../models/strategic-inventory.model';
import { StrategicPurchasingFilters, StrategicPurchasingResponse } from '../models/strategic-purchasing.model';

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

  abstract getProductionRealtime(
    companyId: string,
    filters: ProductionRealtimeFilters,
  ): Observable<ProductionRealtimeResponse>;

  abstract getOeePlant(companyId: string, filters: OeePlantFilters): Observable<OeePlantResponse>;

  abstract getQualityNonconformities(
    companyId: string,
    filters: QualityNonconformityFilters,
  ): Observable<QualityNonconformityResponse>;

  abstract getStrategicInventory(
    companyId: string,
    filters: StrategicInventoryFilters,
  ): Observable<StrategicInventoryResponse>;

  abstract getStrategicPurchasing(
    companyId: string,
    filters: StrategicPurchasingFilters,
  ): Observable<StrategicPurchasingResponse>;

  abstract getLogisticsKpis(
    companyId: string,
    filters: LogisticsKpiFilters,
  ): Observable<LogisticsKpiResponse>;

  abstract getGrafanaDashboards(companyId: string): Observable<GrafanaDashboardConfig[]>;
}
