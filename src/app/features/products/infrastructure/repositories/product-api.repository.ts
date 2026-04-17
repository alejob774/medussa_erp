import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendProductDto,
  extractArrayPayload,
  mapBackendProductToProduct,
  mapProductPayloadToBackend,
  normalizeText,
} from '../../application/mappers/product.mapper';
import { DEFAULT_PRODUCT_FILTERS, ProductFilters } from '../../domain/models/product-filters.model';
import { SaveProductPayload } from '../../domain/models/product-form.model';
import { Product, ProductCatalogs, ProductStatus } from '../../domain/models/product.model';
import {
  ProductAuditDraft,
  ProductListResponse,
  ProductMutationAction,
  ProductMutationResult,
} from '../../domain/models/product-response.model';
import { ProductsRepository } from '../../domain/repositories/product.repository';
import { ProductMockRepository } from './product-mock.repository';

interface ProductShadowRecord {
  deleted: boolean;
  product: Product;
  productId: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductApiRepository implements ProductsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(ProductMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/productos`;
  private readonly shadowStorageKey = 'medussa.erp.products.api-shadow';

  getCatalogs(companyId: string): Observable<ProductCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listProducts(companyId: string, filters: ProductFilters): Observable<ProductListResponse> {
    return this.withFallback(
      () =>
        this.http
          .get<unknown>(this.withTrailingSlash(this.baseUrl), {
            params: this.buildListParams(companyId),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listProducts(companyId, filters),
      'catÃ¡logo de productos',
    );
  }

  getProduct(companyId: string, productId: string): Observable<Product> {
    const shadowProduct = this.getShadowProduct(productId);

    if (shadowProduct?.empresaId === companyId) {
      return of({ ...shadowProduct });
    }

    return this.withFallback(
      () => this.loadProduct(companyId, productId),
      () => this.mockRepository.getProduct(companyId, productId),
      'producto',
    );
  }

  saveProduct(
    companyId: string,
    payload: SaveProductPayload,
    productId?: string,
  ): Observable<ProductMutationResult> {
    if (!productId) {
      return of(this.createShadowProduct(companyId, payload));
    }

    const shadowProduct = this.getShadowProduct(productId);

    if (shadowProduct?.empresaId === companyId) {
      return of(this.updateShadowProduct(companyId, productId, payload));
    }

    return this.withFallback(
      () => {
        const requestBody = mapProductPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        return this.resolveProductRequestId(companyId, productId).pipe(
          switchMap((requestProductId) =>
            this.http
              .patch<BackendProductDto | void>(
                `${this.withTrailingSlash(this.baseUrl)}${requestProductId}`,
                requestBody,
              )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedProduct(
                    companyId,
                    response,
                    'updated',
                    payload.empresaNombre,
                    productId,
                    requestProductId,
                  ),
                ),
              ),
          ),
        );
      },
      () => this.mockRepository.saveProduct(companyId, payload, productId),
      'actualizaciÃ³n de producto',
    );
  }

  deleteProduct(companyId: string, productId: string): Observable<ProductMutationResult> {
    const shadowProduct = this.getShadowProduct(productId);

    if (shadowProduct?.empresaId === companyId) {
      return of(this.deleteShadowProduct(shadowProduct));
    }

    return this.withFallback(
      () =>
        this.resolveProductRequestId(companyId, productId).pipe(
          switchMap((requestProductId) =>
            this.http
              .delete<unknown>(`${this.withTrailingSlash(this.baseUrl)}${requestProductId}`)
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, productId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, productId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteProduct(companyId, productId),
      'eliminaciÃ³n de producto',
    );
  }

  updateProductStatus(
    companyId: string,
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult> {
    const shadowProduct = this.getShadowProduct(productId);

    if (shadowProduct?.empresaId === companyId) {
      return of(this.updateShadowProductStatus(shadowProduct, status));
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, productId, status),
      () => this.mockRepository.updateProductStatus(companyId, productId, status),
      'estado de producto',
    );
  }

  private loadProduct(companyId: string, productId: string): Observable<Product> {
    return this.resolveProductRequestId(companyId, productId).pipe(
      switchMap((requestProductId) =>
        this.http
          .get<BackendProductDto>(`${this.withTrailingSlash(this.baseUrl)}${requestProductId}`)
          .pipe(
            map((product) =>
              mapBackendProductToProduct(
                product,
                companyId,
                this.resolveCompanyName(companyId),
              ),
            ),
          ),
      ),
    );
  }

  private buildListParams(companyId: string): HttpParams {
    return new HttpParams()
      .set('empresa_id', this.resolveRequestCompanyId(companyId))
      .set('skip', '0')
      .set('limit', '500');
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: ProductFilters,
  ): ProductListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const products = this.mergeProductsWithShadow(
      companyId,
      extractArrayPayload<BackendProductDto>(payload).map((product) =>
        mapBackendProductToProduct(product, companyId, this.resolveCompanyName(companyId)),
      ),
    ).filter((product) => this.matchesFilters(product, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: products.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: products.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedProduct(
    companyId: string,
    response: BackendProductDto | void,
    action: Extract<ProductMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<ProductMutationResult> {
    if (response) {
      const product = mapBackendProductToProduct(response, companyId, companyName);
      return of(this.buildMutationResult(action, product));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el producto guardado.'));
    }

    return this.loadProduct(companyId, candidateId).pipe(
      map((product) => this.buildMutationResult(action, product)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult> {
    return this.loadProduct(companyId, productId).pipe(
      switchMap((product) =>
        this.resolveProductRequestId(companyId, productId).pipe(
          switchMap((requestProductId) =>
            this.http
              .patch<BackendProductDto | void>(
                `${this.withTrailingSlash(this.baseUrl)}${requestProductId}`,
                mapProductPayloadToBackend(
                  this.buildStatusPayload(product, status),
                  this.resolveRequestCompanyId(companyId),
                ),
              )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedProduct(
                    companyId,
                    response,
                    'updated',
                    product.empresaNombre,
                    product.id,
                    requestProductId,
                  ),
                ),
                map((result): ProductMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El producto ${result.product?.nombre ?? product.nombre} fue activado.`
                      : `El producto ${result.product?.nombre ?? product.nombre} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.product ?? { ...product, estado: status },
                    status === 'ACTIVO'
                      ? `ActivaciÃ³n del producto ${product.nombre}.`
                      : `InactivaciÃ³n del producto ${product.nombre}.`,
                    this.sanitizeAuditPayload(product),
                    this.sanitizeAuditPayload(result.product ?? { ...product, estado: status }),
                  ),
                })),
              ),
          ),
        ),
      ),
    );
  }

  private buildStatusPayload(product: Product, status: ProductStatus): SaveProductPayload {
    return {
      empresaId: product.empresaId,
      empresaNombre: product.empresaNombre,
      nombre: product.nombre,
      familia: product.familia,
      descripcion: product.descripcion,
      sku: product.sku,
      referencia: product.referencia ?? null,
      unidadBase: product.unidadBase,
      manejaLote: product.manejaLote,
      manejaVencimiento: product.manejaVencimiento,
      vidaUtilDias: product.manejaVencimiento ? product.vidaUtilDias ?? null : null,
      factorConversion: product.factorConversion ?? null,
      precioBruto: product.precioBruto ?? null,
      precioNeto: product.precioNeto ?? null,
      estado: status,
    };
  }

  private mapDeleteResponse(
    companyId: string,
    productId: string,
    response: unknown,
  ): ProductMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const product = mapBackendProductToProduct(
        response as BackendProductDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: ProductMutationAction = product.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        product: action === 'deleted' ? null : product,
        message:
          action === 'inactivated'
            ? 'El backend reportÃ³ que el producto fue inactivado por restricciones operativas.'
            : `El producto ${product.nombre} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          product,
          action === 'inactivated'
            ? `InactivaciÃ³n del producto ${product.nombre} reportada por backend.`
            : `EliminaciÃ³n del producto ${product.nombre}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(product),
        ),
      };
    }

    const auditProduct: Product = {
      id: productId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      nombre: 'Producto eliminado',
      descripcion: '',
      sku: productId,
      familia: '',
      unidadBase: 'UND',
      manejaLote: false,
      manejaVencimiento: false,
      vidaUtilDias: null,
      factorConversion: null,
      precioBruto: null,
      precioNeto: null,
      estado: 'INACTIVO',
      tieneMovimientos: false,
    };

    return {
      action: 'deleted',
      product: null,
      message: 'El producto fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft(
        'delete',
        auditProduct,
        `EliminaciÃ³n del producto ${productId}.`,
        null,
        null,
      ),
    };
  }

  private resolveProductRequestId(companyId: string, productId: string): Observable<string> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.baseUrl), {
        params: this.buildListParams(companyId),
      })
      .pipe(
        map((response) => {
          const product = extractArrayPayload<BackendProductDto>(response).find((candidate) =>
            this.matchesProductReference(candidate, productId),
          );

          return this.resolveNullableText(
            product?.id,
            product?.producto_id,
            product?.producto_sku,
            product?.sku,
          ) ?? productId;
        }),
      );
  }

  private matchesProductReference(product: BackendProductDto, productId: string): boolean {
    const normalizedProductId = productId.trim();
    const candidates = [
      this.resolveNullableText(product.id),
      this.resolveNullableText(product.producto_id),
      this.resolveNullableText(product.producto_sku),
      this.resolveNullableText(product.sku),
    ];

    return candidates.includes(normalizedProductId);
  }

  private normalizeFilters(filters: ProductFilters, companyId: string): Required<ProductFilters> {
    return {
      ...DEFAULT_PRODUCT_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      familia: filters.familia ?? null,
      search: filters.search?.trim() ?? '',
      page: filters.page ?? DEFAULT_PRODUCT_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_PRODUCT_FILTERS.pageSize,
    };
  }

  private matchesFilters(product: Product, filters: Required<ProductFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        product.sku,
        product.nombre,
        product.descripcion,
        product.familia,
        product.referencia ?? '',
        product.unidadBase,
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || product.estado === filters.estado;
    const matchesFamily = !filters.familia || product.familia === filters.familia;

    return matchesSearch && matchesStatus && matchesFamily;
  }

  private resolveCompanyName(companyId: string): string {
    return (
      this.authSessionService
        .getSession()
        ?.companies?.find(
          (company) => company.id === companyId || company.backendId === companyId,
        )?.name ?? 'Empresa activa'
    );
  }

  private resolveRequestCompanyId(companyId: string): string {
    const session = this.authSessionService.getSession();
    const company = session?.companies?.find((candidate) => candidate.id === companyId);

    if (company?.backendId) {
      return company.backendId;
    }

    if (session?.activeCompanyId === companyId && session.activeBackendCompanyId) {
      return session.activeBackendCompanyId;
    }

    return companyId;
  }

  private createShadowProduct(
    companyId: string,
    payload: SaveProductPayload,
  ): ProductMutationResult {
    const companyName = payload.empresaNombre.trim() || this.resolveCompanyName(companyId);
    const product = this.buildShadowProduct(companyId, payload, undefined, companyName);

    this.upsertShadowProduct(product);

    return {
      action: 'created',
      product,
      message:
        `El producto ${product.nombre} fue guardado localmente mientras el backend no expone creación.`,
      auditDraft: this.buildAuditDraft(
        'create',
        product,
        `Creación local del producto ${product.nombre} por ausencia de POST en backend.`,
        null,
        this.sanitizeAuditPayload(product),
      ),
    };
  }

  private updateShadowProduct(
    companyId: string,
    productId: string,
    payload: SaveProductPayload,
  ): ProductMutationResult {
    const currentProduct = this.getShadowProduct(productId) ?? undefined;
    const companyName = payload.empresaNombre.trim() || this.resolveCompanyName(companyId);
    const product = this.buildShadowProduct(companyId, payload, currentProduct, companyName, productId);

    this.upsertShadowProduct(product);

    return {
      action: 'updated',
      product,
      message: `El producto ${product.nombre} fue actualizado localmente.`,
      auditDraft: this.buildAuditDraft(
        'edit',
        product,
        `Actualización local del producto ${product.nombre}.`,
        currentProduct ? this.sanitizeAuditPayload(currentProduct) : null,
        this.sanitizeAuditPayload(product),
      ),
    };
  }

  private deleteShadowProduct(product: Product): ProductMutationResult {
    this.upsertShadowRecord({
      deleted: true,
      product,
      productId: product.id,
      updatedAt: new Date().toISOString(),
    });

    return {
      action: 'deleted',
      product: null,
      message: `El producto ${product.nombre} fue eliminado del overlay local.`,
      auditDraft: this.buildAuditDraft(
        'delete',
        product,
        `Eliminación local del producto ${product.nombre}.`,
        this.sanitizeAuditPayload(product),
        null,
      ),
    };
  }

  private updateShadowProductStatus(
    product: Product,
    status: ProductStatus,
  ): ProductMutationResult {
    const updatedProduct: Product = {
      ...product,
      estado: status,
      updatedAt: new Date().toISOString(),
    };

    this.upsertShadowProduct(updatedProduct);

    return {
      action: status === 'ACTIVO' ? 'activated' : 'inactivated',
      product: updatedProduct,
      message:
        status === 'ACTIVO'
          ? `El producto ${updatedProduct.nombre} fue activado localmente.`
          : `El producto ${updatedProduct.nombre} fue inactivado localmente.`,
      auditDraft: this.buildAuditDraft(
        status === 'ACTIVO' ? 'activate' : 'deactivate',
        updatedProduct,
        status === 'ACTIVO'
          ? `Activación local del producto ${updatedProduct.nombre}.`
          : `Inactivación local del producto ${updatedProduct.nombre}.`,
        this.sanitizeAuditPayload(product),
        this.sanitizeAuditPayload(updatedProduct),
      ),
    };
  }

  private buildShadowProduct(
    companyId: string,
    payload: SaveProductPayload,
    currentProduct?: Product,
    companyName?: string,
    explicitProductId?: string,
  ): Product {
    return {
      id:
        explicitProductId ??
        currentProduct?.id ??
        `local-product-${payload.sku.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now()}`,
      empresaId: companyId,
      empresaNombre: companyName ?? this.resolveCompanyName(companyId),
      nombre: payload.nombre.trim(),
      descripcion: payload.descripcion.trim(),
      sku: payload.sku.trim().toUpperCase(),
      familia: payload.familia.trim(),
      unidadBase: payload.unidadBase.trim(),
      referencia: payload.referencia?.trim() || null,
      manejaLote: payload.manejaLote,
      manejaVencimiento: payload.manejaVencimiento,
      vidaUtilDias: payload.manejaVencimiento ? payload.vidaUtilDias ?? null : null,
      factorConversion: payload.factorConversion ?? null,
      precioBruto: payload.precioBruto ?? null,
      precioNeto: payload.precioNeto ?? null,
      estado: payload.estado,
      tieneMovimientos: currentProduct?.tieneMovimientos ?? false,
      createdAt: currentProduct?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private mergeProductsWithShadow(
    companyId: string,
    apiProducts: readonly Product[],
  ): Product[] {
    const mergedProducts = new Map<string, Product>(apiProducts.map((product) => [product.id, product]));

    this.listShadowRecordsForCompany(companyId).forEach((shadow) => {
      if (shadow.deleted) {
        mergedProducts.delete(shadow.productId);
        return;
      }

      mergedProducts.set(shadow.productId, shadow.product);
    });

    return Array.from(mergedProducts.values()).sort((left, right) =>
      left.nombre.localeCompare(right.nombre, 'es-CO'),
    );
  }

  private getShadowProduct(productId: string): Product | null {
    const shadowRecord = this.readShadowStore()[productId];

    if (!shadowRecord || shadowRecord.deleted) {
      return null;
    }

    return shadowRecord.product;
  }

  private listShadowRecordsForCompany(companyId: string): ProductShadowRecord[] {
    return Object.values(this.readShadowStore()).filter(
      (record) => record.product.empresaId === companyId,
    );
  }

  private readShadowStore(): Record<string, ProductShadowRecord> {
    if (typeof window === 'undefined') {
      return {};
    }

    const raw = localStorage.getItem(this.shadowStorageKey);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, ProductShadowRecord>;
    } catch {
      localStorage.removeItem(this.shadowStorageKey);
      return {};
    }
  }

  private writeShadowStore(store: Record<string, ProductShadowRecord>): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.shadowStorageKey, JSON.stringify(store));
  }

  private upsertShadowProduct(product: Product): void {
    this.upsertShadowRecord({
      deleted: false,
      product,
      productId: product.id,
      updatedAt: new Date().toISOString(),
    });
  }

  private upsertShadowRecord(record: ProductShadowRecord): void {
    const store = this.readShadowStore();
    store[record.productId] = record;
    this.writeShadowStore(store);
  }

  private shouldInactivateInstead(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const detail = this.extractBackendDetail(error).toLowerCase();
    return error.status === 409 || detail.includes('movim') || detail.includes('inactiv');
  }

  private buildMutationResult(
    action: Extract<ProductMutationAction, 'created' | 'updated'>,
    product: Product,
  ): ProductMutationResult {
    return {
      action,
      product,
      message:
        action === 'created'
          ? `El producto ${product.nombre} fue creado correctamente.`
          : `El producto ${product.nombre} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        product,
        action === 'created'
          ? `CreaciÃ³n del producto ${product.nombre}.`
          : `ActualizaciÃ³n del producto ${product.nombre}.`,
        null,
        this.sanitizeAuditPayload(product),
      ),
    };
  }

  private buildAuditDraft(
    action: ProductAuditDraft['action'],
    product: Product,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): ProductAuditDraft {
    return {
      module: 'productos',
      action,
      companyId: product.empresaId,
      companyName: product.empresaNombre,
      entityId: product.id,
      entityName: product.nombre,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(product: Product): Record<string, unknown> {
    return {
      id: product.id,
      empresaId: product.empresaId,
      nombre: product.nombre,
      sku: product.sku,
      familia: product.familia,
      unidadBase: product.unidadBase,
      manejaLote: product.manejaLote,
      manejaVencimiento: product.manejaVencimiento,
      vidaUtilDias: product.vidaUtilDias ?? null,
      factorConversion: product.factorConversion ?? null,
      precioBruto: product.precioBruto ?? null,
      precioNeto: product.precioNeto ?? null,
      estado: product.estado,
      tieneMovimientos: product.tieneMovimientos,
    };
  }

  private resolveNullableText(...values: Array<number | string | null | undefined>): string | null {
    for (const value of values) {
      if (typeof value === 'number') {
        return String(value);
      }

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractBackendDetail(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return '';
  }

  private withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context: string,
  ): Observable<T> {
    return operation().pipe(
      catchError((error: unknown) => {
        if (environment.enableProductsAdministrationFallback && this.shouldFallbackToMock(error)) {
          console.warn(`Se activÃ³ fallback mock para ${context}.`, error);
          return fallback();
        }

        return throwError(() => this.mapHttpError(error, context));
      }),
    );
  }

  private shouldFallbackToMock(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return true;
    }

    return [0, 404, 405, 500, 501, 502, 503, 504].includes(error.status);
  }

  private mapHttpError(error: unknown, context: string): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return new Error('No tienes permisos para operar productos en la empresa activa.');
      }

      if (error.status === 422) {
        return new Error(
          this.extractBackendDetail(error) ||
            'El backend reportÃ³ errores de validaciÃ³n para los datos enviados.',
        );
      }

      return new Error(
        this.extractBackendDetail(error) ||
          `No fue posible completar la operaciÃ³n de ${context}.`,
      );
    }

    return error instanceof Error
      ? error
      : new Error(`No fue posible completar la operaciÃ³n de ${context}.`);
  }
}
