import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { DriversFacadeService } from '../../../application/facade/drivers.facade';
import { DEFAULT_DRIVER_FILTERS, DriverFilters } from '../../../domain/models/driver-filters.model';
import { DriverFormMode, SaveDriverPayload } from '../../../domain/models/driver-form.model';
import {
  Driver,
  DriverAssignableRoute,
  DriverCatalogs,
  DriverStatus,
  EMPTY_DRIVER_CATALOGS,
} from '../../../domain/models/driver.model';
import { DriverListResponse, EMPTY_DRIVER_LIST_RESPONSE } from '../../../domain/models/driver-response.model';
import { DriverFormComponent } from '../../components/driver-form/driver-form.component';
import { DriversListComponent } from '../../components/drivers-list/drivers-list.component';

@Component({
  selector: 'app-drivers-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    DriverFormComponent,
    DriversListComponent,
  ],
  templateUrl: './drivers-page.component.html',
  styleUrl: './drivers-page.component.scss',
})
export class DriversPageComponent {
  private readonly driversFacade = inject(DriversFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: DriverCatalogs = EMPTY_DRIVER_CATALOGS;
  listResponse: DriverListResponse = EMPTY_DRIVER_LIST_RESPONSE;
  validationDrivers: Driver[] = [];
  assignableRoutes: DriverAssignableRoute[] = [];
  selectedDriver: Driver | null = null;
  formMode: DriverFormMode = 'create';
  isFormVisible = false;
  filters: DriverFilters = { ...DEFAULT_DRIVER_FILTERS };
  loadingCatalogs = true;
  loadingDrivers = true;
  loadingSelection = false;
  loadingAssignableRoutes = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.driversFacade.activeCompany$
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
          ...DEFAULT_DRIVER_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationDrivers();
        this.loadAssignableRoutes();
        this.loadDrivers(this.filters);
      });
  }

  get totalDrivers(): number {
    return this.validationDrivers.length;
  }

  get activeDrivers(): number {
    return this.validationDrivers.filter((driver) => driver.estado === 'ACTIVO').length;
  }

  get inactiveDrivers(): number {
    return this.validationDrivers.filter((driver) => driver.estado === 'INACTIVO').length;
  }

  get totalAssignedRoutes(): number {
    return this.validationDrivers.reduce(
      (total, driver) => total + driver.cantidadRutasAsignadas,
      0,
    );
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection(true, true);
    this.loadAssignableRoutes();
  }

  handleFiltersChange(filters: DriverFilters): void {
    this.loadDrivers({
      ...this.filters,
      ...filters,
      empresaId: this.activeCompanyId,
    });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadDrivers({
      ...this.filters,
      page: event.page,
      pageSize: event.pageSize,
      empresaId: this.activeCompanyId,
    });
  }

  handleSelectDriver(driver: Driver): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadDriver(driver.id, 'view');
  }

  handleEditDriver(driver: Driver): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadDriver(driver.id, 'edit');
  }

  enableEditMode(): void {
    if (!this.selectedDriver) {
      return;
    }

    this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedDriver) {
      this.formMode = 'view';
      this.isFormVisible = true;
      this.loadAssignableRoutes();
      return;
    }

    this.resetSelection();
  }

  closeForm(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection();
  }

  saveDriver(payload: SaveDriverPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.driversFacade
      .saveDriver(payload, this.formMode === 'edit' ? this.selectedDriver?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedDriver = result.driver;
          this.formMode = result.driver ? 'view' : 'create';
          this.isFormVisible = false;
          this.loadValidationDrivers();
          this.loadAssignableRoutes();
          this.loadDrivers(this.buildPostSaveFilters(result.driver, result.action), false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el conductor.');
        },
      });
  }

  deleteDriver(driver: Driver): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        driver.tieneDependenciasActivas
          ? 'El conductor tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el conductor ${driver.nombreConductor}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    this.deletingId = driver.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.driversFacade
      .deleteDriver(driver.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedDriver?.id === driver.id) {
            if (result.driver) {
              this.selectedDriver = result.driver;
              this.formMode = 'view';
              this.isFormVisible = false;
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationDrivers();
          this.loadAssignableRoutes();
          this.loadDrivers(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del conductor.');
        },
      });
  }

  toggleDriverStatus(driver: Driver): void {
    const nextStatus: DriverStatus = driver.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = driver.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.driversFacade
      .updateDriverStatus(driver.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedDriver?.id === driver.id && result.driver) {
            this.selectedDriver = result.driver;
          }

          this.loadValidationDrivers();
          this.loadAssignableRoutes();
          this.loadDrivers(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del conductor.');
        },
      });
  }

  retryDrivers(): void {
    this.loadDrivers(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.driversFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_DRIVER_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los catálogos de conductores.',
          );
        },
      });
  }

  private loadDrivers(filters: DriverFilters, clearMessages = true): void {
    this.loadingDrivers = true;
    this.filters = {
      ...DEFAULT_DRIVER_FILTERS,
      ...filters,
      empresaId: this.activeCompanyId,
    };

    if (clearMessages) {
      this.errorMessage = '';
    }

    this.driversFacade
      .listDrivers(this.filters)
      .pipe(finalize(() => (this.loadingDrivers = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;

          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadDrivers({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = {
            ...EMPTY_DRIVER_LIST_RESPONSE,
            filters: this.filters,
          };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los conductores.');
        },
      });
  }

  private loadValidationDrivers(): void {
    this.driversFacade
      .listDrivers({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        ciudadId: null,
        search: '',
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationDrivers = response.items;
        },
        error: () => {
          this.validationDrivers = this.listResponse.items;
        },
      });
  }

  private loadAssignableRoutes(): void {
    this.loadingAssignableRoutes = true;

    this.driversFacade
      .listAssignableRoutes()
      .pipe(finalize(() => (this.loadingAssignableRoutes = false)))
      .subscribe({
        next: (routes) => {
          this.assignableRoutes = routes;
        },
        error: (error: unknown) => {
          this.assignableRoutes = [];
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar las rutas asignables para la empresa activa.',
          );
        },
      });
  }

  private loadDriver(driverId: string, mode: DriverFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.driversFacade
      .getDriver(driverId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (driver) => {
          this.selectedDriver = driver;
          this.formMode = mode;
          this.isFormVisible = true;
          this.loadAssignableRoutes();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el conductor seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true, keepFormVisible = false): void {
    this.selectedDriver = null;
    this.formMode = 'create';
    this.loadingSelection = false;
    this.isFormVisible = keepFormVisible;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private buildPostSaveFilters(
    driver: Driver | null,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'inactivated',
  ): DriverFilters {
    if (!driver || action !== 'created') {
      return {
        ...this.filters,
        page: 0,
      };
    }

    return {
      ...DEFAULT_DRIVER_FILTERS,
      empresaId: this.activeCompanyId,
      search: driver.idConductor,
      page: 0,
    };
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de conductores. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}