import { Observable } from 'rxjs';
import {
  ApplyDemandForecastAdjustmentPayload,
  ApproveDemandForecastPayload,
  DemandForecastCatalogs,
  GenerateDemandForecastPayload,
} from '../models/demand-forecast.model';
import { DemandForecastFilters } from '../models/demand-forecast-filters.model';
import {
  DemandForecastDashboard,
  DemandForecastMutationResult,
} from '../models/demand-forecast-response.model';

export interface DemandForecastRepository {
  getCatalogs(companyId: string): Observable<DemandForecastCatalogs>;
  getDashboard(
    companyId: string,
    filters: DemandForecastFilters,
  ): Observable<DemandForecastDashboard>;
  generateForecast(
    companyId: string,
    payload: GenerateDemandForecastPayload,
  ): Observable<DemandForecastMutationResult>;
  applyAdjustment(
    companyId: string,
    forecastId: string,
    payload: ApplyDemandForecastAdjustmentPayload,
  ): Observable<DemandForecastMutationResult>;
  approveForecast(
    companyId: string,
    forecastId: string,
    payload: ApproveDemandForecastPayload,
  ): Observable<DemandForecastMutationResult>;
}
