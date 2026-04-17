import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { DemandAnalysisFilters } from '../../domain/models/demand-analysis-filters.model';
import { DemandAnalysisDashboard, DemandAnalysisMutationResult } from '../../domain/models/demand-analysis-response.model';
import { DemandAnalysisRepository } from '../../domain/repositories/demand-analysis.repository';
import { DemandAnalysisApiRepository } from '../../infrastructure/repositories/demand-analysis-api.repository';
import { DemandAnalysisMockRepository } from '../../infrastructure/repositories/demand-analysis-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DemandAnalysisFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(DemandAnalysisMockRepository);
  private readonly apiRepository = inject(DemandAnalysisApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: DemandAnalysisFilters): Observable<DemandAnalysisDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  refreshAnalysis(filters: DemandAnalysisFilters): Observable<DemandAnalysisMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.refreshAnalysis(companyId, filters));
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

  private get repository(): DemandAnalysisRepository {
    return environment.useDemandAnalysisMock ? this.mockRepository : this.apiRepository;
  }
}
