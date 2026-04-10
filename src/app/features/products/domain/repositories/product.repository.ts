import { Observable } from 'rxjs';
import { ProductFilters } from '../models/product-filters.model';
import { SaveProductPayload } from '../models/product-form.model';
import { ProductCatalogs, ProductStatus, Product } from '../models/product.model';
import { ProductListResponse, ProductMutationResult } from '../models/product-response.model';

export interface ProductsRepository {
  getCatalogs(companyId: string): Observable<ProductCatalogs>;
  listProducts(companyId: string, filters: ProductFilters): Observable<ProductListResponse>;
  getProduct(companyId: string, productId: string): Observable<Product>;
  saveProduct(
    companyId: string,
    payload: SaveProductPayload,
    productId?: string,
  ): Observable<ProductMutationResult>;
  deleteProduct(companyId: string, productId: string): Observable<ProductMutationResult>;
  updateProductStatus(
    companyId: string,
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult>;
}