import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { RoutesFacadeService } from '../../../application/facade/routes.facade';
import { DEFAULT_ROUTE_FILTERS, RouteFilters } from '../../../domain/models/route-filters.model';
import { RouteFormMode, SaveRoutePayload } from '../../../domain/models/route-form.model';
import { EMPTY_ROUTE_CATALOGS, Route, RouteCatalogs, RouteStatus } from '../../../domain/models/route.model';
import { EMPTY_ROUTE_LIST_RESPONSE, RouteListResponse } from '../../../domain/models/route-response.model';
import { RouteFormComponent } from '../../components/route-form/route-form.component';
import { RoutesListComponent } from '../../components/routes-list/routes-list.component';

@Component({
  selector: 'app-routes-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouteFormComponent,
    RoutesListComponent,
  ],
  templateUrl: './routes-page.component.html',
  styleUrl: './routes-page.component.scss',
})
export class RoutesPageComponent {
  private readonly routesFacade = inject(RoutesFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: RouteCatalogs = EMPTY_ROUTE_CATALOGS;
  listResponse: RouteListResponse = EMPTY_ROUTE_LIST_RESPONSE;
  validationRoutes: Route[] = [];
  selectedRoute: Route | null = null;
  formMode: RouteFormMode = 'create';
  isFormVisible = false;
  filters: RouteFilters = { ...DEFAULT_ROUTE_FILTERS };
  loadingCatalogs = true;
  loadingRoutes = true;
  loadingSelection = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.routesFacade.activeCompany$
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
          ...DEFAULT_ROUTE_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationRoutes();
        this.loadRoutes(this.filters);
      });
  }

  get totalRoutes(): number {
    return this.validationRoutes.length;
  }

  get activeRoutes(): number {
    return this.validationRoutes.filter((route) => route.estado === 'ACTIVO').length;
  }

  get inactiveRoutes(): number {
    return this.validationRoutes.filter((route) => route.estado === 'INACTIVO').length;
  }

  get totalAssignedClients(): number {
    return this.validationRoutes.reduce((total, route) => total + route.cantidadClientesAsignados, 0);
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection(true, true);
  }

  handleFiltersChange(filters: RouteFilters): void {
    this.loadRoutes({ ...this.filters, ...filters, empresaId: this.activeCompanyId });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadRoutes({ ...this.filters, page: event.page, pageSize: event.pageSize, empresaId: this.activeCompanyId });
  }

  handleSelectRoute(route: Route): void {
    if (!this.confirmDiscard()) return;
    this.loadRoute(route.id, 'view');
  }

  handleEditRoute(route: Route): void {
    if (!this.confirmDiscard()) return;
    this.loadRoute(route.id, 'edit');
  }

  enableEditMode(): void {
    if (this.selectedRoute) this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedRoute) {
      this.formMode = 'view';
      this.isFormVisible = true;
      return;
    }

    this.resetSelection();
  }

  closeForm(): void {
    if (!this.confirmDiscard()) return;
    this.resetSelection();
  }

  saveRoute(payload: SaveRoutePayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.routesFacade
      .saveRoute(payload, this.formMode === 'edit' ? this.selectedRoute?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedRoute = result.route;
          this.formMode = result.route ? 'view' : 'create';
          this.isFormVisible = false;
          this.loadValidationRoutes();
          this.loadRoutes(this.buildPostSaveFilters(result.route, result.action), false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar la ruta.');
        },
      });
  }

  deleteRoute(route: Route): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        route.tieneDependenciasActivas
          ? 'La ruta tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar la ruta ${route.nombreRuta}?`,
      );

      if (!confirmed) return;
    }

    this.deletingId = route.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.routesFacade
      .deleteRoute(route.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedRoute?.id === route.id) {
            if (result.route) {
              this.selectedRoute = result.route;
              this.formMode = 'view';
              this.isFormVisible = false;
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationRoutes();
          this.loadRoutes(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación de la ruta.');
        },
      });
  }

  toggleRouteStatus(route: Route): void {
    const nextStatus: RouteStatus = route.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = route.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.routesFacade
      .updateRouteStatus(route.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          if (this.selectedRoute?.id === route.id && result.route) {
            this.selectedRoute = result.route;
          }
          this.loadValidationRoutes();
          this.loadRoutes(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado de la ruta.');
        },
      });
  }

  retryRoutes(): void {
    this.loadRoutes(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.routesFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_ROUTE_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los catálogos de rutas.');
        },
      });
  }

  private loadRoutes(filters: RouteFilters, clearMessages = true): void {
    this.loadingRoutes = true;
    this.filters = { ...DEFAULT_ROUTE_FILTERS, ...filters, empresaId: this.activeCompanyId };

    if (clearMessages) this.errorMessage = '';

    this.routesFacade
      .listRoutes(this.filters)
      .pipe(finalize(() => (this.loadingRoutes = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;
          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadRoutes({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = { ...EMPTY_ROUTE_LIST_RESPONSE, filters: this.filters };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar las rutas.');
        },
      });
  }

  private loadValidationRoutes(): void {
    this.routesFacade
      .listRoutes({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        search: '',
        zona: null,
        vendedorId: null,
        conductorId: null,
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationRoutes = response.items;
        },
        error: () => {
          this.validationRoutes = this.listResponse.items;
        },
      });
  }

  private loadRoute(routeId: string, mode: RouteFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.routesFacade
      .getRoute(routeId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (route) => {
          this.selectedRoute = route;
          this.formMode = mode;
          this.isFormVisible = true;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar la ruta seleccionada.');
        },
      });
  }

  private resetSelection(clearMessages = true, keepFormVisible = false): void {
    this.selectedRoute = null;
    this.formMode = 'create';
    this.loadingSelection = false;
    this.isFormVisible = keepFormVisible;
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private buildPostSaveFilters(
    route: Route | null,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'inactivated',
  ): RouteFilters {
    if (!route || action !== 'created') {
      return { ...this.filters, page: 0 };
    }

    return {
      ...DEFAULT_ROUTE_FILTERS,
      empresaId: this.activeCompanyId,
      search: route.idRuta,
      page: 0,
    };
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de rutas. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
