import { CostMovement } from './cost-movement.model';
import { ProductCost } from './product-cost.model';
import { ProductionOrderCost } from './production-order-cost.model';
import { SalesCost } from './sales-cost.model';

export interface CostsCoreStore {
  productCosts: ProductCost[];
  costMovements: CostMovement[];
  productionOrderCosts: ProductionOrderCost[];
  salesCosts: SalesCost[];
}

export const EMPTY_COSTS_CORE_STORE: CostsCoreStore = {
  productCosts: [],
  costMovements: [],
  productionOrderCosts: [],
  salesCosts: [],
};
