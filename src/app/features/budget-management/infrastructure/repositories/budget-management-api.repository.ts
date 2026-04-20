import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BudgetManagementFilters } from '../../domain/models/budget-management-filters.model';
import { BudgetManagementDashboard, BudgetManagementMutationResult } from '../../domain/models/budget-management-response.model';
import {
  AdjustBudgetManagementPayload,
  BudgetManagementRepository,
  SaveBudgetManagementPayload,
} from '../../domain/repositories/budget-management.repository';

@Injectable({
  providedIn: 'root',
})
export class BudgetManagementApiRepository implements BudgetManagementRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scm/budget-management`;

  getDashboard(companyId: string, filters: BudgetManagementFilters): Observable<BudgetManagementDashboard> {
    return this.http.post<BudgetManagementDashboard>(`${this.baseUrl}/dashboard`, {
      companyId,
      filters,
    });
  }

  saveBudget(
    companyId: string,
    payload: SaveBudgetManagementPayload,
    budgetId?: string,
  ): Observable<BudgetManagementMutationResult> {
    return budgetId
      ? this.http.put<BudgetManagementMutationResult>(`${this.baseUrl}/${budgetId}`, {
          companyId,
          ...payload,
        })
      : this.http.post<BudgetManagementMutationResult>(this.baseUrl, {
          companyId,
          ...payload,
        });
  }

  adjustBudget(
    companyId: string,
    budgetId: string,
    payload: AdjustBudgetManagementPayload,
  ): Observable<BudgetManagementMutationResult> {
    return this.http.post<BudgetManagementMutationResult>(
      `${this.baseUrl}/${budgetId}/adjustments`,
      {
        companyId,
        ...payload,
      },
    );
  }
}
