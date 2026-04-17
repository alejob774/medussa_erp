import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  normalizeZoneCatalog,
  SHARED_ZONE_CATALOG,
} from '../../../../core/catalogs/data/zones.catalog';
import { normalizeCities } from '../../../clients/application/mappers/client.mapper';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { normalizeText } from '../../application/mappers/driver.mapper';
import { DEFAULT_DRIVER_FILTERS, DriverFilters } from '../../domain/models/driver-filters.model';
import { SaveDriverPayload } from '../../domain/models/driver-form.model';
import {
  Driver,
  DriverAssignedRoute,
  DriverAssignableRoute,
  DriverCatalogs,
  DriverStatus,
} from '../../domain/models/driver.model';
import {
  DriverAuditDraft,
  DriverListResponse,
  DriverMutationAction,
  DriverMutationResult,
  DriverStore,
} from '../../domain/models/driver-response.model';
import { RouteCatalogItem } from '../../domain/models/route-catalog.model';
import { DriversRepository } from '../../domain/repositories/driver.repository';
import { INITIAL_DRIVERS_STORE } from '../data/drivers.mock';
import { INITIAL_ROUTE_CATALOG } from '../data/routes.mock';

@Injectable({
  providedIn: 'root',
})
export class DriverMockRepository implements DriversRepository {
  private readonly storageKey = 'medussa.erp.mock.drivers';
  private readonly clientsStorageKey = 'medussa.erp.mock.clients';

  getCatalogs(companyId: string): Observable<DriverCatalogs> {
    const store = this.readStore();
    const clientsStore = this.readClientsStore();
    const companyRoutes = store.catalogs.routes
      .filter((route) => route.empresaId === companyId)
      .map((route) => ({ ...route }));

    return of({
      cities: normalizeCities(clientsStore.catalogs.cities),
      zones: normalizeZoneCatalog(clientsStore.catalogs.zones),
      documentTypes: store.catalogs.documentTypes.map((option) => ({ ...option })),
      licenseCategories: store.catalogs.licenseCategories.map((option) => ({ ...option })),
      routes: companyRoutes,
    }).pipe(delay(120));
  }

