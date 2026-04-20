import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { DEFAULT_PRODUCT_FILTERS, ProductFilters } from '../../domain/models/product-filters.model';
import { SaveProductPayload } from '../../domain/models/product-form.model';
import { Product, ProductCatalogs, ProductStatus } from '../../domain/models/product.model';
import {
  ProductAuditDraft,
  ProductListResponse,
  ProductMutationAction,
  ProductMutationResult,
  ProductStore,
} from '../../domain/models/product-response.model';
import { ProductsRepository } from '../../domain/repositories/product.repository';
import { INITIAL_PRODUCTS_STORE } from '../data/products.mock';

@Injectable({
  providedIn: 'root',
})
export class ProductMockRepository implements ProductsRepository {
  private readonly storageKey = 'medussa.erp.mock.products';

  getCatalogs(companyId: string): Observable<ProductCatalogs> {
    const store = this.readStore();
    const companyProducts = store.products.filter((product) => product.empresaId === companyId);
    const families = new Set([...store.catalogs.families, ...companyProducts.map((product) => product.familia)]);
    const units = new Set([...store.catalogs.units, ...companyProducts.map((product) => product.unidadBase)]);

    return of({
      families: Array.from(families).sort().map((value) => ({ value, label: value })),
      units: Array.from(units).sort().map((value) => ({ value, label: value })),
    }).pipe(delay(120));
  }

  listProducts(companyId: string, filters: ProductFilters): Observable<ProductListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const products = this.readStore().products
      .map((product) => this.cloneProduct(product))
      .filter((product) => product.empresaId === normalizedFilters.empresaId)
      .filter((product) => this.matchesFilters(product, normalizedFilters))
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: products.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: products.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  getProduct(companyId: string, productId: string): Observable<Product> {
    const product = this.readStore().products.find(
      (item) => item.empresaId === companyId && item.id === productId,
    );

    if (!product) {
      return throwError(() => new Error('No se encontró el producto solicitado.'));
    }

    return of(this.cloneProduct(product)).pipe(delay(160));
  }

