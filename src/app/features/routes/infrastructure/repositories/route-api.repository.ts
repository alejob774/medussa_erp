import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import {
  buildMasterListParams,
  buildMasterEndpointUrls,
  extractArrayPayload,
  normalizeText,
  resolveNullableText,
  resolveTotal,
  withApiFallback,
  withFlatMasterEndpointFallback,
  withTrailingSlash,
} from '../../../../core/http/master-api.utils';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendRouteDto,
  mapBackendRouteToRoute,
  mapRoutePayloadToBackend,
} from '../../application/mappers/route.mapper';
import { DEFAULT_ROUTE_FILTERS, RouteFilters } from '../../domain/models/route-filters.model';
import { SaveRoutePayload } from '../../domain/models/route-form.model';
import { Route, RouteCatalogs, RouteStatus } from '../../domain/models/route.model';
import {
  RouteAuditDraft,
  RouteListResponse,
  RouteMutationAction,
  RouteMutationResult,
} from '../../domain/models/route-response.model';
import { RoutesRepository } from '../../domain/repositories/route.repository';
import { RouteMockRepository } from './route-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class RouteApiRepository implements RoutesRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(RouteMockRepository);
  private readonly endpointUrls = buildMasterEndpointUrls(environment.apiUrl, 'rutas');

  getCatalogs(companyId: string): Observable<RouteCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listRoutes(companyId: string, filters: RouteFilters): Observable<RouteListResponse> {
    if (environment.useRoutesAdministrationMock) {
      return this.mockRepository.listRoutes(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<unknown>(withTrailingSlash(baseUrl), {
            params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
          }),
        ).pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listRoutes(companyId, filters),
      'catalogo de rutas',
    );
  }

  getRoute(companyId: string, routeId: string): Observable<Route> {
    if (environment.useRoutesAdministrationMock) {
      return this.mockRepository.getRoute(companyId, routeId);
    }

    return this.withFallback(
      () => this.loadRoute(companyId, routeId),
      () => this.mockRepository.getRoute(companyId, routeId),
      'ruta',
    );
  }

  saveRoute(
    companyId: string,
    payload: SaveRoutePayload,
    routeId?: string,
  ): Observable<RouteMutationResult> {
    if (environment.useRoutesAdministrationMock) {
      return this.mockRepository.saveRoute(companyId, payload, routeId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapRoutePayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (routeId) {
          return this.resolveRouteRequestId(companyId, routeId).pipe(
            switchMap((requestRouteId) =>
              this.withEndpointCompatibility((baseUrl) =>
                this.http.put<BackendRouteDto | void>(
                  `${withTrailingSlash(baseUrl)}${requestRouteId}`,
                  requestBody,
                ),
              )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedRoute(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      routeId,
                      requestRouteId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.withEndpointCompatibility((baseUrl) =>
          this.http.post<BackendRouteDto>(withTrailingSlash(baseUrl), requestBody),
        )
          .pipe(
            switchMap((response) =>
              this.resolveSavedRoute(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveRoute(companyId, payload, routeId),
      routeId ? 'actualizacion de ruta' : 'creacion de ruta',
    );
  }

  deleteRoute(companyId: string, routeId: string): Observable<RouteMutationResult> {
    if (environment.useRoutesAdministrationMock) {
      return this.mockRepository.deleteRoute(companyId, routeId);
    }

    return this.withFallback(
      () =>
        this.resolveRouteRequestId(companyId, routeId).pipe(
          switchMap((requestRouteId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.delete<unknown>(`${withTrailingSlash(baseUrl)}${requestRouteId}`),
            )
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, routeId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, routeId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteRoute(companyId, routeId),
      'eliminacion de ruta',
    );
  }

  updateRouteStatus(
    companyId: string,
    routeId: string,
    status: RouteStatus,
  ): Observable<RouteMutationResult> {
    if (environment.useRoutesAdministrationMock) {
      return this.mockRepository.updateRouteStatus(companyId, routeId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, routeId, status),
      () => this.mockRepository.updateRouteStatus(companyId, routeId, status),
      'estado de ruta',
    );
  }

  private loadRoute(companyId: string, routeId: string): Observable<Route> {
    return this.resolveRouteRequestId(companyId, routeId).pipe(
      switchMap((requestRouteId) =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<BackendRouteDto>(`${withTrailingSlash(baseUrl)}${requestRouteId}`),
        )
          .pipe(
            map((route) =>
              mapBackendRouteToRoute(route, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: RouteFilters,
  ): RouteListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const routes = extractArrayPayload<BackendRouteDto>(payload)
      .map((route) =>
        mapBackendRouteToRoute(route, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((route) => this.matchesFilters(route, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: routes.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: resolveTotal(payload, routes.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedRoute(
    companyId: string,
    response: BackendRouteDto | void,
    action: Extract<RouteMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<RouteMutationResult> {
    if (response) {
      const route = mapBackendRouteToRoute(response, companyId, companyName);
      return of(this.buildMutationResult(action, route));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar la ruta guardada.'));
    }

    return this.loadRoute(companyId, candidateId).pipe(
      map((route) => this.buildMutationResult(action, route)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    routeId: string,
    status: RouteStatus,
  ): Observable<RouteMutationResult> {
    return this.loadRoute(companyId, routeId).pipe(
      switchMap((route) =>
        this.resolveRouteRequestId(companyId, routeId).pipe(
          switchMap((requestRouteId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.put<BackendRouteDto | void>(
                `${withTrailingSlash(baseUrl)}${requestRouteId}`,
                {
                  estado: status,
                  activo: status === 'ACTIVO',
                  isActive: status === 'ACTIVO',
                },
              ),
            )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedRoute(
                    companyId,
                    response,
                    'updated',
                    route.empresaNombre ?? this.resolveCompanyName(companyId),
                    route.id,
                    requestRouteId,
                  ),
                ),
                map((result): RouteMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `La ruta ${result.route?.nombreRuta ?? route.nombreRuta} fue activada.`
                      : `La ruta ${result.route?.nombreRuta ?? route.nombreRuta} fue inactivada.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.route ?? { ...route, estado: status },
                    status === 'ACTIVO'
                      ? `Activacion de la ruta ${route.nombreRuta}.`
                      : `Inactivacion de la ruta ${route.nombreRuta}.`,
                    this.sanitizeAuditPayload(route),
                    this.sanitizeAuditPayload(result.route ?? { ...route, estado: status }),
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
    routeId: string,
    response: unknown,
  ): RouteMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const route = mapBackendRouteToRoute(
        response as BackendRouteDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: RouteMutationAction =
        route.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        route: action === 'deleted' ? null : route,
        message:
          action === 'inactivated'
            ? 'El backend reporto que la ruta fue inactivada por dependencias operativas.'
            : `La ruta ${route.nombreRuta} fue eliminada correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          route,
          action === 'inactivated'
            ? `Inactivacion de la ruta ${route.nombreRuta} reportada por backend.`
            : `Eliminacion de la ruta ${route.nombreRuta}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(route),
        ),
      };
    }

    const auditRoute = this.buildDeletedRoute(companyId, routeId);

    return {
      action: 'deleted',
      route: null,
      message: 'La ruta fue eliminada correctamente.',
      auditDraft: this.buildAuditDraft('delete', auditRoute, `Eliminacion de la ruta ${routeId}.`, null, null),
    };
  }

  private resolveRouteRequestId(companyId: string, routeId: string): Observable<string> {
    return this.withEndpointCompatibility((baseUrl) =>
      this.http.get<unknown>(withTrailingSlash(baseUrl), {
        params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
      }),
    )
      .pipe(
        map((response) => {
          const route = extractArrayPayload<BackendRouteDto>(response).find((candidate) =>
            this.matchesRouteReference(candidate, routeId),
          );

          return (
            resolveNullableText(route?.id, route?.ruta_id, route?.routeId, route?.id_ruta, route?.idRuta) ??
            routeId
          );
        }),
      );
  }

  private matchesRouteReference(route: BackendRouteDto, routeId: string): boolean {
    const normalizedRouteId = routeId.trim();
    const candidates = [
      resolveNullableText(route.id),
      resolveNullableText(route.ruta_id),
      resolveNullableText(route.routeId),
      resolveNullableText(route.id_ruta),
      resolveNullableText(route.idRuta),
    ];

    return candidates.includes(normalizedRouteId);
  }

  private normalizeFilters(filters: RouteFilters, companyId: string): Required<RouteFilters> {
    return {
      ...DEFAULT_ROUTE_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      search: filters.search?.trim() ?? '',
      zona: filters.zona ?? null,
      vendedorId: filters.vendedorId ?? null,
      conductorId: filters.conductorId ?? null,
      page: filters.page ?? DEFAULT_ROUTE_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_ROUTE_FILTERS.pageSize,
    };
  }

  private matchesFilters(route: Route, filters: Required<RouteFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [route.idRuta, route.nombreRuta, route.zona, route.vendedorNombre, route.conductorNombre].some((value) =>
        normalizeText(value).includes(normalizedSearch),
      );
    const matchesStatus = filters.estado === 'TODOS' || route.estado === filters.estado;
    const matchesZone = !filters.zona || route.zona === filters.zona;
    const matchesVendor = !filters.vendedorId || route.vendedorId === filters.vendedorId;
    const matchesDriver = !filters.conductorId || route.conductorId === filters.conductorId;

    return matchesSearch && matchesStatus && matchesZone && matchesVendor && matchesDriver;
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
    action: Extract<RouteMutationAction, 'created' | 'updated'>,
    route: Route,
  ): RouteMutationResult {
    return {
      action,
      route,
      message:
        action === 'created'
          ? `La ruta ${route.nombreRuta} fue creada correctamente.`
          : `La ruta ${route.nombreRuta} fue actualizada correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        route,
        action === 'created'
          ? `Creacion de la ruta ${route.nombreRuta}.`
          : `Actualizacion de la ruta ${route.nombreRuta}.`,
        null,
        this.sanitizeAuditPayload(route),
      ),
    };
  }

  private buildAuditDraft(
    action: RouteAuditDraft['action'],
    route: Route,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): RouteAuditDraft {
    return {
      module: 'rutas',
      action,
      companyId: route.empresaId,
      companyName: route.empresaNombre ?? 'Empresa activa',
      entityId: route.id,
      entityName: route.nombreRuta,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(route: Route): Record<string, unknown> {
    return {
      id: route.id,
      empresaId: route.empresaId,
      idRuta: route.idRuta,
      nombreRuta: route.nombreRuta,
      zona: route.zona,
      vendedorId: route.vendedorId,
      vendedorCodigo: route.vendedorCodigo,
      vendedorNombre: route.vendedorNombre,
      conductorId: route.conductorId,
      conductorCodigo: route.conductorCodigo,
      conductorNombre: route.conductorNombre,
      clientesAsignados: route.clientesAsignados,
      diasRuta: route.diasRuta,
      diasDespacho: route.diasDespacho,
      cantidadClientesAsignados: route.cantidadClientesAsignados,
      estado: route.estado,
      dependenciasActivas: route.tieneDependenciasActivas,
    };
  }

  private buildDeletedRoute(companyId: string, routeId: string): Route {
    return {
      id: routeId,
      idRuta: routeId,
      nombreRuta: 'Ruta eliminada',
      zona: '',
      vendedorId: '',
      vendedorCodigo: '',
      vendedorNombre: '',
      conductorId: '',
      conductorCodigo: '',
      conductorNombre: '',
      clientesAsignados: [],
      cantidadClientesAsignados: 0,
      diasRuta: [],
      diasDespacho: [],
      estado: 'INACTIVO',
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      tieneDependenciasActivas: false,
    };
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context: string,
  ): Observable<T> {
    return withApiFallback(operation, fallback, {
      fallbackEnabled: environment.enableRoutesAdministrationFallback,
      context,
      permissionMessage: 'No tienes permisos para operar rutas en la empresa activa.',
    });
  }

  private withEndpointCompatibility<T>(
    operation: (baseUrl: string) => Observable<T>,
  ): Observable<T> {
    return withFlatMasterEndpointFallback(
      operation,
      this.endpointUrls,
      environment.useFlatMasterEndpointsFallback,
    );
  }
}
