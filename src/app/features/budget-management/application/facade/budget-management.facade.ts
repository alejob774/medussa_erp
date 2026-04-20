import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { BudgetManagementFilters } from '../../domain/models/budget-management-filters.model';
import { BudgetManagementDashboard, BudgetManagementMutationResult } from '../../domain/models/budget-management-response.model';
import {
  AdjustBudgetManagementPayload,
  BudgetManagementRepository,
  SaveBudgetManagementPayload,
} from '../../domain/repositories/budget-management.repository';
import { BudgetManagementApiRepository } from '../../infrastructure/repositories/budget-management-api.repository';
import { BudgetManagementMockRepository } from '../../infrastructure/repositories/budget-management-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class BudgetManagementFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(BudgetManagementMockRepository);
  private readonly apiRepository = inject(BudgetManagementApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: BudgetManagementFilters): Observable<BudgetManagementDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveBudget(
    payload: SaveBudgetManagementPayload,
    budgetId?: string,
  ): Observable<BudgetManagementMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveBudget(companyId, payload, budgetId),
    );
  }

  adjustBudget(
    budgetId: string,
    payload: AdjustBudgetManagementPayload,
  ): Observable<BudgetManagementMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.adjustBudget(companyId, budgetId, payload),
    );
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

  private get repository(): BudgetManagementRepository {
    return environment.useBudgetManagementMock ? this.mockRepository : this.apiRepository;
  }
}
