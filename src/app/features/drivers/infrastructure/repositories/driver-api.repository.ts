import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
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
import { DriverMockRepository } from './driver-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DriverApiRepository implements DriversRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(DriverMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/conductores`;

  getCatalogs(companyId: string): Observable<DriverCatalogs> {
    void this.http;
    void this.authSessionService;
    void this.baseUrl;
    return this.mockRepository.getCatalogs(companyId);
  }

  listDrivers(companyId: string, filters: DriverFilters): Observable<DriverListResponse> {
    return this.mockRepository.listDrivers(companyId, filters);
  }

  listAssignableRoutes(companyId: string): Observable<DriverAssignableRoute[]> {
    return this.mockRepository.listAssignableRoutes(companyId);
  }

  getDriver(companyId: string, driverId: string): Observable<Driver> {
    return this.mockRepository.getDriver(companyId, driverId);
  }

  saveDriver(
    companyId: string,
    payload: SaveDriverPayload,
    driverId?: string,
  ): Observable<DriverMutationResult> {
    return this.mockRepository.saveDriver(companyId, payload, driverId);
  }

  deleteDriver(companyId: string, driverId: string): Observable<DriverMutationResult> {
    return this.mockRepository.deleteDriver(companyId, driverId);
  }

  updateDriverStatus(
    companyId: string,
    driverId: string,
    status: DriverStatus,
  ): Observable<DriverMutationResult> {
    return this.mockRepository.updateDriverStatus(companyId, driverId, status);
  }
}