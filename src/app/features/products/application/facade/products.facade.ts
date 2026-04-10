import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { ProductFilters } from '../../domain/models/product-filters.model';
import { SaveProductPayload } from '../../domain/models/product-form.model';
import { Product, ProductCatalogs, ProductStatus } from '../../domain/models/product.model';
import { ProductListResponse, ProductMutationResult } from '../../domain/models/product-response.model';
import { ProductApiRepository } from '../../infrastructure/repositories/product-api.repository';
import { ProductMockRepository } from '../../infrastructure/repositories/product-mock.repository';
import { ProductsRepository } from '../../domain/repositories/product.repository';

@Injectable({
  providedIn: 'root',
})
export class ProductsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(ProductMockRepository);
  private readonly apiRepository = inject(ProductApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<ProductCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listProducts(filters: ProductFilters): Observable<ProductListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listProducts(companyId, filters));
  }

  getProduct(productId: string): Observable<Product> {
    return this.withActiveCompany((companyId) => this.repository.getProduct(companyId, productId));
  }

  saveProduct(payload: SaveProductPayload, productId?: string): Observable<ProductMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveProduct(companyId, payload, productId),
    );
  }

  deleteProduct(productId: string): Observable<ProductMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteProduct(companyId, productId));
  }

  updateProductStatus(
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateProductStatus(companyId, productId, status),
    );
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(
    operation: (companyId: string) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): ProductsRepository {
    return environment.useProductsAdministrationMock
      ? this.mockRepository
      : this.apiRepository;
  }
}