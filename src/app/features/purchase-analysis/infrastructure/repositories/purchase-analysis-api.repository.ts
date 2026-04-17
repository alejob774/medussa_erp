import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PurchaseAnalysisFilters } from '../../domain/models/purchase-analysis-filters.model';
import {
  PurchaseAnalysisDashboard,
  PurchaseAnalysisMutationResult,
} from '../../domain/models/purchase-analysis-response.model';
import { PurchaseAnalysisRepository } from '../../domain/repositories/purchase-analysis.repository';

@Injectable({
  providedIn: 'root',
})
export class PurchaseAnalysisApiRepository implements PurchaseAnalysisRepository {
  private readonly baseUrl = `${environment.apiUrl}/scm/purchase-analysis`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisDashboard> {
    return this.http.post<PurchaseAnalysisDashboard>(`${this.baseUrl}/dashboard`, { companyId, filters });
  }

  refreshAnalysis(companyId: string, filters: PurchaseAnalysisFilters): Observable<PurchaseAnalysisMutationResult> {
    return this.http.post<PurchaseAnalysisMutationResult>(`${this.baseUrl}/refresh`, { companyId, filters });
  }
}