  listDrivers(companyId: string, filters: DriverFilters): Observable<DriverListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const drivers = this.readStore().drivers
      .map((driver) => this.cloneDriver(driver))
      .filter((driver) => driver.empresaId === normalizedFilters.empresaId)
      .filter((driver) => this.matchesFilters(driver, normalizedFilters))
      .sort((left, right) => left.nombreConductor.localeCompare(right.nombreConductor, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: drivers.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: drivers.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  listAssignableRoutes(companyId: string): Observable<DriverAssignableRoute[]> {
    return of(this.buildAssignableRoutes(this.readStore(), companyId)).pipe(delay(150));
  }

  getDriver(companyId: string, driverId: string): Observable<Driver> {
    const driver = this.readStore().drivers.find(
      (item) => item.empresaId === companyId && item.id === driverId,
    );

    if (!driver) {
      return throwError(() => new Error('No se encontró el conductor solicitado.'));
    }

    return of(this.cloneDriver(driver)).pipe(delay(150));
  }

  saveDriver(
    companyId: string,
    payload: SaveDriverPayload,
    driverId?: string,
  ): Observable<DriverMutationResult> {
    const store = this.readStore();
    const currentDriver = driverId
      ? store.drivers.find((driver) => driver.empresaId === companyId && driver.id === driverId)
      : undefined;
    const validationError = this.validatePayload(store, companyId, payload, driverId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const resolvedAssignments = this.resolveAssignments(
      store,
      companyId,
      normalizedPayload.rutasAsignadas,
    );
    const selectedRouteIds = new Set(resolvedAssignments.map((route) => route.routeId));
    const nextDriver: Driver = {
      id:
        currentDriver?.id ??
        this.buildDriverId(normalizedPayload.idConductor, normalizedPayload.nombreConductor),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      idConductor: normalizedPayload.idConductor,
      nombreConductor: normalizedPayload.nombreConductor,
      tipoDocumento: normalizedPayload.tipoDocumento,
      numeroDocumento: normalizedPayload.numeroDocumento,
      ciudadId: normalizedPayload.ciudadId,
      ciudadNombre: normalizedPayload.ciudadNombre,
      direccion: normalizedPayload.direccion,
      celular: normalizedPayload.celular,
      email: normalizedPayload.email,
      numeroLicencia: normalizedPayload.numeroLicencia,
      categoriaLicencia: normalizedPayload.categoriaLicencia,
      vencimientoLicencia: normalizedPayload.vencimientoLicencia,
      rutasAsignadas: resolvedAssignments,
      cantidadRutasAsignadas: resolvedAssignments.length,
      estado: normalizedPayload.estado,
      createdAt: currentDriver?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tieneDependenciasActivas: currentDriver?.tieneDependenciasActivas ?? false,
    };

    const driversWithoutReassignedRoutes = store.drivers.map((driver) => {
      if (driver.empresaId !== companyId || driver.id === currentDriver?.id) {
        return this.cloneDriver(driver);
      }

      const filteredRoutes = driver.rutasAsignadas.filter(
        (route) => !selectedRouteIds.has(route.routeId),
      );

      if (filteredRoutes.length === driver.rutasAsignadas.length) {
        return this.cloneDriver(driver);
      }

      return {
        ...this.cloneDriver(driver),
        rutasAsignadas: filteredRoutes,
        cantidadRutasAsignadas: filteredRoutes.length,
        updatedAt: new Date().toISOString(),
      };
    });

    const nextDrivers = currentDriver
      ? driversWithoutReassignedRoutes.map((driver) =>
          driver.empresaId === companyId && driver.id === currentDriver.id ? nextDriver : driver,
        )
      : [nextDriver, ...driversWithoutReassignedRoutes];
    const action: DriverMutationAction = currentDriver ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextDriver,
      action === 'created'
        ? `Creación del conductor ${nextDriver.nombreConductor}.`
        : `Actualización del conductor ${nextDriver.nombreConductor}.`,
      currentDriver ? sanitizeAuditPayload(currentDriver) : null,
      sanitizeAuditPayload(nextDriver),
    );

    this.writeStore({
      ...store,
      drivers: nextDrivers,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DriverMutationResult>({
      action,
      driver: this.cloneDriver(nextDriver),
      message:
        action === 'created'
          ? `El conductor ${nextDriver.nombreConductor} fue creado correctamente.`
          : `El conductor ${nextDriver.nombreConductor} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteDriver(companyId: string, driverId: string): Observable<DriverMutationResult> {
    const store = this.readStore();
    const currentDriver = store.drivers.find(
      (driver) => driver.empresaId === companyId && driver.id === driverId,
    );

    if (!currentDriver) {
      return throwError(() => new Error('No se encontró el conductor solicitado.'));
    }

    if (currentDriver.tieneDependenciasActivas) {
      const nextDriver: Driver = {
        ...this.cloneDriver(currentDriver),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextDriver,
        `Inactivación preventiva del conductor ${nextDriver.nombreConductor} por dependencias activas.`,
        sanitizeAuditPayload(currentDriver),
        sanitizeAuditPayload(nextDriver),
      );

      this.writeStore({
        ...store,
        drivers: store.drivers.map((driver) =>
          driver.empresaId === companyId && driver.id === driverId ? nextDriver : driver,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<DriverMutationResult>({
        action: 'inactivated',
        driver: this.cloneDriver(nextDriver),
        message:
          'El conductor tiene dependencias activas y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentDriver,
      `Eliminación del conductor ${currentDriver.nombreConductor}.`,
      sanitizeAuditPayload(currentDriver),
      null,
    );

    this.writeStore({
      ...store,
      drivers: store.drivers.filter(
        (driver) => !(driver.empresaId === companyId && driver.id === driverId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DriverMutationResult>({
      action: 'deleted',
      driver: null,
      message: `El conductor ${currentDriver.nombreConductor} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateDriverStatus(
    companyId: string,
    driverId: string,
    status: DriverStatus,
  ): Observable<DriverMutationResult> {
    const store = this.readStore();
    const currentDriver = store.drivers.find(
      (driver) => driver.empresaId === companyId && driver.id === driverId,
    );

    if (!currentDriver) {
      return throwError(() => new Error('No se encontró el conductor solicitado.'));
    }

    const nextDriver: Driver = {
      ...this.cloneDriver(currentDriver),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: DriverMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextDriver,
      status === 'ACTIVO'
        ? `Activación del conductor ${nextDriver.nombreConductor}.`
        : `Inactivación del conductor ${nextDriver.nombreConductor}.`,
      sanitizeAuditPayload(currentDriver),
      sanitizeAuditPayload(nextDriver),
    );

    this.writeStore({
      ...store,
      drivers: store.drivers.map((driver) =>
        driver.empresaId === companyId && driver.id === driverId ? nextDriver : driver,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<DriverMutationResult>({
      action,
      driver: this.cloneDriver(nextDriver),
      message:
        status === 'ACTIVO'
          ? `El conductor ${nextDriver.nombreConductor} fue activado.`
          : `El conductor ${nextDriver.nombreConductor} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): DriverStore {
    if (typeof window === 'undefined') {
      return normalizeDriverStore(structuredClone(INITIAL_DRIVERS_STORE));
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      const normalizedInitialStore = normalizeDriverStore(structuredClone(INITIAL_DRIVERS_STORE));
      this.writeStore(normalizedInitialStore);
      return normalizedInitialStore;
    }

    try {
      const normalizedStore = normalizeDriverStore(JSON.parse(raw) as DriverStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      const normalizedInitialStore = normalizeDriverStore(structuredClone(INITIAL_DRIVERS_STORE));
      this.writeStore(normalizedInitialStore);
      return normalizedInitialStore;
    }
  }

  private readClientsStore(): ClientStore {
    if (typeof window === 'undefined') {
      return normalizeClientsStore(structuredClone(INITIAL_CLIENTS_STORE));
    }

    const raw = localStorage.getItem(this.clientsStorageKey);

    if (!raw) {
      return normalizeClientsStore(structuredClone(INITIAL_CLIENTS_STORE));
    }

    try {
      return normalizeClientsStore(JSON.parse(raw) as ClientStore);
    } catch {
      return normalizeClientsStore(structuredClone(INITIAL_CLIENTS_STORE));
    }
  }

  private writeStore(store: DriverStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: DriverStore,
    companyId: string,
    payload: SaveDriverPayload,
    driverId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!normalizedPayload.empresaNombre) {
      return 'No fue posible resolver el nombre de la empresa activa.';
    }

    if (!normalizedPayload.idConductor) {
      return 'El ID conductor es obligatorio.';
    }

    if (!normalizedPayload.nombreConductor) {
      return 'El nombre del conductor es obligatorio.';
    }

    if (!normalizedPayload.tipoDocumento) {
      return 'El tipo de documento es obligatorio.';
    }

    if (!normalizedPayload.rutasAsignadas.length) {
      return 'Debes asignar al menos una ruta al conductor.';
    }

    if (!normalizedPayload.estado) {
      return 'El estado es obligatorio.';
    }

    if (
      normalizedPayload.numeroDocumento &&
      !/^[A-Z0-9-]{5,20}$/i.test(normalizedPayload.numeroDocumento)
    ) {
      return 'El número de documento debe tener entre 5 y 20 caracteres alfanuméricos.';
    }

    if (normalizedPayload.celular && !/^\+?[0-9]{7,15}$/.test(normalizedPayload.celular)) {
      return 'El celular debe contener entre 7 y 15 dígitos.';
    }

    if (normalizedPayload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.email)) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (
      normalizedPayload.vencimientoLicencia &&
      Number.isNaN(new Date(normalizedPayload.vencimientoLicencia).getTime())
    ) {
      return 'La fecha de vencimiento de la licencia no es válida.';
    }

    const duplicatedIdDriver = store.drivers.some(
      (driver) =>
        driver.empresaId === companyId &&
        driver.id !== driverId &&
        normalizeText(driver.idConductor) === normalizeText(normalizedPayload.idConductor),
    );

    if (duplicatedIdDriver) {
      return 'Ya existe un conductor con ese ID en la empresa activa.';
    }

    const assignedRouteIds = normalizedPayload.rutasAsignadas.map((route) => route.routeId);
    const uniqueRouteIds = new Set(assignedRouteIds);

    if (uniqueRouteIds.size !== assignedRouteIds.length) {
      return 'No puedes asignar rutas duplicadas al mismo conductor.';
    }

    const activeRouteIds = new Set(
      store.catalogs.routes
        .filter((route) => route.empresaId === companyId && route.estado === 'ACTIVO')
        .map((route) => route.routeId),
    );
    const hasInvalidRoute = assignedRouteIds.some((routeId) => !activeRouteIds.has(routeId));

    if (hasInvalidRoute) {
      return 'Todas las rutas asignadas deben estar activas y pertenecer a la empresa activa.';
    }

    return null;
  }

  private resolveAssignments(
    store: DriverStore,
    companyId: string,
    assignments: DriverAssignedRoute[],
  ): DriverAssignedRoute[] {
    const routeMap = new Map(
      store.catalogs.routes
        .filter((route) => route.empresaId === companyId && route.estado === 'ACTIVO')
        .map((route) => [route.routeId, route]),
    );

    return assignments
      .map((assignment) => routeMap.get(assignment.routeId))
      .filter((route): route is RouteCatalogItem => route !== undefined)
      .map((route) => ({
        routeId: route.routeId,
        idRuta: route.idRuta,
        nombreRuta: route.nombreRuta,
        zona: route.zona,
        estado: 'ACTIVO',
      }));
  }

  private buildAssignableRoutes(store: DriverStore, companyId: string): DriverAssignableRoute[] {
    const assignedRouteOwners = new Map<string, Driver>();

    store.drivers
      .filter((driver) => driver.empresaId === companyId)
      .forEach((driver) => {
        driver.rutasAsignadas.forEach((route) => {
          if (!assignedRouteOwners.has(route.routeId)) {
            assignedRouteOwners.set(route.routeId, driver);
          }
        });
      });

    return store.catalogs.routes
      .filter((route) => route.empresaId === companyId)
      .filter((route) => route.estado === 'ACTIVO')
      .sort((left, right) => left.nombreRuta.localeCompare(right.nombreRuta, 'es-CO'))
      .map((route) => {
        const assignedDriver = assignedRouteOwners.get(route.routeId);

        return {
          routeId: route.routeId,
          idRuta: route.idRuta,
          nombreRuta: route.nombreRuta,
          zona: route.zona,
          estado: 'ACTIVO',
          empresaId: route.empresaId,
          empresaNombre: route.empresaNombre ?? undefined,
          assignedDriverId: assignedDriver?.id ?? null,
          assignedDriverCode: assignedDriver?.idConductor ?? null,
          assignedDriverName: assignedDriver?.nombreConductor ?? null,
        } satisfies DriverAssignableRoute;
      });
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

  private cloneDriver(driver: Driver): Driver {
    return {
      ...driver,
      rutasAsignadas: driver.rutasAsignadas.map((route) => ({ ...route })),
      cantidadRutasAsignadas: driver.rutasAsignadas.length,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt ?? null,
    };
  }

  private buildDriverId(idConductor: string, nombreConductor: string): string {
    const source = idConductor || nombreConductor;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `driver-${slug}` : `driver-${Date.now()}`;
  }
}

function normalizeFilters(filters: DriverFilters, companyId: string): Required<DriverFilters> {
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

function normalizePayload(payload: SaveDriverPayload, companyId: string): SaveDriverPayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    idConductor: payload.idConductor.trim().toUpperCase(),
    nombreConductor: payload.nombreConductor.trim(),
    tipoDocumento: payload.tipoDocumento.trim(),
    numeroDocumento: payload.numeroDocumento?.trim().toUpperCase() || null,
    ciudadId: payload.ciudadId?.trim() || null,
    ciudadNombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion?.trim() || null,
    celular: payload.celular?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    numeroLicencia: payload.numeroLicencia?.trim() || null,
    categoriaLicencia: payload.categoriaLicencia?.trim() || null,
    vencimientoLicencia: payload.vencimientoLicencia?.trim() || null,
    rutasAsignadas: dedupeAssignments(payload.rutasAsignadas),
    estado: payload.estado,
  };
}

function dedupeAssignments(assignments: DriverAssignedRoute[]): DriverAssignedRoute[] {
  const seenRouteIds = new Set<string>();

  return assignments.filter((assignment) => {
    if (seenRouteIds.has(assignment.routeId)) {
      return false;
    }

    seenRouteIds.add(assignment.routeId);
    return true;
  });
}

function buildAuditDraft(
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

function sanitizeAuditPayload(driver: Driver): Record<string, unknown> {
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
    rutasAsignadas: driver.rutasAsignadas.map((route) => ({
      routeId: route.routeId,
      idRuta: route.idRuta,
      nombreRuta: route.nombreRuta,
      zona: route.zona,
    })),
    cantidadRutasAsignadas: driver.cantidadRutasAsignadas,
    estado: driver.estado,
    dependenciasActivas: driver.tieneDependenciasActivas,
  };
}

function normalizeClientsStore(store: ClientStore): ClientStore {
  return {
    ...store,
    catalogs: {
      identificationTypes:
        store.catalogs?.identificationTypes ?? structuredClone(INITIAL_CLIENTS_STORE.catalogs.identificationTypes),
      cities: store.catalogs?.cities ?? structuredClone(INITIAL_CLIENTS_STORE.catalogs.cities),
      zones: normalizeZoneCatalog(store.catalogs?.zones ?? SHARED_ZONE_CATALOG),
    },
    clients: (store.clients ?? []).map((client) => ({
      ...client,
      empresaNombre: resolveCompanyDisplayName(client.empresaId, client.empresaNombre),
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function normalizeDriverStore(store: DriverStore): DriverStore {
  const normalizedRoutes = normalizeRoutes([
    ...INITIAL_ROUTE_CATALOG,
    ...(store.catalogs?.routes ?? []),
  ]);
  const initialDriversById = new Map(INITIAL_DRIVERS_STORE.drivers.map((driver) => [driver.id, driver]));
  const mergedDrivers = new Map<string, DriverStore['drivers'][number]>();

  INITIAL_DRIVERS_STORE.drivers.forEach((driver) => {
    mergedDrivers.set(driver.id, structuredClone(driver));
  });

  (store.drivers ?? []).forEach((driver) => {
    const baseline = initialDriversById.get(driver.id);

    mergedDrivers.set(driver.id, {
      ...(baseline ? structuredClone(baseline) : {}),
      ...driver,
      rutasAsignadas: (driver.rutasAsignadas ?? baseline?.rutasAsignadas ?? []).map((route) => ({
        ...route,
        estado: 'ACTIVO' as const,
      })),
    });
  });

  const normalizedDrivers = Array.from(mergedDrivers.values());
  const routeLookup = new Map(normalizedRoutes.map((route) => [route.routeId, route]));
  const seenRouteIds = new Set<string>();

  return {
    ...store,
    catalogs: {
      documentTypes:
        store.catalogs?.documentTypes ?? structuredClone(INITIAL_DRIVERS_STORE.catalogs.documentTypes),
      licenseCategories:
        store.catalogs?.licenseCategories ?? structuredClone(INITIAL_DRIVERS_STORE.catalogs.licenseCategories),
      routes: normalizedRoutes,
    },
    drivers: normalizedDrivers.map((driver) => {
      const syncedRoutes = driver.rutasAsignadas
        .map((assignment) => routeLookup.get(assignment.routeId))
        .filter((route): route is RouteCatalogItem => route !== undefined)
        .filter((route) => route.empresaId === driver.empresaId && route.estado === 'ACTIVO')
        .filter((route) => {
          if (seenRouteIds.has(route.routeId)) {
            return false;
          }

          seenRouteIds.add(route.routeId);
          return true;
        })
        .map((route) => ({
          routeId: route.routeId,
          idRuta: route.idRuta,
          nombreRuta: route.nombreRuta,
          zona: route.zona,
          estado: 'ACTIVO' as const,
        }));

      return {
        ...driver,
        empresaNombre: resolveCompanyDisplayName(driver.empresaId, driver.empresaNombre),
        tipoDocumento: driver.tipoDocumento?.trim() || 'CC',
        rutasAsignadas: syncedRoutes,
        cantidadRutasAsignadas: syncedRoutes.length,
        numeroDocumento: driver.numeroDocumento?.trim() || null,
        ciudadId: driver.ciudadId?.trim() || null,
        ciudadNombre: driver.ciudadNombre?.trim() || null,
        direccion: driver.direccion?.trim() || null,
        celular: driver.celular?.trim() || null,
        email: driver.email?.trim().toLowerCase() || null,
        numeroLicencia: driver.numeroLicencia?.trim() || null,
        categoriaLicencia: driver.categoriaLicencia?.trim() || null,
        vencimientoLicencia: driver.vencimientoLicencia?.trim() || null,
      };
    }),
    auditTrail: store.auditTrail ?? [],
  };
}

function normalizeRoutes(routes: RouteCatalogItem[]): RouteCatalogItem[] {
  const seen = new Set<string>();

  return routes
    .map((route) => ({
      routeId: route.routeId,
      idRuta: route.idRuta,
      nombreRuta: route.nombreRuta,
      zona: route.zona,
      estado: route.estado ?? 'ACTIVO',
      empresaId: route.empresaId,
      empresaNombre: resolveCompanyDisplayName(route.empresaId, route.empresaNombre),
    }))
    .filter((route) => {
      if (!route.routeId || !route.empresaId) {
        return false;
      }

      const key = `${route.empresaId}:${route.routeId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function resolveCompanyDisplayName(companyId: string, currentName?: string | null): string {
  if (companyId === 'medussa-retail') {
    return 'Industrias Alimenticias El Arbolito';
  }

  return currentName?.trim() || 'Empresa activa';
}
