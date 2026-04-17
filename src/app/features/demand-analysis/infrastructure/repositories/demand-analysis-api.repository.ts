import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { DemandAnalysisFilters } from '../../domain/models/demand-analysis-filters.model';
import { DemandAnalysisDashboard, DemandAnalysisMutationResult } from '../../domain/models/demand-analysis-response.model';
import { DemandAnalysisRepository } from '../../domain/repositories/demand-analysis.repository';

@Injectable({
  providedIn: 'root',
})
export class DemandAnalysisApiRepository implements DemandAnalysisRepository {
  private readonly baseUrl = `${environment.apiUrl}/scm/demand-analysis`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisDashboard> {
    return this.http.get<DemandAnalysisDashboard>(this.baseUrl, {
      params: this.buildParams(companyId, filters),
    });
  }

  refreshAnalysis(companyId: string, filters: DemandAnalysisFilters): Observable<DemandAnalysisMutationResult> {
    return this.http.post<DemandAnalysisMutationResult>(`${this.baseUrl}/refresh`, {
      companyId,
      filters,
    });
  }

  private buildParams(companyId: string, filters: DemandAnalysisFilters): HttpParams {
    return new HttpParams({
      fromObject: {
        companyId,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
        canal: filters.canal ?? '',
        zona: filters.zona ?? '',
        segmento: filters.segmento ?? '',
        clienteId: filters.clienteId ?? '',
        selectedForecastId: filters.selectedForecastId ?? '',
        approvedOnly: String(filters.approvedOnly),
        onlyActiveProducts: String(filters.onlyActiveProducts),
        alertSeverity: filters.alertSeverity,
        skuIds: filters.skuIds.join(','),
      },
    });
  }
}
