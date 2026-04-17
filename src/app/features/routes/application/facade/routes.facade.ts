import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { RouteFilters } from '../../domain/models/route-filters.model';
import { SaveRoutePayload } from '../../domain/models/route-form.model';
import { Route, RouteCatalogs, RouteStatus } from '../../domain/models/route.model';
import { RouteListResponse, RouteMutationResult } from '../../domain/models/route-response.model';
import { RoutesRepository } from '../../domain/repositories/route.repository';
import { RouteApiRepository } from '../../infrastructure/repositories/route-api.repository';
import { RouteMockRepository } from '../../infrastructure/repositories/route-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class RoutesFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(RouteMockRepository);
  private readonly apiRepository = inject(RouteApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<RouteCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listRoutes(filters: RouteFilters): Observable<RouteListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listRoutes(companyId, filters));
  }

  getRoute(routeId: string): Observable<Route> {
    return this.withActiveCompany((companyId) => this.repository.getRoute(companyId, routeId));
  }

  saveRoute(payload: SaveRoutePayload, routeId?: string): Observable<RouteMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveRoute(companyId, payload, routeId));
  }

  deleteRoute(routeId: string): Observable<RouteMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteRoute(companyId, routeId));
  }

  updateRouteStatus(routeId: string, status: RouteStatus): Observable<RouteMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.updateRouteStatus(companyId, routeId, status));
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

  private get repository(): RoutesRepository {
    return environment.useRoutesAdministrationMock ? this.mockRepository : this.apiRepository;
  }
}
