import { Observable } from 'rxjs';
import { DriverFilters } from '../models/driver-filters.model';
import { SaveDriverPayload } from '../models/driver-form.model';
import {
  Driver,
  DriverAssignableRoute,
  DriverCatalogs,
  DriverStatus,
} from '../models/driver.model';
import { DriverListResponse, DriverMutationResult } from '../models/driver-response.model';

export interface DriversRepository {
  getCatalogs(companyId: string): Observable<DriverCatalogs>;
  listDrivers(companyId: string, filters: DriverFilters): Observable<DriverListResponse>;
  listAssignableRoutes(companyId: string): Observable<DriverAssignableRoute[]>;
  getDriver(companyId: string, driverId: string): Observable<Driver>;
  saveDriver(
    companyId: string,
    payload: SaveDriverPayload,
    driverId?: string,
  ): Observable<DriverMutationResult>;
  deleteDriver(companyId: string, driverId: string): Observable<DriverMutationResult>;
  updateDriverStatus(
    companyId: string,
    driverId: string,
    status: DriverStatus,
  ): Observable<DriverMutationResult>;
}