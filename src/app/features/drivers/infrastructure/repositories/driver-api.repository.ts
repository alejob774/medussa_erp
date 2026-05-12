import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import {
  buildMasterListParams,
  extractArrayPayload,
  normalizeText,
  resolveNullableText,
  resolveTotal,
  withApiFallback,
  withTrailingSlash,
} from '../../../../core/http/master-api.utils';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendDriverDto,
  mapBackendDriverToDriver,
  mapDriverPayloadToBackend,
} from '../../application/mappers/driver.mapper';
import { DEFAULT_DRIVER_FILTERS, DriverFilters } from '../../domain/models/driver-filters.model';
import { SaveDriverPayload } from '../../domain/models/driver-form.model';
import {
  Driver,
  DriverAssignableRoute,
  DriverCatalogs,
  DriverStatus,
} from '../../domain/models/driver.model';
import {
  DriverAuditDraft,
  DriverListResponse,
  DriverMutationAction,
  DriverMutationResult,
} from '../../domain/models/driver-response.model';
import { DriversRepository } from '../../domain/repositories/driver.repository';
import { DriverMockRepository } from './driver-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class DriverApiRepository implements DriversRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(DriverMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/maestros/conductores`;

  getCatalogs(companyId: string): Observable<DriverCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listDrivers(companyId: string, filters: DriverFilters): Observable<DriverListResponse> {
    if (environment.useDriversAdministrationMock) {
      return this.mockRepository.listDrivers(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.http
          .get<unknown>(withTrailingSlash(this.baseUrl), {
            params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listDrivers(companyId, filters),
      'catalogo de conductores',
    );
  }

  listAssignableRoutes(companyId: string): Observable<DriverAssignableRoute[]> {
    return this.mockRepository.listAssignableRoutes(companyId);
  }

  getDriver(companyId: string, driverId: string): Observable<Driver> {
    if (environment.useDriversAdministrationMock) {
      return this.mockRepository.getDriver(companyId, driverId);
    }

    return this.withFallback(
      () => this.loadDriver(companyId, driverId),
      () => this.mockRepository.getDriver(companyId, driverId),
      'conductor',
    );
  }

  saveDriver(
    companyId: string,
    payload: SaveDriverPayload,
    driverId?: string,
  ): Observable<DriverMutationResult> {
    if (environment.useDriversAdministrationMock) {
      return this.mockRepository.saveDriver(companyId, payload, driverId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapDriverPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (driverId) {
          return this.resolveDriverRequestId(companyId, driverId).pipe(
            switchMap((requestDriverId) =>
              this.http
                .patch<BackendDriverDto | void>(
                  `${withTrailingSlash(this.baseUrl)}${requestDriverId}`,
                  requestBody,
                )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedDriver(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      driverId,
                      requestDriverId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.http
          .post<BackendDriverDto>(withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((response) =>
              this.resolveSavedDriver(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveDriver(companyId, payload, driverId),
      driverId ? 'actualizacion de conductor' : 'creacion de conductor',
    );
  }

  deleteDriver(companyId: string, driverId: string): Observable<DriverMutationResult> {
    if (environment.useDriversAdministrationMock) {
      return this.mockRepository.deleteDriver(companyId, driverId);
    }

    return this.withFallback(
      () =>
        this.resolveDriverRequestId(companyId, driverId).pipe(
          switchMap((requestDriverId) =>
            this.http
              .delete<unknown>(`${withTrailingSlash(this.baseUrl)}${requestDriverId}`)
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, driverId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, driverId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteDriver(companyId, driverId),
      'eliminacion de conductor',
    );
  }

  updateDriverStatus(
    companyId: string,
    driverId: string,
    status: DriverStatus,
  ): Observable<DriverMutationResult> {
    if (environment.useDriversAdministrationMock) {
      return this.mockRepository.updateDriverStatus(companyId, driverId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, driverId, status),
      () => this.mockRepository.updateDriverStatus(companyId, driverId, status),
      'estado de conductor',
    );
  }

  private loadDriver(companyId: string, driverId: string): Observable<Driver> {
    return this.resolveDriverRequestId(companyId, driverId).pipe(
      switchMap((requestDriverId) =>
        this.http
          .get<BackendDriverDto>(`${withTrailingSlash(this.baseUrl)}${requestDriverId}`)
          .pipe(
            map((driver) =>
              mapBackendDriverToDriver(driver, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: DriverFilters,
  ): DriverListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const drivers = extractArrayPayload<BackendDriverDto>(payload)
      .map((driver) =>
        mapBackendDriverToDriver(driver, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((driver) => this.matchesFilters(driver, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: drivers.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: resolveTotal(payload, drivers.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedDriver(
    companyId: string,
    response: BackendDriverDto | void,
    action: Extract<DriverMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<DriverMutationResult> {
    if (response) {
      const driver = mapBackendDriverToDriver(response, companyId, companyName);
      return of(this.buildMutationResult(action, driver));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el conductor guardado.'));
    }

    return this.loadDriver(companyId, candidateId).pipe(
      map((driver) => this.buildMutationResult(action, driver)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    driverId: string,
    status: DriverStatus,
  ): Observable<DriverMutationResult> {
    return this.loadDriver(companyId, driverId).pipe(
      switchMap((driver) =>
        this.resolveDriverRequestId(companyId, driverId).pipe(
          switchMap((requestDriverId) =>
            this.http
              .patch<BackendDriverDto | void>(
                `${withTrailingSlash(this.baseUrl)}${requestDriverId}`,
                {
                  estado: status,
                  activo: status === 'ACTIVO',
                  isActive: status === 'ACTIVO',
                },
              )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedDriver(
                    companyId,
                    response,
                    'updated',
                    driver.empresaNombre,
                    driver.id,
                    requestDriverId,
                  ),
                ),
                map((result): DriverMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El conductor ${result.driver?.nombreConductor ?? driver.nombreConductor} fue activado.`
                      : `El conductor ${result.driver?.nombreConductor ?? driver.nombreConductor} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.driver ?? { ...driver, estado: status },
                    status === 'ACTIVO'
                      ? `Activacion del conductor ${driver.nombreConductor}.`
                      : `Inactivacion del conductor ${driver.nombreConductor}.`,
                    this.sanitizeAuditPayload(driver),
                    this.sanitizeAuditPayload(result.driver ?? { ...driver, estado: status }),
                  ),
                })),
              ),
          ),
        ),
      ),
    );
  }

  private mapDeleteResponse(
    companyId: string,
    driverId: string,
    response: unknown,
  ): DriverMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const driver = mapBackendDriverToDriver(
        response as BackendDriverDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: DriverMutationAction =
        driver.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        driver: action === 'deleted' ? null : driver,
        message:
          action === 'inactivated'
            ? 'El backend reporto que el conductor fue inactivado por dependencias operativas.'
            : `El conductor ${driver.nombreConductor} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          driver,
          action === 'inactivated'
            ? `Inactivacion del conductor ${driver.nombreConductor} reportada por backend.`
            : `Eliminacion del conductor ${driver.nombreConductor}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(driver),
        ),
      };
    }

    const auditDriver = this.buildDeletedDriver(companyId, driverId);

    return {
      action: 'deleted',
      driver: null,
      message: 'El conductor fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft('delete', auditDriver, `Eliminacion del conductor ${driverId}.`, null, null),
    };
  }

  private resolveDriverRequestId(companyId: string, driverId: string): Observable<string> {
    return this.http
      .get<unknown>(withTrailingSlash(this.baseUrl), {
        params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
      })
      .pipe(
        map((response) => {
          const driver = extractArrayPayload<BackendDriverDto>(response).find((candidate) =>
            this.matchesDriverReference(candidate, driverId),
          );

          return (
            resolveNullableText(driver?.id, driver?.conductor_id, driver?.conductorId, driver?.id_conductor, driver?.idConductor) ??
            driverId
          );
        }),
      );
  }

  private matchesDriverReference(driver: BackendDriverDto, driverId: string): boolean {
    const normalizedDriverId = driverId.trim();
    const candidates = [
      resolveNullableText(driver.id),
      resolveNullableText(driver.conductor_id),
      resolveNullableText(driver.conductorId),
      resolveNullableText(driver.id_conductor),
      resolveNullableText(driver.idConductor),
    ];

    return candidates.includes(normalizedDriverId);
  }

  private normalizeFilters(filters: DriverFilters, companyId: string): Required<DriverFilters> {
    return {
      ...DEFAULT_DRIVER_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      ciudadId: filters.ciudadId ?? null,
      search: filters.search?.trim() ?? '',
      page: filters.page ?? DEFAULT_DRIVER_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_DRIVER_FILTERS.pageSize,
    };
  }

  private matchesFilters(driver: Driver, filters: Required<DriverFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        driver.idConductor,
        driver.nombreConductor,
        driver.numeroDocumento ?? '',
        driver.ciudadNombre ?? '',
        driver.celular ?? '',
        driver.email ?? '',
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || driver.estado === filters.estado;
    const matchesCity = !filters.ciudadId || driver.ciudadId === filters.ciudadId;

    return matchesSearch && matchesStatus && matchesCity;
  }

  private resolveCompanyName(companyId: string): string {
    return (
      this.authSessionService
        .getSession()
        ?.companies?.find((company) => company.id === companyId || company.backendId === companyId)
        ?.name ?? 'Empresa activa'
    );
  }

  private resolveRequestCompanyId(companyId: string): string {
    const session = this.authSessionService.getSession();
    const company = session?.companies?.find((candidate) => candidate.id === companyId);

    return company?.backendId ?? (session?.activeCompanyId === companyId ? session.activeBackendCompanyId : null) ?? companyId;
  }

  private shouldInactivateInstead(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const detail = String(error.error?.detail ?? error.error?.message ?? '').toLowerCase();
    return error.status === 409 || detail.includes('depend') || detail.includes('inactiv');
  }

  private buildMutationResult(
    action: Extract<DriverMutationAction, 'created' | 'updated'>,
    driver: Driver,
  ): DriverMutationResult {
    return {
      action,
      driver,
      message:
        action === 'created'
          ? `El conductor ${driver.nombreConductor} fue creado correctamente.`
          : `El conductor ${driver.nombreConductor} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        driver,
        action === 'created'
          ? `Creacion del conductor ${driver.nombreConductor}.`
          : `Actualizacion del conductor ${driver.nombreConductor}.`,
        null,
        this.sanitizeAuditPayload(driver),
      ),
    };
  }

  private buildAuditDraft(
    action: DriverAuditDraft['action'],
    driver: Driver,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): DriverAuditDraft {
    return {
      module: 'conductores',
      action,
      companyId: driver.empresaId,
      companyName: driver.empresaNombre ?? 'Empresa activa',
      entityId: driver.id,
      entityName: driver.nombreConductor,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(driver: Driver): Record<string, unknown> {
    return {
      id: driver.id,
      empresaId: driver.empresaId,
      idConductor: driver.idConductor,
      nombreConductor: driver.nombreConductor,
      tipoDocumento: driver.tipoDocumento,
      numeroDocumento: driver.numeroDocumento ?? null,
      ciudadId: driver.ciudadId ?? null,
      ciudadNombre: driver.ciudadNombre ?? null,
      direccion: driver.direccion ?? null,
      celular: driver.celular ?? null,
      email: driver.email ?? null,
      numeroLicencia: driver.numeroLicencia ?? null,
      categoriaLicencia: driver.categoriaLicencia ?? null,
      vencimientoLicencia: driver.vencimientoLicencia ?? null,
      rutasAsignadas: driver.rutasAsignadas,
      cantidadRutasAsignadas: driver.cantidadRutasAsignadas,
      estado: driver.estado,
      dependenciasActivas: driver.tieneDependenciasActivas,
    };
  }

  private buildDeletedDriver(companyId: string, driverId: string): Driver {
    return {
      id: driverId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      idConductor: driverId,
      nombreConductor: 'Conductor eliminado',
      tipoDocumento: '',
      rutasAsignadas: [],
      cantidadRutasAsignadas: 0,
      estado: 'INACTIVO',
      tieneDependenciasActivas: false,
    };
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context: string,
  ): Observable<T> {
    return withApiFallback(operation, fallback, {
      fallbackEnabled: environment.enableDriversAdministrationFallback,
      context,
      permissionMessage: 'No tienes permisos para operar conductores en la empresa activa.',
    });
  }
}
