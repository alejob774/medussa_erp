import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ApplyDemandForecastAdjustmentPayload,
  ApproveDemandForecastPayload,
  DemandForecastCatalogs,
  GenerateDemandForecastPayload,
} from '../../domain/models/demand-forecast.model';
import { DemandForecastFilters } from '../../domain/models/demand-forecast-filters.model';
import {
  DemandForecastDashboard,
  DemandForecastMutationResult,
} from '../../domain/models/demand-forecast-response.model';
import { DemandForecastRepository } from '../../domain/repositories/demand-forecast.repository';

@Injectable({
  providedIn: 'root',
})
export class DemandForecastApiRepository implements DemandForecastRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scm/demand-forecasts`;

  getCatalogs(companyId: string): Observable<DemandForecastCatalogs> {
    return this.http.get<DemandForecastCatalogs>(`${this.baseUrl}/catalogs`, {
      params: { companyId },
    });
  }

  getDashboard(companyId: string, filters: DemandForecastFilters): Observable<DemandForecastDashboard> {
    return this.http.post<DemandForecastDashboard>(`${this.baseUrl}/dashboard`, {
      companyId,
      filters,
    });
  }

  generateForecast(
    companyId: string,
    payload: GenerateDemandForecastPayload,
  ): Observable<DemandForecastMutationResult> {
    return this.http.post<DemandForecastMutationResult>(`${this.baseUrl}`, {
      companyId,
      ...payload,
    });
  }

  applyAdjustment(
    companyId: string,
    forecastId: string,
    payload: ApplyDemandForecastAdjustmentPayload,
  ): Observable<DemandForecastMutationResult> {
    return this.http.post<DemandForecastMutationResult>(
      `${this.baseUrl}/${forecastId}/adjustments`,
      {
        companyId,
        ...payload,
      },
    );
  }

  approveForecast(
    companyId: string,
    forecastId: string,
    payload: ApproveDemandForecastPayload,
  ): Observable<DemandForecastMutationResult> {
    return this.http.post<DemandForecastMutationResult>(`${this.baseUrl}/${forecastId}/approve`, {
      companyId,
      ...payload,
    });
  }
}
