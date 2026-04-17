import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { DriverFilters } from '../../domain/models/driver-filters.model';
import { SaveDriverPayload } from '../../domain/models/driver-form.model';
import {
  Driver,
  DriverAssignableRoute,
  DriverCatalogs,
  DriverStatus,
} from '../../domain/models/driver.model';
import { DriverListResponse, DriverMutationResult } from '../../domain/models/driver-response.model';
import { DriversRepository } from '../../domain/repositories/driver.repository';
import { DriverApiRepository } from '../../infrastructure/repositories/driver-api.repository';
import { DriverMockRepository } from '../../infrastructure/repositories/driver-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DriversFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(DriverMockRepository);
  private readonly apiRepository = inject(DriverApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<DriverCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listDrivers(filters: DriverFilters): Observable<DriverListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listDrivers(companyId, filters));
  }

  listAssignableRoutes(): Observable<DriverAssignableRoute[]> {
    return this.withActiveCompany((companyId) => this.repository.listAssignableRoutes(companyId));
  }

  getDriver(driverId: string): Observable<Driver> {
    return this.withActiveCompany((companyId) => this.repository.getDriver(companyId, driverId));
  }

  saveDriver(payload: SaveDriverPayload, driverId?: string): Observable<DriverMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveDriver(companyId, payload, driverId));
  }

  deleteDriver(driverId: string): Observable<DriverMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteDriver(companyId, driverId));
  }

  updateDriverStatus(driverId: string, status: DriverStatus): Observable<DriverMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.updateDriverStatus(companyId, driverId, status));
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): DriversRepository {
    return environment.useDriversAdministrationMock ? this.mockRepository : this.apiRepository;
  }
}