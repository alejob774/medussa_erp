import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../../domain/models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../../domain/models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../../domain/models/executive-dashboard.model';
import { GrafanaDashboardConfig } from '../../domain/models/grafana-embed.model';
import { LogisticsKpiFilters, LogisticsKpiResponse } from '../../domain/models/logistics-kpi.model';
import { ManagerialAlertsFilters, ManagerialAlertsResponse } from '../../domain/models/managerial-alerts.model';
import { OeePlantFilters, OeePlantResponse } from '../../domain/models/oee-plant.model';
import { ProfitabilityFilters, ProfitabilityProductLineResponse } from '../../domain/models/profitability.model';
import { ProductionRealtimeFilters, ProductionRealtimeResponse } from '../../domain/models/production-realtime.model';
import { QualityNonconformityFilters, QualityNonconformityResponse } from '../../domain/models/quality-nonconformity.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../../domain/models/strategic-clients.model';
import { StrategicInventoryFilters, StrategicInventoryResponse } from '../../domain/models/strategic-inventory.model';
import { StrategicPurchasingFilters, StrategicPurchasingResponse } from '../../domain/models/strategic-purchasing.model';
import { BusinessIntelligenceRepository } from '../../domain/repositories/business-intelligence.repository';
import { BusinessIntelligenceApiRepository } from '../../infrastructure/repositories/business-intelligence-api.repository';
import { BusinessIntelligenceMockRepository } from '../../infrastructure/repositories/business-intelligence-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class BusinessIntelligenceFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(BusinessIntelligenceMockRepository);
  private readonly apiRepository = inject(BusinessIntelligenceApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getExecutiveDashboard(filters: ExecutiveDashboardFilters): Observable<ExecutiveDashboard360Response> {
    return this.withActiveCompany((companyId) => this.repository.getExecutiveDashboard(companyId, filters));
  }

  getProfitability(filters: ProfitabilityFilters): Observable<ProfitabilityProductLineResponse> {
    return this.withActiveCompany((companyId) => this.repository.getProfitability(companyId, filters));
  }

  getManagerialAlerts(filters: ManagerialAlertsFilters): Observable<ManagerialAlertsResponse> {
    return this.withActiveCompany((companyId) => this.repository.getManagerialAlerts(companyId, filters));
  }

  getCommercialPerformance(filters: CommercialPerformanceFilters): Observable<CommercialPerformanceResponse> {
    return this.withActiveCompany((companyId) => this.repository.getCommercialPerformance(companyId, filters));
  }

  getStrategicClients(filters: StrategicClientsFilters): Observable<StrategicClientsResponse> {
    return this.withActiveCompany((companyId) => this.repository.getStrategicClients(companyId, filters));
  }

  getDemandVsForecast(filters: DemandVsForecastFilters): Observable<DemandVsForecastResponse> {
    return this.withActiveCompany((companyId) => this.repository.getDemandVsForecast(companyId, filters));
  }

  getProductionRealtime(filters: ProductionRealtimeFilters): Observable<ProductionRealtimeResponse> {
    return this.withActiveCompany((companyId) => this.repository.getProductionRealtime(companyId, filters));
  }

  getOeePlant(filters: OeePlantFilters): Observable<OeePlantResponse> {
    return this.withActiveCompany((companyId) => this.repository.getOeePlant(companyId, filters));
  }

  getQualityNonconformities(filters: QualityNonconformityFilters): Observable<QualityNonconformityResponse> {
    return this.withActiveCompany((companyId) => this.repository.getQualityNonconformities(companyId, filters));
  }

  getStrategicInventory(filters: StrategicInventoryFilters): Observable<StrategicInventoryResponse> {
    return this.withActiveCompany((companyId) => this.repository.getStrategicInventory(companyId, filters));
  }

  getStrategicPurchasing(filters: StrategicPurchasingFilters): Observable<StrategicPurchasingResponse> {
    return this.withActiveCompany((companyId) => this.repository.getStrategicPurchasing(companyId, filters));
  }

  getLogisticsKpis(filters: LogisticsKpiFilters): Observable<LogisticsKpiResponse> {
    return this.withActiveCompany((companyId) => this.repository.getLogisticsKpis(companyId, filters));
  }

  getGrafanaDashboards(): Observable<GrafanaDashboardConfig[]> {
    return this.withActiveCompany((companyId) => this.repository.getGrafanaDashboards(companyId));
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.companyContextService.getActiveCompany()?.id ?? null;

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): BusinessIntelligenceRepository {
    return environment.useBusinessIntelligenceMock ? this.mockRepository : this.apiRepository;
  }
}
