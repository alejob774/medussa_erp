import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  normalizeZoneCatalog,
  resolveDefaultZoneByCityId,
  SHARED_ZONE_CATALOG,
} from '../../../../core/catalogs/data/zones.catalog';
import { normalizeCities, normalizeText } from '../../../clients/application/mappers/client.mapper';
import { Client } from '../../../clients/domain/models/client.model';
import { ClientStore } from '../../../clients/domain/models/client-response.model';
import { INITIAL_CLIENTS_STORE } from '../../../clients/infrastructure/data/clients.mock';
import { DEFAULT_VENDOR_FILTERS, VendorFilters } from '../../domain/models/vendor-filters.model';
import { SaveVendorPayload } from '../../domain/models/vendor-form.model';
import {
  Vendor,
  VendorAssignedClient,
  VendorAssignableClient,
  VendorCatalogs,
  VendorStatus,
} from '../../domain/models/vendor.model';
import {
  VendorAuditDraft,
  VendorListResponse,
  VendorMutationAction,
  VendorMutationResult,
  VendorStore,
} from '../../domain/models/vendor-response.model';
import { VendorsRepository } from '../../domain/repositories/vendor.repository';
import { INITIAL_VENDORS_STORE } from '../data/vendors.mock';

@Injectable({
  providedIn: 'root',
})
export class VendorMockRepository implements VendorsRepository {
  private readonly storageKey = 'medussa.erp.mock.vendors';
  private readonly clientsStorageKey = 'medussa.erp.mock.clients';

  getCatalogs(companyId: string): Observable<VendorCatalogs> {
    const vendorStore = this.readStore();
    const clientsStore = this.readClientsStore();
    const companyClients = clientsStore.clients.filter((client) => client.empresaId === companyId);
    const companyCityIds = new Set(companyClients.map((client) => client.ciudadId).filter(Boolean));
    const cities = normalizeCities(
      clientsStore.catalogs.cities.filter(
        (city) => companyCityIds.has(city.id) || clientsStore.catalogs.cities.length > 0,
      ),
    );

    return of({
      cities: cities.length ? cities : normalizeCities(clientsStore.catalogs.cities),
      zones: normalizeZoneCatalog(clientsStore.catalogs.zones),
      vendorTypes: vendorStore.catalogs.vendorTypes.map((option) => ({ ...option })),
      channels: vendorStore.catalogs.channels.map((option) => ({ ...option })),
    }).pipe(delay(120));
  }

