import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import {
  ProductDevelopmentBomPayload,
  ProductDevelopmentDecisionPayload,
  ProductDevelopmentRepository,
  ProductDevelopmentSavePayload,
} from '../../domain/repositories/product-development.repository';
import { ProductDevelopmentFilters } from '../../domain/models/product-development-filters.model';
import { ProductDevelopmentDashboard } from '../../domain/models/product-development-project.model';
import { ProductDevelopmentMutationResult } from '../../domain/models/product-development-response.model';
import { ProductDevelopmentApiRepository } from '../../infrastructure/repositories/product-development-api.repository';
import { ProductDevelopmentMockRepository } from '../../infrastructure/repositories/product-development-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class ProductDevelopmentFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(ProductDevelopmentMockRepository);
  private readonly apiRepository = inject(ProductDevelopmentApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: ProductDevelopmentFilters): Observable<ProductDevelopmentDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveProject(payload: ProductDevelopmentSavePayload, projectId?: string): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveProject(companyId, payload, projectId));
  }

  saveBomItem(
    projectId: string,
    payload: ProductDevelopmentBomPayload,
    bomItemId?: string,
  ): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveBomItem(companyId, projectId, payload, bomItemId));
  }

  deleteBomItem(projectId: string, bomItemId: string): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteBomItem(companyId, projectId, bomItemId));
  }

  evaluateProject(projectId: string): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.evaluateProject(companyId, projectId));
  }

  approveProject(
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.approveProject(companyId, projectId, payload));
  }

  rejectProject(
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.rejectProject(companyId, projectId, payload));
  }

  launchProject(
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.launchProject(companyId, projectId, payload));
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

  private get repository(): ProductDevelopmentRepository {
    return environment.useProductDevelopmentMock ? this.mockRepository : this.apiRepository;
  }
}
