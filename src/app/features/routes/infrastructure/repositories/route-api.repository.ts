import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { RouteFilters } from '../../domain/models/route-filters.model';
import { SaveRoutePayload } from '../../domain/models/route-form.model';
import { Route, RouteCatalogs, RouteStatus } from '../../domain/models/route.model';
import { RouteListResponse, RouteMutationResult } from '../../domain/models/route-response.model';
import { RoutesRepository } from '../../domain/repositories/route.repository';
import { RouteMockRepository } from './route-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class RouteApiRepository implements RoutesRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(RouteMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/rutas`;

  getCatalogs(companyId: string): Observable<RouteCatalogs> {
    void this.http;
    void this.authSessionService;
    void this.baseUrl;
    return this.mockRepository.getCatalogs(companyId);
  }

  listRoutes(companyId: string, filters: RouteFilters): Observable<RouteListResponse> {
    return this.mockRepository.listRoutes(companyId, filters);
  }

  getRoute(companyId: string, routeId: string): Observable<Route> {
    return this.mockRepository.getRoute(companyId, routeId);
  }

  saveRoute(
    companyId: string,
    payload: SaveRoutePayload,
    routeId?: string,
  ): Observable<RouteMutationResult> {
    return this.mockRepository.saveRoute(companyId, payload, routeId);
  }

  deleteRoute(companyId: string, routeId: string): Observable<RouteMutationResult> {
    return this.mockRepository.deleteRoute(companyId, routeId);
  }

  updateRouteStatus(
    companyId: string,
    routeId: string,
    status: RouteStatus,
  ): Observable<RouteMutationResult> {
    return this.mockRepository.updateRouteStatus(companyId, routeId, status);
  }
}
