import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
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
import { DemandForecastApiRepository } from '../../infrastructure/repositories/demand-forecast-api.repository';
import { DemandForecastMockRepository } from '../../infrastructure/repositories/demand-forecast-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DemandForecastFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(DemandForecastMockRepository);
  private readonly apiRepository = inject(DemandForecastApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<DemandForecastCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  getDashboard(filters: DemandForecastFilters): Observable<DemandForecastDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  generateForecast(payload: GenerateDemandForecastPayload): Observable<DemandForecastMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.generateForecast(companyId, payload));
  }

  applyAdjustment(
    forecastId: string,
    payload: ApplyDemandForecastAdjustmentPayload,
  ): Observable<DemandForecastMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.applyAdjustment(companyId, forecastId, payload),
    );
  }

  approveForecast(
    forecastId: string,
    payload: ApproveDemandForecastPayload,
  ): Observable<DemandForecastMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.approveForecast(companyId, forecastId, payload),
    );
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): DemandForecastRepository {
    return environment.useDemandForecastMock ? this.mockRepository : this.apiRepository;
  }
}
