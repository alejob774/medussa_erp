import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, map, distinctUntilChanged } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { DEFAULT_PRODUCT_FILTERS, ProductFilters } from '../../../domain/models/product-filters.model';
import { ProductFormMode, SaveProductPayload } from '../../../domain/models/product-form.model';
import {
  EMPTY_PRODUCT_CATALOGS,
  Product,
  ProductCatalogs,
  ProductStatus,
} from '../../../domain/models/product.model';
import {
  EMPTY_PRODUCT_LIST_RESPONSE,
  ProductListResponse,
} from '../../../domain/models/product-response.model';
import { ProductsFacadeService } from '../../../application/facade/products.facade';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { ProductsListComponent } from '../../components/products-list/products-list.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ProductFormComponent,
    ProductsListComponent,
  ],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
})
export class ProductsPageComponent {
  private readonly productsFacade = inject(ProductsFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: ProductCatalogs = EMPTY_PRODUCT_CATALOGS;
  listResponse: ProductListResponse = EMPTY_PRODUCT_LIST_RESPONSE;
  validationProducts: Product[] = [];
  selectedProduct: Product | null = null;
  formMode: ProductFormMode = 'create';
  filters: ProductFilters = { ...DEFAULT_PRODUCT_FILTERS };
  loadingCatalogs = true;
  loadingProducts = true;
  loadingSelection = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.productsFacade.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.activeCompanyId = company.id;
        this.activeCompanyName = company.name;
        this.filters = {
          ...DEFAULT_PRODUCT_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationProducts();
        this.loadProducts(this.filters);
      });
  }

  get totalProducts(): number {
    return this.listResponse.total;
  }

  get activeProducts(): number {
    return this.listResponse.items.filter((product) => product.estado === 'ACTIVO').length;
  }

  get inactiveProducts(): number {
    return this.listResponse.items.filter((product) => product.estado === 'INACTIVO').length;
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection();
  }

  handleFiltersChange(filters: ProductFilters): void {
    this.loadProducts({
      ...this.filters,
      ...filters,
      empresaId: this.activeCompanyId,
    });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadProducts({
      ...this.filters,
      page: event.page,
      pageSize: event.pageSize,
      empresaId: this.activeCompanyId,
    });
  }

  handleSelectProduct(product: Product): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadProduct(product.id, 'view');
  }

  handleEditProduct(product: Product): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadProduct(product.id, 'edit');
  }

  enableEditMode(): void {
    if (!this.selectedProduct) {
      return;
    }

    this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedProduct) {
      this.formMode = 'view';
      return;
    }

    this.resetSelection();
  }

  saveProduct(payload: SaveProductPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.productsFacade
      .saveProduct(payload, this.formMode === 'edit' ? this.selectedProduct?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedProduct = result.product;
          this.formMode = result.product ? 'view' : 'create';
          this.loadValidationProducts();
          this.loadProducts(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el producto.');
        },
      });
  }

  deleteProduct(product: Product): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        product.tieneMovimientos
          ? 'El producto tiene movimientos asociados y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el producto ${product.nombre}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    this.deletingId = product.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.productsFacade
      .deleteProduct(product.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedProduct?.id === product.id) {
            if (result.product) {
              this.selectedProduct = result.product;
              this.formMode = 'view';
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationProducts();
          this.loadProducts(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del producto.');
        },
      });
  }

  toggleProductStatus(product: Product): void {
    const nextStatus: ProductStatus = product.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = product.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.productsFacade
      .updateProductStatus(product.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedProduct?.id === product.id && result.product) {
            this.selectedProduct = result.product;
          }

          this.loadValidationProducts();
          this.loadProducts(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del producto.');
        },
      });
  }

  retryProducts(): void {
    this.loadProducts(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.productsFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_PRODUCT_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los catálogos de productos.',
          );
        },
      });
  }

  private loadProducts(filters: ProductFilters, clearMessages = true): void {
    this.loadingProducts = true;
    this.filters = {
      ...DEFAULT_PRODUCT_FILTERS,
      ...filters,
      empresaId: this.activeCompanyId,
    };

    if (clearMessages) {
      this.errorMessage = '';
    }

    this.productsFacade
      .listProducts(this.filters)
      .pipe(finalize(() => (this.loadingProducts = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;

          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadProducts({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = {
            ...EMPTY_PRODUCT_LIST_RESPONSE,
            filters: this.filters,
          };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los productos.');
        },
      });
  }

  private loadValidationProducts(): void {
    this.productsFacade
      .listProducts({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        familia: null,
        search: '',
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationProducts = response.items;
        },
        error: () => {
          this.validationProducts = this.listResponse.items;
        },
      });
  }

  private loadProduct(productId: string, mode: ProductFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.productsFacade
      .getProduct(productId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (product) => {
          this.selectedProduct = product;
          this.formMode = mode;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el producto seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true): void {
    this.selectedProduct = null;
    this.formMode = 'create';
    this.loadingSelection = false;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de productos. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}