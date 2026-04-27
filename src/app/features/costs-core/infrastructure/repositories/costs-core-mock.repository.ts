import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { InventoryMovement } from '../../../inventory-core/domain/models/inventory-movement.model';
import { CostMovement, CostMovementFilters } from '../../domain/models/cost-movement.model';
import { ProductCost } from '../../domain/models/product-cost.model';
import { ProductionOrderCost } from '../../domain/models/production-order-cost.model';
import { ProductMargin } from '../../domain/models/sales-cost.model';
import { CostsCoreRepository, ProductCostLookup } from '../../domain/repositories/costs-core.repository';
import {
  getCostMovementsFromStore,
  getCurrentProductCostFromStore,
  getProductMarginFromStore,
  getProductionOrderCostFromStore,
  recalculateAverageProductCost,
  registerCostFromInventoryMovement,
} from './costs-core-store.utils';

@Injectable({
  providedIn: 'root',
})
export class CostsCoreMockRepository implements CostsCoreRepository {
  getCurrentProductCost(
    companyId: string,
    lookup: ProductCostLookup,
  ): Observable<ProductCost | null> {
    return of(getCurrentProductCostFromStore(companyId, lookup)).pipe(delay(120));
  }

  getCostMovements(
    companyId: string,
    filters: CostMovementFilters,
  ): Observable<CostMovement[]> {
    return of(getCostMovementsFromStore(companyId, filters)).pipe(delay(120));
  }

  registerCostFromInventoryMovement(
    companyId: string,
    movement: InventoryMovement,
  ): Observable<CostMovement | null> {
    if (movement.empresaId !== companyId) {
      return of(null).pipe(delay(80));
    }

    return of(registerCostFromInventoryMovement(movement)).pipe(delay(120));
  }

  recalculateAverageCost(
    companyId: string,
    productId: string,
  ): Observable<ProductCost | null> {
    return of(recalculateAverageProductCost(companyId, productId)).pipe(delay(160));
  }

  getProductionOrderCost(
    companyId: string,
    opId: string,
  ): Observable<ProductionOrderCost | null> {
    return of(getProductionOrderCostFromStore(companyId, opId)).pipe(delay(120));
  }

  getProductMargin(
    companyId: string,
    productId: string,
  ): Observable<ProductMargin | null> {
    return of(getProductMarginFromStore(companyId, productId)).pipe(delay(120));
  }
}
