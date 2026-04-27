import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CommercialPerformanceFilters, CommercialPerformanceResponse } from '../../domain/models/commercial-performance.model';
import { DemandVsForecastFilters, DemandVsForecastResponse } from '../../domain/models/demand-vs-forecast.model';
import { ExecutiveDashboard360Response, ExecutiveDashboardFilters } from '../../domain/models/executive-dashboard.model';
import { GrafanaDashboardConfig } from '../../domain/models/grafana-embed.model';
import { ManagerialAlertsFilters, ManagerialAlertsResponse } from '../../domain/models/managerial-alerts.model';
import { ProfitabilityFilters, ProfitabilityProductLineResponse } from '../../domain/models/profitability.model';
import { StrategicClientsFilters, StrategicClientsResponse } from '../../domain/models/strategic-clients.model';
import { BusinessIntelligenceRepository } from '../../domain/repositories/business-intelligence.repository';

@Injectable({
  providedIn: 'root',
})
export class BusinessIntelligenceApiRepository implements BusinessIntelligenceRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/bi`;

  getExecutiveDashboard(
    companyId: string,
    filters: ExecutiveDashboardFilters,
  ): Observable<ExecutiveDashboard360Response> {
    return this.http.get<ExecutiveDashboard360Response>(`${this.baseUrl}/dashboard-ejecutivo`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getProfitability(
    companyId: string,
    filters: ProfitabilityFilters,
  ): Observable<ProfitabilityProductLineResponse> {
    return this.http.get<ProfitabilityProductLineResponse>(`${this.baseUrl}/rentabilidad-producto-linea`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getManagerialAlerts(
    companyId: string,
    filters: ManagerialAlertsFilters,
  ): Observable<ManagerialAlertsResponse> {
    return this.http.get<ManagerialAlertsResponse>(`${this.baseUrl}/alertas-gerenciales`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getCommercialPerformance(
    companyId: string,
    filters: CommercialPerformanceFilters,
  ): Observable<CommercialPerformanceResponse> {
    return this.http.get<CommercialPerformanceResponse>(`${this.baseUrl}/ventas-cumplimiento-comercial`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getStrategicClients(
    companyId: string,
    filters: StrategicClientsFilters,
  ): Observable<StrategicClientsResponse> {
    return this.http.get<StrategicClientsResponse>(`${this.baseUrl}/clientes-estrategicos`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getDemandVsForecast(
    companyId: string,
    filters: DemandVsForecastFilters,
  ): Observable<DemandVsForecastResponse> {
    return this.http.get<DemandVsForecastResponse>(`${this.baseUrl}/demanda-vs-forecast`, {
      params: this.cleanParams({ ...filters, empresaId: companyId }),
    });
  }

  getGrafanaDashboards(companyId: string): Observable<GrafanaDashboardConfig[]> {
    return this.http.get<GrafanaDashboardConfig[]>(`${this.baseUrl}/grafana/dashboards`, {
      params: this.cleanParams({ empresaId: companyId }),
    });
  }

  private cleanParams(filters: object): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {});
  }
}
