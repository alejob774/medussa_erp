import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { InventoryMovement } from '../../../inventory-core/domain/models/inventory-movement.model';
import { CostMovement, CostMovementFilters } from '../../domain/models/cost-movement.model';
import { ProductCost } from '../../domain/models/product-cost.model';
import { ProductionOrderCost } from '../../domain/models/production-order-cost.model';
import { ProductMargin } from '../../domain/models/sales-cost.model';
import { CostsCoreRepository, ProductCostLookup } from '../../domain/repositories/costs-core.repository';
import { CostsCoreApiRepository } from '../../infrastructure/repositories/costs-core-api.repository';
import { CostsCoreMockRepository } from '../../infrastructure/repositories/costs-core-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class CostsCoreFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(CostsCoreMockRepository);
  private readonly apiRepository = inject(CostsCoreApiRepository);

  getCurrentProductCost(lookup: ProductCostLookup): Observable<ProductCost | null> {
    return this.withActiveCompany((companyId) => this.repository.getCurrentProductCost(companyId, lookup));
  }

  getCostMovements(filters: CostMovementFilters = {}): Observable<CostMovement[]> {
    return this.withActiveCompany((companyId) => this.repository.getCostMovements(companyId, filters));
  }

  registerCostFromInventoryMovement(movement: InventoryMovement): Observable<CostMovement | null> {
    return this.withActiveCompany((companyId) => this.repository.registerCostFromInventoryMovement(companyId, movement));
  }

  recalculateAverageCost(productId: string): Observable<ProductCost | null> {
    return this.withActiveCompany((companyId) => this.repository.recalculateAverageCost(companyId, productId));
  }

  getProductionOrderCost(opId: string): Observable<ProductionOrderCost | null> {
    return this.withActiveCompany((companyId) => this.repository.getProductionOrderCost(companyId, opId));
  }

  getProductMargin(productId: string): Observable<ProductMargin | null> {
    return this.withActiveCompany((companyId) => this.repository.getProductMargin(companyId, productId));
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

  private get repository(): CostsCoreRepository {
    return environment.useCostsCoreMock ? this.mockRepository : this.apiRepository;
  }
}
