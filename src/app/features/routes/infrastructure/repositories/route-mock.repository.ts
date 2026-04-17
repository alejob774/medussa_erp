import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { SHARED_WEEK_DAYS_CATALOG } from '../../../../core/catalogs/data/week-days.catalog';
import { normalizeZoneCatalog, SHARED_ZONE_CATALOG } from '../../../../core/catalogs/data/zones.catalog';
import { normalizeText } from '../../../clients/application/mappers/client.mapper';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { DriverStore } from '../../../drivers/domain/models/driver-response.model';
import { INITIAL_DRIVERS_STORE } from '../../../drivers/infrastructure/data/drivers.mock';
import { VendorStore } from '../../../vendors/domain/models/vendor-response.model';
import { INITIAL_VENDORS_STORE } from '../../../vendors/infrastructure/data/vendors.mock';
import { DEFAULT_ROUTE_FILTERS, RouteFilters } from '../../domain/models/route-filters.model';
import { SaveRoutePayload } from '../../domain/models/route-form.model';
import {
  Route,
  RouteAssignableClient,
  RouteAssignedClient,
  RouteCatalogs,
  RouteDriverOption,
  RouteStatus,
  RouteVendorOption,
} from '../../domain/models/route.model';
import {
  RouteAuditDraft,
  RouteListResponse,
  RouteMutationAction,
  RouteMutationResult,
  RouteStore,
} from '../../domain/models/route-response.model';
import { RoutesRepository } from '../../domain/repositories/route.repository';
import { INITIAL_ROUTES_STORE } from '../data/routes.mock';

@Injectable({
  providedIn: 'root',
})
export class RouteMockRepository implements RoutesRepository {
  private readonly storageKey = 'medussa.erp.mock.routes';
  private readonly vendorsStorageKey = 'medussa.erp.mock.vendors';
  private readonly driversStorageKey = 'medussa.erp.mock.drivers';
  private readonly clientsStorageKey = 'medussa.erp.mock.clients';

  getCatalogs(companyId: string): Observable<RouteCatalogs> {
    return of(this.buildCatalogs(companyId)).pipe(delay(120));
  }

