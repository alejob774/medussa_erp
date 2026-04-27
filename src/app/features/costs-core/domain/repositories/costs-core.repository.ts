import { Observable } from 'rxjs';
import { InventoryMovement } from '../../../inventory-core/domain/models/inventory-movement.model';
import { CostMovement, CostMovementFilters } from '../models/cost-movement.model';
import { ProductCost } from '../models/product-cost.model';
import { ProductionOrderCost } from '../models/production-order-cost.model';
import { ProductMargin } from '../models/sales-cost.model';

export interface ProductCostLookup {
  productId?: string | null;
  sku?: string | null;
}

export abstract class CostsCoreRepository {
  abstract getCurrentProductCost(
    companyId: string,
    lookup: ProductCostLookup,
  ): Observable<ProductCost | null>;

  abstract getCostMovements(
    companyId: string,
    filters: CostMovementFilters,
  ): Observable<CostMovement[]>;

  abstract registerCostFromInventoryMovement(
    companyId: string,
    movement: InventoryMovement,
  ): Observable<CostMovement | null>;

  abstract recalculateAverageCost(
    companyId: string,
    productId: string,
  ): Observable<ProductCost | null>;

  abstract getProductionOrderCost(
    companyId: string,
    opId: string,
  ): Observable<ProductionOrderCost | null>;

  abstract getProductMargin(
    companyId: string,
    productId: string,
  ): Observable<ProductMargin | null>;
}