  saveProduct(
    companyId: string,
    payload: SaveProductPayload,
    productId?: string,
  ): Observable<ProductMutationResult> {
    const store = this.readStore();
    const currentProduct = productId
      ? store.products.find((product) => product.empresaId === companyId && product.id === productId)
      : undefined;

    const validationError = this.validatePayload(store, companyId, payload, productId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const nextProduct: Product = {
      id: currentProduct?.id ?? this.buildProductId(normalizedPayload.sku, normalizedPayload.nombre),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      nombre: normalizedPayload.nombre,
      descripcion: normalizedPayload.descripcion,
      sku: normalizedPayload.sku,
      familia: normalizedPayload.familia,
      unidadBase: normalizedPayload.unidadBase,
      referencia: normalizedPayload.referencia,
      manejaLote: normalizedPayload.manejaLote,
      manejaVencimiento: normalizedPayload.manejaVencimiento,
      vidaUtilDias: normalizedPayload.vidaUtilDias,
      factorConversion: normalizedPayload.factorConversion,
      precioBruto: normalizedPayload.precioBruto,
      precioNeto: normalizedPayload.precioNeto,
      estado: normalizedPayload.estado,
      tieneMovimientos: currentProduct?.tieneMovimientos ?? false,
      createdAt: currentProduct?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextProducts = currentProduct
      ? store.products.map((product) =>
          product.empresaId === companyId && product.id === currentProduct.id ? nextProduct : product,
        )
      : [nextProduct, ...store.products];
    const action: ProductMutationAction = currentProduct ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextProduct,
      action === 'created'
        ? `Creación del producto ${nextProduct.nombre}.`
        : `Actualización del producto ${nextProduct.nombre}.`,
      currentProduct ? sanitizeAuditPayload(currentProduct) : null,
      sanitizeAuditPayload(nextProduct),
    );

    this.writeStore({
      ...store,
      products: nextProducts,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of({
      action,
      product: this.cloneProduct(nextProduct),
      message:
        action === 'created'
          ? `El producto ${nextProduct.nombre} fue creado correctamente.`
          : `El producto ${nextProduct.nombre} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteProduct(companyId: string, productId: string): Observable<ProductMutationResult> {
    const store = this.readStore();
    const currentProduct = store.products.find(
      (product) => product.empresaId === companyId && product.id === productId,
    );

    if (!currentProduct) {
      return throwError(() => new Error('No se encontró el producto solicitado.'));
    }

    if (currentProduct.tieneMovimientos) {
      const nextProduct: Product = {
        ...this.cloneProduct(currentProduct),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextProduct,
        `Inactivación preventiva del producto ${nextProduct.nombre} por movimientos asociados.`,
        sanitizeAuditPayload(currentProduct),
        sanitizeAuditPayload(nextProduct),
      );

      this.writeStore({
        ...store,
        products: store.products.map((product) =>
          product.empresaId === companyId && product.id === productId ? nextProduct : product,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<ProductMutationResult>({
        action: 'inactivated',
        product: this.cloneProduct(nextProduct),
        message:
          'El producto tiene movimientos asociados y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentProduct,
      `Eliminación del producto ${currentProduct.nombre}.`,
      sanitizeAuditPayload(currentProduct),
      null,
    );

    this.writeStore({
      ...store,
      products: store.products.filter(
        (product) => !(product.empresaId === companyId && product.id === productId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<ProductMutationResult>({
      action: 'deleted',
      product: null,
      message: `El producto ${currentProduct.nombre} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateProductStatus(
    companyId: string,
    productId: string,
    status: ProductStatus,
  ): Observable<ProductMutationResult> {
    const store = this.readStore();
    const currentProduct = store.products.find(
      (product) => product.empresaId === companyId && product.id === productId,
    );

    if (!currentProduct) {
      return throwError(() => new Error('No se encontró el producto solicitado.'));
    }

    const nextProduct: Product = {
      ...this.cloneProduct(currentProduct),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: ProductMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextProduct,
      status === 'ACTIVO'
        ? `Activación del producto ${nextProduct.nombre}.`
        : `Inactivación del producto ${nextProduct.nombre}.`,
      sanitizeAuditPayload(currentProduct),
      sanitizeAuditPayload(nextProduct),
    );

    this.writeStore({
      ...store,
      products: store.products.map((product) =>
        product.empresaId === companyId && product.id === productId ? nextProduct : product,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of({
      action,
      product: this.cloneProduct(nextProduct),
      message:
        status === 'ACTIVO'
          ? `El producto ${nextProduct.nombre} fue activado.`
          : `El producto ${nextProduct.nombre} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): ProductStore {
    if (typeof window === 'undefined') {
      return normalizeProductStore(structuredClone(INITIAL_PRODUCTS_STORE));
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      const initialStore = normalizeProductStore(structuredClone(INITIAL_PRODUCTS_STORE));
      this.writeStore(initialStore);
      return initialStore;
    }

    try {
      const normalizedStore = normalizeProductStore(JSON.parse(raw) as ProductStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      const initialStore = normalizeProductStore(structuredClone(INITIAL_PRODUCTS_STORE));
      this.writeStore(initialStore);
      return initialStore;
    }
  }

  private writeStore(store: ProductStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: ProductStore,
    companyId: string,
    payload: SaveProductPayload,
    productId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!normalizedPayload.empresaNombre) {
      return 'No fue posible resolver el nombre de la empresa activa.';
    }

    if (!normalizedPayload.nombre) {
      return 'El nombre del producto es obligatorio.';
    }

    if (!normalizedPayload.descripcion) {
      return 'La descripción del producto es obligatoria.';
    }

    if (!normalizedPayload.sku) {
      return 'El SKU del producto es obligatorio.';
    }

    if (!normalizedPayload.familia) {
      return 'La familia del producto es obligatoria.';
    }

    if (!normalizedPayload.unidadBase) {
      return 'La unidad base del producto es obligatoria.';
    }

    if (normalizedPayload.manejaVencimiento && !normalizedPayload.vidaUtilDias) {
      return 'La vida útil es obligatoria cuando el producto maneja vencimiento.';
    }

    const shelfLife = normalizedPayload.vidaUtilDias ?? null;
    const factorConversion = normalizedPayload.factorConversion ?? null;
    const grossPrice = normalizedPayload.precioBruto ?? null;
    const netPrice = normalizedPayload.precioNeto ?? null;

    if (shelfLife !== null && shelfLife <= 0) {
      return 'La vida útil debe ser mayor que cero.';
    }

    if (factorConversion !== null && factorConversion <= 0) {
      return 'El factor de conversión debe ser mayor que cero.';
    }

    if (grossPrice !== null && grossPrice < 0) {
      return 'El precio bruto no puede ser negativo.';
    }

    if (netPrice !== null && netPrice < 0) {
      return 'El precio neto no puede ser negativo.';
    }

    const duplicatedSku = store.products.some(
      (product) =>
        product.empresaId === companyId &&
        product.id !== productId &&
        normalizeValue(product.sku) === normalizeValue(normalizedPayload.sku),
    );

    if (duplicatedSku) {
      return 'Ya existe un producto con ese SKU en la empresa activa.';
    }

    return null;
  }

  private matchesFilters(
    product: Product,
    filters: Required<ProductFilters>,
  ): boolean {
    const normalizedSearch = normalizeValue(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        product.sku,
        product.nombre,
        product.descripcion,
        product.familia,
        product.referencia ?? '',
        product.unidadBase,
      ].some((value) => normalizeValue(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || product.estado === filters.estado;
    const matchesFamily = !filters.familia || product.familia === filters.familia;

    return matchesSearch && matchesStatus && matchesFamily;
  }

  private cloneProduct(product: Product): Product {
    return {
      ...product,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private buildProductId(sku: string, nombre: string): string {
    const source = sku || nombre;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `product-${slug}` : `product-${Date.now()}`;
  }
}

function normalizeFilters(
  filters: ProductFilters,
  companyId: string,
): Required<ProductFilters> {
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

function normalizePayload(payload: SaveProductPayload, companyId: string): SaveProductPayload {
  const vidaUtilDias = payload.manejaVencimiento ? payload.vidaUtilDias ?? null : null;

  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    nombre: payload.nombre.trim(),
    familia: payload.familia.trim(),
    descripcion: payload.descripcion.trim(),
    sku: payload.sku.trim().toUpperCase(),
    referencia: payload.referencia?.trim() || null,
    unidadBase: payload.unidadBase.trim(),
    manejaLote: payload.manejaLote,
    manejaVencimiento: payload.manejaVencimiento,
    vidaUtilDias,
    factorConversion: payload.factorConversion ?? null,
    precioBruto: payload.precioBruto ?? null,
    precioNeto: payload.precioNeto ?? null,
    estado: payload.estado,
  };
}

function buildAuditDraft(
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

function sanitizeAuditPayload(product: Product): Record<string, unknown> {
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

function normalizeValue(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeProductStore(store: ProductStore): ProductStore {
  const initialProductsById = new Map(INITIAL_PRODUCTS_STORE.products.map((product) => [product.id, product]));
  const mergedProducts = new Map<string, Product>();
  const families = new Set([...(INITIAL_PRODUCTS_STORE.catalogs.families ?? []), ...(store.catalogs?.families ?? [])]);
  const units = new Set([...(INITIAL_PRODUCTS_STORE.catalogs.units ?? []), ...(store.catalogs?.units ?? [])]);

  INITIAL_PRODUCTS_STORE.products.forEach((product) => {
    mergedProducts.set(product.id, structuredClone(product));
  });

  (store.products ?? []).forEach((product) => {
    const baseline = initialProductsById.get(product.id);

    mergedProducts.set(product.id, {
      ...(baseline ? structuredClone(baseline) : {}),
      ...product,
    });
  });

  return {
    catalogs: {
      families: Array.from(families),
      units: Array.from(units),
    },
    products: Array.from(mergedProducts.values()).map((product) => ({
      ...product,
      empresaNombre: resolveCompanyDisplayName(product.empresaId, product.empresaNombre),
      updatedAt: product.updatedAt ?? product.createdAt ?? new Date().toISOString(),
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function resolveCompanyDisplayName(companyId: string, currentName?: string | null): string {
  if (companyId === 'medussa-holding') {
    return 'Industrias Alimenticias El Arbolito';
  }

  if (companyId === 'medussa-retail') {
    return 'Medussa Holding';
  }

  return currentName?.trim() || 'Empresa activa';
}