  listVendors(companyId: string, filters: VendorFilters): Observable<VendorListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const vendors = this.readStore().vendors
      .map((vendor) => this.cloneVendor(vendor))
      .filter((vendor) => vendor.empresaId === normalizedFilters.empresaId)
      .filter((vendor) => this.matchesFilters(vendor, normalizedFilters))
      .sort((left, right) => left.nombreVendedor.localeCompare(right.nombreVendedor, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: vendors.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: vendors.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  listAssignableClients(companyId: string, zone: string | null): Observable<VendorAssignableClient[]> {
    if (!zone) {
      return of([]).pipe(delay(90));
    }

    return of(this.buildAssignableClients(this.readClientsStore(), companyId, zone)).pipe(delay(140));
  }

  getVendor(companyId: string, vendorId: string): Observable<Vendor> {
    const vendor = this.readStore().vendors.find(
      (item) => item.empresaId === companyId && item.id === vendorId,
    );

    if (!vendor) {
      return throwError(() => new Error('No se encontró el vendedor solicitado.'));
    }

    return of(this.cloneVendor(vendor)).pipe(delay(150));
  }

  saveVendor(
    companyId: string,
    payload: SaveVendorPayload,
    vendorId?: string,
  ): Observable<VendorMutationResult> {
    const store = this.readStore();
    const clientsStore = this.readClientsStore();
    const currentVendor = vendorId
      ? store.vendors.find((vendor) => vendor.empresaId === companyId && vendor.id === vendorId)
      : undefined;
    const validationError = this.validatePayload(store, clientsStore, companyId, payload, vendorId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const resolvedAssignments = this.resolveAssignments(
      clientsStore,
      companyId,
      normalizedPayload.zona,
      normalizedPayload.clientesAsignados,
    );
    const nextVendor: Vendor = {
      id: currentVendor?.id ?? this.buildVendorId(normalizedPayload.idVendedor, normalizedPayload.nombreVendedor),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      idVendedor: normalizedPayload.idVendedor,
      nombreVendedor: normalizedPayload.nombreVendedor,
      tipoVendedor: normalizedPayload.tipoVendedor,
      zona: normalizedPayload.zona,
      canal: normalizedPayload.canal,
      cuotaMensual: normalizedPayload.cuotaMensual,
      ciudadId: normalizedPayload.ciudadId,
      ciudadNombre: normalizedPayload.ciudadNombre,
      direccion: normalizedPayload.direccion,
      celular: normalizedPayload.celular,
      email: normalizedPayload.email,
      clientesAsignados: resolvedAssignments,
      cantidadClientesAsignados: resolvedAssignments.length,
      estado: normalizedPayload.estado,
      createdAt: currentVendor?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tieneDependenciasActivas: currentVendor?.tieneDependenciasActivas ?? false,
    };
    const nextVendors = currentVendor
      ? store.vendors.map((vendor) =>
          vendor.empresaId === companyId && vendor.id === currentVendor.id ? nextVendor : vendor,
        )
      : [nextVendor, ...store.vendors];
    const action: VendorMutationAction = currentVendor ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextVendor,
      action === 'created'
        ? `Creación del vendedor ${nextVendor.nombreVendedor}.`
        : `Actualización del vendedor ${nextVendor.nombreVendedor}.`,
      currentVendor ? sanitizeAuditPayload(currentVendor) : null,
      sanitizeAuditPayload(nextVendor),
    );

    this.writeStore({
      ...store,
      vendors: nextVendors,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<VendorMutationResult>({
      action,
      vendor: this.cloneVendor(nextVendor),
      message:
        action === 'created'
          ? `El vendedor ${nextVendor.nombreVendedor} fue creado correctamente.`
          : `El vendedor ${nextVendor.nombreVendedor} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteVendor(companyId: string, vendorId: string): Observable<VendorMutationResult> {
    const store = this.readStore();
    const currentVendor = store.vendors.find(
      (vendor) => vendor.empresaId === companyId && vendor.id === vendorId,
    );

    if (!currentVendor) {
      return throwError(() => new Error('No se encontró el vendedor solicitado.'));
    }

    if (currentVendor.tieneDependenciasActivas) {
      const nextVendor: Vendor = {
        ...this.cloneVendor(currentVendor),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextVendor,
        `Inactivación preventiva del vendedor ${nextVendor.nombreVendedor} por dependencias activas.`,
        sanitizeAuditPayload(currentVendor),
        sanitizeAuditPayload(nextVendor),
      );

      this.writeStore({
        ...store,
        vendors: store.vendors.map((vendor) =>
          vendor.empresaId === companyId && vendor.id === vendorId ? nextVendor : vendor,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<VendorMutationResult>({
        action: 'inactivated',
        vendor: this.cloneVendor(nextVendor),
        message:
          'El vendedor tiene dependencias activas y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentVendor,
      `Eliminación del vendedor ${currentVendor.nombreVendedor}.`,
      sanitizeAuditPayload(currentVendor),
      null,
    );

    this.writeStore({
      ...store,
      vendors: store.vendors.filter(
        (vendor) => !(vendor.empresaId === companyId && vendor.id === vendorId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<VendorMutationResult>({
      action: 'deleted',
      vendor: null,
      message: `El vendedor ${currentVendor.nombreVendedor} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateVendorStatus(
    companyId: string,
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult> {
    const store = this.readStore();
    const currentVendor = store.vendors.find(
      (vendor) => vendor.empresaId === companyId && vendor.id === vendorId,
    );

    if (!currentVendor) {
      return throwError(() => new Error('No se encontró el vendedor solicitado.'));
    }

    const nextVendor: Vendor = {
      ...this.cloneVendor(currentVendor),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: VendorMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextVendor,
      status === 'ACTIVO'
        ? `Activación del vendedor ${nextVendor.nombreVendedor}.`
        : `Inactivación del vendedor ${nextVendor.nombreVendedor}.`,
      sanitizeAuditPayload(currentVendor),
      sanitizeAuditPayload(nextVendor),
    );

    this.writeStore({
      ...store,
      vendors: store.vendors.map((vendor) =>
        vendor.empresaId === companyId && vendor.id === vendorId ? nextVendor : vendor,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<VendorMutationResult>({
      action,
      vendor: this.cloneVendor(nextVendor),
      message:
        status === 'ACTIVO'
          ? `El vendedor ${nextVendor.nombreVendedor} fue activado.`
          : `El vendedor ${nextVendor.nombreVendedor} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): VendorStore {
    if (typeof window === 'undefined') {
      return normalizeVendorStore(structuredClone(INITIAL_VENDORS_STORE), normalizeClientsStore(structuredClone(INITIAL_CLIENTS_STORE)));
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      const normalizedInitialStore = normalizeVendorStore(
        structuredClone(INITIAL_VENDORS_STORE),
        this.readClientsStore(),
      );
      this.writeStore(normalizedInitialStore);
      return normalizedInitialStore;
    }

    try {
      const normalizedStore = normalizeVendorStore(
        JSON.parse(raw) as VendorStore,
        this.readClientsStore(),
      );

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      const normalizedInitialStore = normalizeVendorStore(
        structuredClone(INITIAL_VENDORS_STORE),
        this.readClientsStore(),
      );
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

  private writeStore(store: VendorStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: VendorStore,
    clientsStore: ClientStore,
    companyId: string,
    payload: SaveVendorPayload,
    vendorId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!normalizedPayload.empresaNombre) {
      return 'No fue posible resolver el nombre de la empresa activa.';
    }

    if (!normalizedPayload.idVendedor) {
      return 'El ID vendedor es obligatorio.';
    }

    if (!normalizedPayload.nombreVendedor) {
      return 'El nombre del vendedor es obligatorio.';
    }

    if (!normalizedPayload.tipoVendedor) {
      return 'El tipo de vendedor es obligatorio.';
    }

    if (!normalizedPayload.zona) {
      return 'La zona es obligatoria.';
    }

    if (!normalizedPayload.canal) {
      return 'El canal es obligatorio.';
    }

    if (!normalizedPayload.clientesAsignados.length) {
      return 'Debes asignar al menos un cliente al vendedor.';
    }

    if (normalizedPayload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.email)) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (normalizedPayload.cuotaMensual !== null && normalizedPayload.cuotaMensual !== undefined && normalizedPayload.cuotaMensual < 0) {
      return 'La cuota mensual no puede ser negativa.';
    }

    const duplicatedIdVendor = store.vendors.some(
      (vendor) =>
        vendor.empresaId === companyId &&
        vendor.id !== vendorId &&
        normalizeText(vendor.idVendedor) === normalizeText(normalizedPayload.idVendedor),
    );

    if (duplicatedIdVendor) {
      return 'Ya existe un vendedor con ese ID en la empresa activa.';
    }

    const assignedClientIds = normalizedPayload.clientesAsignados.map((client) => client.clientId);
    const uniqueClientIds = new Set(assignedClientIds);

    if (uniqueClientIds.size !== assignedClientIds.length) {
      return 'No puedes asignar clientes duplicados al mismo vendedor.';
    }

    const availableClients = this.buildAssignableClients(clientsStore, companyId, normalizedPayload.zona);
    const availableClientIds = new Set(availableClients.map((client) => client.clientId));
    const hasInvalidClient = assignedClientIds.some((clientId) => !availableClientIds.has(clientId));

    if (hasInvalidClient) {
      return 'Todos los clientes asignados deben estar activos y pertenecer a la misma zona del vendedor.';
    }

    return null;
  }

  private resolveAssignments(
    clientsStore: ClientStore,
    companyId: string,
    zone: string,
    assignments: VendorAssignedClient[],
  ): VendorAssignedClient[] {
    const availableClients = this.buildAssignableClients(clientsStore, companyId, zone);
    const availableClientMap = new Map(availableClients.map((client) => [client.clientId, client]));

    return assignments
      .map((assignment) => availableClientMap.get(assignment.clientId))
      .filter((client): client is VendorAssignableClient => client !== undefined)
      .map((client) => ({
        clientId: client.clientId,
        idCliente: client.idCliente,
        nombre: client.nombre,
        zona: client.zona,
        ciudadNombre: client.ciudadNombre ?? null,
      }));
  }

  private buildAssignableClients(
    clientsStore: ClientStore,
    companyId: string,
    zone: string,
  ): VendorAssignableClient[] {
    return clientsStore.clients
      .map((client) => ({
        ...client,
        zona: client.zona?.trim() || resolveDefaultZoneByCityId(client.ciudadId),
      }))
      .filter((client) => client.empresaId === companyId)
      .filter((client) => client.estado === 'ACTIVO')
      .filter((client) => client.zona === zone)
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'))
      .map((client) => this.mapClientToAssignableClient(client));
  }

  private mapClientToAssignableClient(client: Client): VendorAssignableClient {
    return {
      clientId: client.id,
      empresaId: client.empresaId,
      empresaNombre: client.empresaNombre,
      idCliente: client.idCliente,
      nombre: client.nombre,
      zona: client.zona?.trim() || resolveDefaultZoneByCityId(client.ciudadId),
      ciudadNombre: client.ciudadNombre ?? null,
      estado: 'ACTIVO',
    };
  }

  private matchesFilters(vendor: Vendor, filters: Required<VendorFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [vendor.idVendedor, vendor.nombreVendedor, vendor.tipoVendedor, vendor.zona, vendor.canal]
        .some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || vendor.estado === filters.estado;
    const matchesZone = !filters.zona || vendor.zona === filters.zona;
    const matchesChannel = !filters.canal || vendor.canal === filters.canal;

    return matchesSearch && matchesStatus && matchesZone && matchesChannel;
  }

  private cloneVendor(vendor: Vendor): Vendor {
    return {
      ...vendor,
      clientesAsignados: vendor.clientesAsignados.map((client) => ({ ...client })),
      cantidadClientesAsignados: vendor.clientesAsignados.length,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt ?? null,
    };
  }

  private buildVendorId(idVendedor: string, nombreVendedor: string): string {
    const source = idVendedor || nombreVendedor;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `vendor-${slug}` : `vendor-${Date.now()}`;
  }
}

function normalizeFilters(filters: VendorFilters, companyId: string): Required<VendorFilters> {
  return {
    ...DEFAULT_VENDOR_FILTERS,
    ...filters,
    empresaId: filters.empresaId ?? companyId,
    estado: filters.estado ?? 'TODOS',
    zona: filters.zona ?? null,
    canal: filters.canal ?? null,
    search: filters.search?.trim() ?? '',
    page: filters.page ?? DEFAULT_VENDOR_FILTERS.page,
    pageSize: filters.pageSize ?? DEFAULT_VENDOR_FILTERS.pageSize,
  };
}

function normalizePayload(payload: SaveVendorPayload, companyId: string): SaveVendorPayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    idVendedor: payload.idVendedor.trim().toUpperCase(),
    nombreVendedor: payload.nombreVendedor.trim(),
    tipoVendedor: payload.tipoVendedor.trim(),
    zona: payload.zona.trim(),
    canal: payload.canal.trim(),
    cuotaMensual: payload.cuotaMensual ?? null,
    ciudadId: payload.ciudadId?.trim() || null,
    ciudadNombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion?.trim() || null,
    celular: payload.celular?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    clientesAsignados: dedupeAssignments(payload.clientesAsignados),
    estado: payload.estado,
  };
}

function dedupeAssignments(assignments: VendorAssignedClient[]): VendorAssignedClient[] {
  const seenClientIds = new Set<string>();

  return assignments.filter((assignment) => {
    if (seenClientIds.has(assignment.clientId)) {
      return false;
    }

    seenClientIds.add(assignment.clientId);
    return true;
  });
}

function buildAuditDraft(
  action: VendorAuditDraft['action'],
  vendor: Vendor,
  summary: string,
  beforePayload: Record<string, unknown> | null,
  afterPayload: Record<string, unknown> | null,
): VendorAuditDraft {
  return {
    module: 'vendedores',
    action,
    companyId: vendor.empresaId,
    companyName: vendor.empresaNombre ?? 'Empresa activa',
    entityId: vendor.id,
    entityName: vendor.nombreVendedor,
    summary,
    occurredAt: new Date().toISOString(),
    beforePayload,
    afterPayload,
  };
}

function sanitizeAuditPayload(vendor: Vendor): Record<string, unknown> {
  return {
    id: vendor.id,
    empresaId: vendor.empresaId,
    idVendedor: vendor.idVendedor,
    nombreVendedor: vendor.nombreVendedor,
    tipoVendedor: vendor.tipoVendedor,
    zona: vendor.zona,
    canal: vendor.canal,
    cuotaMensual: vendor.cuotaMensual ?? null,
    ciudadId: vendor.ciudadId ?? null,
    ciudadNombre: vendor.ciudadNombre ?? null,
    direccion: vendor.direccion ?? null,
    celular: vendor.celular ?? null,
    email: vendor.email ?? null,
    estado: vendor.estado,
    clientesAsignados: vendor.clientesAsignados.map((client) => ({
      clientId: client.clientId,
      idCliente: client.idCliente,
      nombre: client.nombre,
      zona: client.zona,
    })),
    cantidadClientesAsignados: vendor.cantidadClientesAsignados,
    dependenciasActivas: vendor.tieneDependenciasActivas,
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
      zona: client.zona?.trim() || resolveDefaultZoneByCityId(client.ciudadId),
    })),
    auditTrail: store.auditTrail ?? [],
  };
}

function normalizeVendorStore(store: VendorStore, clientsStore: ClientStore): VendorStore {
  return {
    ...store,
    catalogs: {
      vendorTypes: store.catalogs?.vendorTypes ?? structuredClone(INITIAL_VENDORS_STORE.catalogs.vendorTypes),
      channels: store.catalogs?.channels ?? structuredClone(INITIAL_VENDORS_STORE.catalogs.channels),
    },
    vendors: (store.vendors ?? []).map((vendor) => {
      const normalizedZone = vendor.zona?.trim() || resolveDefaultZoneByCityId(vendor.ciudadId ?? null);
      const availableClients = clientsStore.clients
        .filter((client) => client.empresaId === vendor.empresaId)
        .filter((client) => client.estado === 'ACTIVO')
        .filter((client) => (client.zona?.trim() || resolveDefaultZoneByCityId(client.ciudadId)) === normalizedZone);
      const availableClientMap = new Map(availableClients.map((client) => [client.id, client]));
      const syncedAssignments = (vendor.clientesAsignados ?? [])
        .map((assignment) => availableClientMap.get(assignment.clientId))
        .filter((client): client is Client => client !== undefined)
        .map((client) => ({
          clientId: client.id,
          idCliente: client.idCliente,
          nombre: client.nombre,
          zona: client.zona?.trim() || normalizedZone,
          ciudadNombre: client.ciudadNombre ?? null,
        }));

      return {
        ...vendor,
        empresaNombre: resolveCompanyDisplayName(vendor.empresaId, vendor.empresaNombre),
        zona: normalizedZone,
        clientesAsignados: syncedAssignments,
        cantidadClientesAsignados: syncedAssignments.length,
        auditTrail: undefined,
      };
    }).map(({ auditTrail, ...vendor }) => vendor),
    auditTrail: store.auditTrail ?? [],
  };
}

function resolveCompanyDisplayName(companyId: string, currentName?: string | null): string {
  if (companyId === 'medussa-retail') {
    return 'Industrias Alimenticias El Arbolito';
  }

  return currentName?.trim() || 'Empresa activa';
}