  listRoutes(companyId: string, filters: RouteFilters): Observable<RouteListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const routes = this.readStore().routes
      .map((route) => this.cloneRoute(route))
      .filter((route) => route.empresaId === normalizedFilters.empresaId)
      .filter((route) => this.matchesFilters(route, normalizedFilters))
      .sort((left, right) => left.nombreRuta.localeCompare(right.nombreRuta, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: routes.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: routes.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  getRoute(companyId: string, routeId: string): Observable<Route> {
    const route = this.readStore().routes.find(
      (item) => item.empresaId === companyId && item.id === routeId,
    );

    if (!route) {
      return throwError(() => new Error('No se encontró la ruta solicitada.'));
    }

    return of(this.cloneRoute(route)).pipe(delay(150));
  }

  saveRoute(
    companyId: string,
    payload: SaveRoutePayload,
    routeId?: string,
  ): Observable<RouteMutationResult> {
    const store = this.readStore();
    const currentRoute = routeId
      ? store.routes.find((route) => route.empresaId === companyId && route.id === routeId)
      : undefined;
    const catalogs = this.buildCatalogs(companyId);
    const validationError = this.validatePayload(store, catalogs, companyId, payload, routeId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const vendor = catalogs.vendors.find((item) => item.vendorId === normalizedPayload.vendedorId) ?? null;
    const driver = catalogs.drivers.find((item) => item.driverId === normalizedPayload.conductorId) ?? null;
    const resolvedClients = this.resolveAssignedClients(
      catalogs.clients,
      normalizedPayload.zona,
      normalizedPayload.clientesAsignados,
    );
    const nextRoute: Route = {
      id: currentRoute?.id ?? this.buildRouteId(normalizedPayload.idRuta, normalizedPayload.nombreRuta),
      idRuta: normalizedPayload.idRuta,
      nombreRuta: normalizedPayload.nombreRuta,
      zona: normalizedPayload.zona,
      vendedorId: normalizedPayload.vendedorId,
      vendedorCodigo: vendor?.idVendedor ?? currentRoute?.vendedorCodigo ?? '',
      vendedorNombre:
        vendor?.nombre ??
        (normalizedPayload.vendedorNombre?.trim() || currentRoute?.vendedorNombre || ''),
      conductorId: normalizedPayload.conductorId,
      conductorCodigo: driver?.idConductor ?? currentRoute?.conductorCodigo ?? '',
      conductorNombre:
        driver?.nombre ??
        (normalizedPayload.conductorNombre?.trim() || currentRoute?.conductorNombre || ''),
      clientesAsignados: resolvedClients,
      cantidadClientesAsignados: resolvedClients.length,
      diasRuta: normalizedPayload.diasRuta,
      diasDespacho: normalizedPayload.diasDespacho,
      estado: normalizedPayload.estado,
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      createdAt: currentRoute?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tieneDependenciasActivas: currentRoute?.tieneDependenciasActivas ?? false,
    };
    const nextRoutes = currentRoute
      ? store.routes.map((route) =>
          route.empresaId === companyId && route.id === currentRoute.id ? nextRoute : route,
        )
      : [nextRoute, ...store.routes];
    const action: RouteMutationAction = currentRoute ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextRoute,
      action === 'created'
        ? `Creación de la ruta ${nextRoute.nombreRuta}.`
        : `Actualización de la ruta ${nextRoute.nombreRuta}.`,
      currentRoute ? sanitizeAuditPayload(currentRoute) : null,
      sanitizeAuditPayload(nextRoute),
    );

    this.writeStore({
      ...store,
      routes: nextRoutes,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<RouteMutationResult>({
      action,
      route: this.cloneRoute(nextRoute),
      message:
        action === 'created'
          ? `La ruta ${nextRoute.nombreRuta} fue creada correctamente.`
          : `La ruta ${nextRoute.nombreRuta} fue actualizada correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteRoute(companyId: string, routeId: string): Observable<RouteMutationResult> {
    const store = this.readStore();
    const currentRoute = store.routes.find(
      (route) => route.empresaId === companyId && route.id === routeId,
    );

    if (!currentRoute) {
      return throwError(() => new Error('No se encontró la ruta solicitada.'));
    }

    if (currentRoute.tieneDependenciasActivas) {
      const nextRoute: Route = {
        ...this.cloneRoute(currentRoute),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextRoute,
        `Inactivación preventiva de la ruta ${nextRoute.nombreRuta} por dependencias activas.`,
        sanitizeAuditPayload(currentRoute),
        sanitizeAuditPayload(nextRoute),
      );

      this.writeStore({
        ...store,
        routes: store.routes.map((route) =>
          route.empresaId === companyId && route.id === routeId ? nextRoute : route,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<RouteMutationResult>({
        action: 'inactivated',
        route: this.cloneRoute(nextRoute),
        message: 'La ruta tiene dependencias activas y fue marcada como inactiva en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentRoute,
      `Eliminación de la ruta ${currentRoute.nombreRuta}.`,
      sanitizeAuditPayload(currentRoute),
      null,
    );

    this.writeStore({
      ...store,
      routes: store.routes.filter(
        (route) => !(route.empresaId === companyId && route.id === routeId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<RouteMutationResult>({
      action: 'deleted',
      route: null,
      message: `La ruta ${currentRoute.nombreRuta} fue eliminada correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateRouteStatus(
    companyId: string,
    routeId: string,
    status: RouteStatus,
  ): Observable<RouteMutationResult> {
    const store = this.readStore();
    const currentRoute = store.routes.find(
      (route) => route.empresaId === companyId && route.id === routeId,
    );

    if (!currentRoute) {
      return throwError(() => new Error('No se encontró la ruta solicitada.'));
    }

    const nextRoute: Route = {
      ...this.cloneRoute(currentRoute),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: RouteMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextRoute,
      status === 'ACTIVO'
        ? `Activación de la ruta ${nextRoute.nombreRuta}.`
        : `Inactivación de la ruta ${nextRoute.nombreRuta}.`,
      sanitizeAuditPayload(currentRoute),
      sanitizeAuditPayload(nextRoute),
    );

    this.writeStore({
      ...store,
      routes: store.routes.map((route) =>
        route.empresaId === companyId && route.id === routeId ? nextRoute : route,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<RouteMutationResult>({
      action,
      route: this.cloneRoute(nextRoute),
      message:
        status === 'ACTIVO'
          ? `La ruta ${nextRoute.nombreRuta} fue activada.`
          : `La ruta ${nextRoute.nombreRuta} fue inactivada.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): RouteStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_ROUTES_STORE);
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeStore(structuredClone(INITIAL_ROUTES_STORE));
      return structuredClone(INITIAL_ROUTES_STORE);
    }

    try {
      const normalizedStore = normalizeRouteStore(JSON.parse(raw) as RouteStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      this.writeStore(structuredClone(INITIAL_ROUTES_STORE));
      return structuredClone(INITIAL_ROUTES_STORE);
    }
  }

  private writeStore(store: RouteStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private buildCatalogs(companyId: string): RouteCatalogs {
    const vendorsStore = this.readVendorsStore();
    const driversStore = this.readDriversStore();
    const clientsStore = this.readClientsStore();

    return {
      zones: normalizeZoneCatalog(SHARED_ZONE_CATALOG),
      weekDays: SHARED_WEEK_DAYS_CATALOG.map((day) => ({ ...day })),
      vendors: vendorsStore.vendors
        .filter((vendor) => vendor.empresaId === companyId)
        .filter((vendor) => vendor.estado === 'ACTIVO')
        .sort((left, right) => left.nombreVendedor.localeCompare(right.nombreVendedor, 'es-CO'))
        .map((vendor) => this.mapVendor(vendor)),
      drivers: driversStore.drivers
        .filter((driver) => driver.empresaId === companyId)
        .filter((driver) => driver.estado === 'ACTIVO')
        .sort((left, right) => left.nombreConductor.localeCompare(right.nombreConductor, 'es-CO'))
        .map((driver) => this.mapDriver(driver)),
      clients: clientsStore.clients
        .filter((client) => client.empresaId === companyId)
        .filter((client) => client.estado === 'ACTIVO')
        .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'))
        .map((client) => this.mapClient(client)),
    };
  }

  private readVendorsStore(): VendorStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_VENDORS_STORE);
    }

    const raw = localStorage.getItem(this.vendorsStorageKey);

    if (!raw) {
      return structuredClone(INITIAL_VENDORS_STORE);
    }

    try {
      return JSON.parse(raw) as VendorStore;
    } catch {
      return structuredClone(INITIAL_VENDORS_STORE);
    }
  }

  private readDriversStore(): DriverStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_DRIVERS_STORE);
    }

    const raw = localStorage.getItem(this.driversStorageKey);

    if (!raw) {
      return structuredClone(INITIAL_DRIVERS_STORE);
    }

    try {
      return JSON.parse(raw) as DriverStore;
    } catch {
      return structuredClone(INITIAL_DRIVERS_STORE);
    }
  }

  private readClientsStore(): ClientStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    const raw = localStorage.getItem(this.clientsStorageKey);

    if (!raw) {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    try {
      return JSON.parse(raw) as ClientStore;
    } catch {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }
  }

  private validatePayload(
    store: RouteStore,
    catalogs: RouteCatalogs,
    companyId: string,
    payload: SaveRoutePayload,
    routeId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!normalizedPayload.empresaNombre) {
      return 'No fue posible resolver el nombre de la empresa activa.';
    }

    if (!normalizedPayload.idRuta) {
      return 'El ID ruta es obligatorio.';
    }

    if (!normalizedPayload.nombreRuta) {
      return 'El nombre de la ruta es obligatorio.';
    }

    if (!normalizedPayload.zona) {
      return 'La zona es obligatoria.';
    }

    if (!normalizedPayload.vendedorId) {
      return 'El vendedor es obligatorio.';
    }

    if (!normalizedPayload.conductorId) {
      return 'El conductor es obligatorio.';
    }

    if (!normalizedPayload.clientesAsignados.length) {
      return 'Debes asignar al menos un cliente a la ruta.';
    }

    if (!normalizedPayload.estado) {
      return 'El estado es obligatorio.';
    }

    if (!normalizedPayload.diasRuta.length && !normalizedPayload.diasDespacho.length) {
      return 'Debes seleccionar al menos un día de ruta o un día de despacho.';
    }

    const duplicatedIdRuta = store.routes.some(
      (route) =>
        route.empresaId === companyId &&
        route.id !== routeId &&
        normalizeText(route.idRuta) === normalizeText(normalizedPayload.idRuta),
    );

    if (duplicatedIdRuta) {
      return 'Ya existe una ruta con ese ID en la empresa activa.';
    }

    const vendor = catalogs.vendors.find((item) => item.vendorId === normalizedPayload.vendedorId) ?? null;

    if (!vendor) {
      return 'El vendedor seleccionado no está disponible en la empresa activa.';
    }

    if (vendor.zona !== normalizedPayload.zona) {
      return 'El vendedor debe pertenecer a la misma zona de la ruta.';
    }

    const driver = catalogs.drivers.find((item) => item.driverId === normalizedPayload.conductorId) ?? null;

    if (!driver) {
      return 'El conductor seleccionado no está disponible en la empresa activa.';
    }

    const assignedClientIds = normalizedPayload.clientesAsignados.map((client) => client.clientId);
    const uniqueClientIds = new Set(assignedClientIds);

    if (uniqueClientIds.size !== assignedClientIds.length) {
      return 'No puedes asignar clientes duplicados a la misma ruta.';
    }

    const availableClientIds = new Set(
      catalogs.clients
        .filter((client) => client.zona === normalizedPayload.zona)
        .map((client) => client.clientId),
    );
    const hasInvalidClient = assignedClientIds.some((clientId) => !availableClientIds.has(clientId));

    if (hasInvalidClient) {
      return 'Todos los clientes asignados deben estar activos y pertenecer a la misma zona de la ruta.';
    }

    if (new Set(normalizedPayload.diasRuta).size !== normalizedPayload.diasRuta.length) {
      return 'No puedes repetir días en la programación de ruta.';
    }

    if (new Set(normalizedPayload.diasDespacho).size !== normalizedPayload.diasDespacho.length) {
      return 'No puedes repetir días en la programación de despacho.';
    }

    return null;
  }

  private resolveAssignedClients(
    availableClients: RouteAssignableClient[],
    zone: string,
    assignments: RouteAssignedClient[],
  ): RouteAssignedClient[] {
    const availableMap = new Map(
      availableClients
        .filter((client) => client.zona === zone)
        .map((client) => [client.clientId, client]),
    );

    return assignments
      .map((assignment) => availableMap.get(assignment.clientId))
      .filter((client): client is RouteAssignableClient => client !== undefined)
      .map((client) => ({
        clientId: client.clientId,
        idCliente: client.idCliente,
        nombre: client.nombre,
        zona: client.zona,
        ciudadNombre: client.ciudadNombre ?? null,
      }));
  }

  private mapVendor(vendor: VendorStore['vendors'][number]): RouteVendorOption {
    return {
      vendorId: vendor.id,
      idVendedor: vendor.idVendedor,
      nombre: vendor.nombreVendedor,
      zona: vendor.zona,
      empresaId: vendor.empresaId,
      empresaNombre: vendor.empresaNombre ?? null,
      estado: 'ACTIVO',
    };
  }

  private mapDriver(driver: DriverStore['drivers'][number]): RouteDriverOption {
    return {
      driverId: driver.id,
      idConductor: driver.idConductor,
      nombre: driver.nombreConductor,
      empresaId: driver.empresaId,
      empresaNombre: driver.empresaNombre ?? null,
      estado: 'ACTIVO',
    };
  }

  private mapClient(client: ClientStore['clients'][number]): RouteAssignableClient {
    return {
      clientId: client.id,
      idCliente: client.idCliente,
      nombre: client.nombre,
      zona: client.zona?.trim() || '',
      ciudadNombre: client.ciudadNombre ?? null,
      empresaId: client.empresaId,
      empresaNombre: client.empresaNombre ?? null,
      estado: 'ACTIVO',
    };
  }

  private matchesFilters(route: Route, filters: Required<RouteFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [route.idRuta, route.nombreRuta, route.zona, route.vendedorNombre, route.conductorNombre]
        .some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || route.estado === filters.estado;
    const matchesZone = !filters.zona || route.zona === filters.zona;
    const matchesVendor = !filters.vendedorId || route.vendedorId === filters.vendedorId;
    const matchesDriver = !filters.conductorId || route.conductorId === filters.conductorId;

    return matchesSearch && matchesStatus && matchesZone && matchesVendor && matchesDriver;
  }

  private cloneRoute(route: Route): Route {
    return {
      ...route,
      clientesAsignados: route.clientesAsignados.map((client) => ({ ...client })),
      diasRuta: [...route.diasRuta],
      diasDespacho: [...route.diasDespacho],
      cantidadClientesAsignados: route.clientesAsignados.length,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt ?? null,
    };
  }

  private buildRouteId(idRuta: string, nombreRuta: string): string {
    const source = idRuta || nombreRuta;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `route-master-${slug}` : `route-master-${Date.now()}`;
  }
}

function normalizeFilters(filters: RouteFilters, companyId: string): Required<RouteFilters> {
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

function normalizePayload(payload: SaveRoutePayload, companyId: string): SaveRoutePayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    idRuta: payload.idRuta.trim().toUpperCase(),
    nombreRuta: payload.nombreRuta.trim(),
    zona: payload.zona.trim(),
    vendedorId: payload.vendedorId.trim(),
    vendedorNombre: payload.vendedorNombre?.trim() || '',
    conductorId: payload.conductorId.trim(),
    conductorNombre: payload.conductorNombre?.trim() || '',
    clientesAsignados: dedupeAssignedClients(payload.clientesAsignados),
    diasRuta: dedupeValues(payload.diasRuta),
    diasDespacho: dedupeValues(payload.diasDespacho),
    estado: payload.estado,
  };
}

function dedupeAssignedClients(assignments: RouteAssignedClient[]): RouteAssignedClient[] {
  const seenClientIds = new Set<string>();

  return assignments.filter((assignment) => {
    if (seenClientIds.has(assignment.clientId)) {
      return false;
    }

    seenClientIds.add(assignment.clientId);
    return true;
  });
}

function dedupeValues(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function buildAuditDraft(
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

function sanitizeAuditPayload(route: Route): Record<string, unknown> {
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
    clientesAsignados: route.clientesAsignados.map((client) => ({
      clientId: client.clientId,
      idCliente: client.idCliente,
      nombre: client.nombre,
      zona: client.zona,
    })),
    diasRuta: [...route.diasRuta],
    diasDespacho: [...route.diasDespacho],
    cantidadClientesAsignados: route.cantidadClientesAsignados,
    estado: route.estado,
    dependenciasActivas: route.tieneDependenciasActivas,
  };
}

function normalizeRouteStore(store: RouteStore): RouteStore {
  const initialRoutesById = new Map(INITIAL_ROUTES_STORE.routes.map((route) => [route.id, route]));
  const mergedRoutes = new Map<string, Route>();

  INITIAL_ROUTES_STORE.routes.forEach((route) => {
    mergedRoutes.set(route.id, structuredClone(route));
  });

  (store.routes ?? []).forEach((route) => {
    const baseline = initialRoutesById.get(route.id);

    mergedRoutes.set(route.id, {
      ...(baseline ? structuredClone(baseline) : {}),
      ...route,
    });
  });

  return {
    routes: Array.from(mergedRoutes.values()).map((route) => ({
      ...route,
      clientesAsignados: (route.clientesAsignados ?? []).map((client) => ({ ...client })),
      diasRuta: dedupeValues(route.diasRuta ?? []),
      diasDespacho: dedupeValues(route.diasDespacho ?? []),
      cantidadClientesAsignados: route.cantidadClientesAsignados ?? route.clientesAsignados?.length ?? 0,
      estado: route.estado ?? 'ACTIVO',
      tieneDependenciasActivas: route.tieneDependenciasActivas ?? false,
      empresaNombre: resolveCompanyDisplayName(route.empresaId, route.empresaNombre),
      updatedAt: route.updatedAt ?? null,
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function resolveCompanyDisplayName(companyId: string, currentName?: string | null): string {
  if (companyId === 'medussa-retail') {
    return 'Industrias Alimenticias El Arbolito';
  }

  return currentName?.trim() || 'Empresa activa';
}
