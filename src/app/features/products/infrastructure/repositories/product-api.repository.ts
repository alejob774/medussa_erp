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

@Injectable({
  providedIn: 'root',
})
export class ProductApiRepository implements ProductsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(ProductMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  getCatalogs(companyId: string): Observable<ProductCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listProducts(companyId: string, filters: ProductFilters): Observable<ProductListResponse> {
    return this.withFallback(
      () =>
        this.http
          .get<unknown>(this.withTrailingSlash(this.baseUrl), {
            params: this.buildListParams(companyId, filters),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listProducts(companyId, filters),
      'catálogo de productos',
    );
  }

  getProduct(companyId: string, productId: string): Observable<Product> {
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
    return this.withFallback(
      () => {
        const requestBody = mapProductPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (productId) {
          return this.resolveProductRequestId(companyId, productId).pipe(
            switchMap((requestProductId) =>
              this.http
                .put<BackendProductDto | void>(
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
        }

        return this.http
          .post<BackendProductDto>(this.withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((response) =>
              this.resolveSavedProduct(
                companyId,
                response,
                'created',
                payload.empresaNombre,
              ),
            ),
          );
      },
      () => this.mockRepository.saveProduct(companyId, payload, productId),
      productId ? 'actualización de producto' : 'creación de producto',
    );
  }

  deleteProduct(companyId: string, productId: string): Observable<ProductMutationResult> {
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
      'eliminación de producto',
    );
  }

  updateProductStatus(
    companyId: string,
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult> {
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

  private buildListParams(companyId: string, filters: ProductFilters): HttpParams {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const requestCompanyId = normalizedFilters.empresaId ?? companyId;
    let params = new HttpParams()
      .set('empresa_id', this.resolveRequestCompanyId(requestCompanyId))
      .set('page', String(normalizedFilters.page + 1))
      .set('page_size', String(normalizedFilters.pageSize));

    if (normalizedFilters.search) {
      params = params.set('search', normalizedFilters.search);
    }

    if (normalizedFilters.estado && normalizedFilters.estado !== 'TODOS') {
      params = params.set('estado', normalizedFilters.estado.toLowerCase());
    }

    if (normalizedFilters.familia) {
      params = params.set('familia', normalizedFilters.familia);
    }

    return params;
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: ProductFilters,
  ): ProductListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const products = extractArrayPayload<BackendProductDto>(payload)
      .map((product) =>
        mapBackendProductToProduct(product, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((product) => this.matchesFilters(product, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: products.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: this.resolveTotal(payload, products.length),
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
              .put<BackendProductDto | void>(
                `${this.withTrailingSlash(this.baseUrl)}${requestProductId}`,
                mapProductPayloadToBackend(this.buildStatusPayload(product, status), this.resolveRequestCompanyId(companyId)),
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
                      ? `Activación del producto ${product.nombre}.`
                      : `Inactivación del producto ${product.nombre}.`,
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
            ? 'El backend reportó que el producto fue inactivado por restricciones operativas.'
            : `El producto ${product.nombre} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          product,
          action === 'inactivated'
            ? `Inactivación del producto ${product.nombre} reportada por backend.`
            : `Eliminación del producto ${product.nombre}.`,
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
        `Eliminación del producto ${productId}.`,
        null,
        null,
      ),
    };
  }

  private resolveProductRequestId(companyId: string, productId: string): Observable<string> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.baseUrl), {
        params: new HttpParams()
          .set('empresa_id', this.resolveRequestCompanyId(companyId))
          .set('page', '1')
          .set('page_size', '500'),
      })
      .pipe(
        map((response) => {
          const product = extractArrayPayload<BackendProductDto>(response).find((candidate) =>
            this.matchesProductReference(candidate, productId),
          );

          return this.resolveNullableText(product?.id, product?.producto_id) ?? productId;
        }),
      );
  }

  private matchesProductReference(product: BackendProductDto, productId: string): boolean {
    const normalizedProductId = productId.trim();
    const candidates = [
      this.resolveNullableText(product.id),
      this.resolveNullableText(product.producto_id),
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

  private resolveTotal(payload: unknown, fallback: number): number {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const candidate = payload as { total?: number; count?: number };
      return candidate.total ?? candidate.count ?? fallback;
    }

    return fallback;
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
          ? `Creación del producto ${product.nombre}.`
          : `Actualización del producto ${product.nombre}.`,
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
          console.warn(`Se activó fallback mock para ${context}.`, error);
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
            'El backend reportó errores de validación para los datos enviados.',
        );
      }

      return new Error(
        this.extractBackendDetail(error) ||
          `No fue posible completar la operación de ${context}.`,
      );
    }

    return error instanceof Error
      ? error
      : new Error(`No fue posible completar la operación de ${context}.`);
  }
}