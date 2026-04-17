import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { PurchaseAnalysisFilters } from '../../domain/models/purchase-analysis-filters.model';
import {
  PurchaseAnalysisDashboard,
  PurchaseAnalysisMutationResult,
} from '../../domain/models/purchase-analysis-response.model';
import { PurchaseAnalysisRepository } from '../../domain/repositories/purchase-analysis.repository';
import { PurchaseAnalysisApiRepository } from '../../infrastructure/repositories/purchase-analysis-api.repository';
import { PurchaseAnalysisMockRepository } from '../../infrastructure/repositories/purchase-analysis-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class PurchaseAnalysisFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(PurchaseAnalysisMockRepository);
  private readonly apiRepository = inject(PurchaseAnalysisApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  refreshAnalysis(filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisMutationResult> {
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

  private get repository(): PurchaseAnalysisRepository {
    return environment.usePurchaseAnalysisMock ? this.mockRepository : this.apiRepository;
  }
}
