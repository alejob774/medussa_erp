import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductDevelopmentFilters } from '../../domain/models/product-development-filters.model';
import { ProductDevelopmentDashboard } from '../../domain/models/product-development-project.model';
import { ProductDevelopmentMutationResult } from '../../domain/models/product-development-response.model';
import {
  ProductDevelopmentBomPayload,
  ProductDevelopmentDecisionPayload,
  ProductDevelopmentRepository,
  ProductDevelopmentSavePayload,
} from '../../domain/repositories/product-development.repository';

@Injectable({
  providedIn: 'root',
})
export class ProductDevelopmentApiRepository implements ProductDevelopmentRepository {
  private readonly baseUrl = `${environment.apiUrl}/scm/product-development`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(companyId: string, filters: ProductDevelopmentFilters): Observable<ProductDevelopmentDashboard> {
    return this.http.post<ProductDevelopmentDashboard>(`${this.baseUrl}/dashboard`, { companyId, filters });
  }

  saveProject(companyId: string, payload: ProductDevelopmentSavePayload, projectId?: string): Observable<ProductDevelopmentMutationResult> {
    return projectId
      ? this.http.put<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}`, { companyId, payload })
      : this.http.post<ProductDevelopmentMutationResult>(this.baseUrl, { companyId, payload });
  }

  saveBomItem(companyId: string, projectId: string, payload: ProductDevelopmentBomPayload, bomItemId?: string): Observable<ProductDevelopmentMutationResult> {
    return bomItemId
      ? this.http.put<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/bom/${bomItemId}`, { companyId, payload })
      : this.http.post<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/bom`, { companyId, payload });
  }

  deleteBomItem(companyId: string, projectId: string, bomItemId: string): Observable<ProductDevelopmentMutationResult> {
    return this.http.request<ProductDevelopmentMutationResult>('delete', `${this.baseUrl}/${projectId}/bom/${bomItemId}`, { body: { companyId } });
  }

  evaluateProject(companyId: string, projectId: string): Observable<ProductDevelopmentMutationResult> {
    return this.http.post<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/evaluate`, { companyId });
  }

  approveProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    return this.http.post<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/approve`, { companyId, payload });
  }

  rejectProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    return this.http.post<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/reject`, { companyId, payload });
  }

  launchProject(companyId: string, projectId: string, payload: ProductDevelopmentDecisionPayload): Observable<ProductDevelopmentMutationResult> {
    return this.http.post<ProductDevelopmentMutationResult>(`${this.baseUrl}/${projectId}/launch`, { companyId, payload });
  }
}
