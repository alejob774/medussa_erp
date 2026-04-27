import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { InventoryMovement } from '../../../inventory-core/domain/models/inventory-movement.model';
import { CostMovement, CostMovementFilters } from '../../domain/models/cost-movement.model';
import { ProductCost } from '../../domain/models/product-cost.model';
import { ProductionOrderCost } from '../../domain/models/production-order-cost.model';
import { ProductMargin } from '../../domain/models/sales-cost.model';
import { CostsCoreRepository, ProductCostLookup } from '../../domain/repositories/costs-core.repository';

@Injectable({
  providedIn: 'root',
})
export class CostsCoreApiRepository implements CostsCoreRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/costs-core`;

  getCurrentProductCost(
    companyId: string,
    lookup: ProductCostLookup,
  ): Observable<ProductCost | null> {
    return this.http.get<ProductCost | null>(`${this.baseUrl}/${companyId}/product-cost`, {
      params: this.cleanParams(lookup),
    });
  }

  getCostMovements(
    companyId: string,
    filters: CostMovementFilters,
  ): Observable<CostMovement[]> {
    return this.http.get<CostMovement[]>(`${this.baseUrl}/${companyId}/movements`, {
      params: this.cleanParams(filters),
    });
  }

  registerCostFromInventoryMovement(
    companyId: string,
    movement: InventoryMovement,
  ): Observable<CostMovement | null> {
    return this.http.post<CostMovement | null>(`${this.baseUrl}/${companyId}/inventory-movements`, movement);
  }

  recalculateAverageCost(
    companyId: string,
    productId: string,
  ): Observable<ProductCost | null> {
    return this.http.post<ProductCost | null>(`${this.baseUrl}/${companyId}/product-cost/${productId}/average`, {});
  }

  getProductionOrderCost(
    companyId: string,
    opId: string,
  ): Observable<ProductionOrderCost | null> {
    return this.http.get<ProductionOrderCost | null>(`${this.baseUrl}/${companyId}/production-orders/${opId}`);
  }

  getProductMargin(
    companyId: string,
    productId: string,
  ): Observable<ProductMargin | null> {
    return this.http.get<ProductMargin | null>(`${this.baseUrl}/${companyId}/products/${productId}/margin`);
  }

  private cleanParams(filters: object): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {});
  }
}
