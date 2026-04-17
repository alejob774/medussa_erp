import { Observable } from 'rxjs';
import { DemandAnalysisFilters } from '../models/demand-analysis-filters.model';
import { DemandAnalysisDashboard, DemandAnalysisMutationResult } from '../models/demand-analysis-response.model';

export interface DemandAnalysisRepository {
  getDashboard(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisDashboard>;
  refreshAnalysis(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisMutationResult>;
}
