import { Observable } from 'rxjs';
import { PurchaseAnalysisFilters } from '../models/purchase-analysis-filters.model';
import {
  PurchaseAnalysisDashboard,
  PurchaseAnalysisMutationResult,
} from '../models/purchase-analysis-response.model';

export interface PurchaseAnalysisRepository {
  getDashboard(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisDashboard>;
  refreshAnalysis(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisMutationResult>;
}
