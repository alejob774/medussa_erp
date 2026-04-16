import { Observable } from 'rxjs';
import { RouteFilters } from '../models/route-filters.model';
import { SaveRoutePayload } from '../models/route-form.model';
import { Route, RouteCatalogs, RouteStatus } from '../models/route.model';
import { RouteListResponse, RouteMutationResult } from '../models/route-response.model';

export interface RoutesRepository {
  getCatalogs(companyId: string): Observable<RouteCatalogs>;
  listRoutes(companyId: string, filters: RouteFilters): Observable<RouteListResponse>;
  getRoute(companyId: string, routeId: string): Observable<Route>;
  saveRoute(
    companyId: string,
    payload: SaveRoutePayload,
    routeId?: string,
  ): Observable<RouteMutationResult>;
  deleteRoute(companyId: string, routeId: string): Observable<RouteMutationResult>;
  updateRouteStatus(
    companyId: string,
    routeId: string,
    status: RouteStatus,
  ): Observable<RouteMutationResult>;
}
