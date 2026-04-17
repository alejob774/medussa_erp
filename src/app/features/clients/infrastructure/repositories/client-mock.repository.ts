import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  normalizeZoneCatalog,
  resolveDefaultZoneByCityId,
  SHARED_ZONE_CATALOG,
} from '../../../../core/catalogs/data/zones.catalog';
import { normalizeCities, normalizeIdentificationTypes, normalizeText } from '../../application/mappers/client.mapper';
import { DEFAULT_CLIENT_FILTERS, ClientFilters } from '../../domain/models/client-filters.model';
import { SaveClientPayload } from '../../domain/models/client-form.model';
import { Client, ClientCatalogs, ClientStatus } from '../../domain/models/client.model';
import {
  ClientAuditDraft,
  ClientListResponse,
  ClientMutationAction,
  ClientMutationResult,
  ClientStore,
} from '../../domain/models/client-response.model';
import { ClientsRepository } from '../../domain/repositories/client.repository';
import { INITIAL_CLIENTS_STORE } from '../data/clients.mock';

@Injectable({
  providedIn: 'root',
})
export class ClientMockRepository implements ClientsRepository {
  private readonly storageKey = 'medussa.erp.mock.clients';

  getCatalogs(companyId: string): Observable<ClientCatalogs> {
    const store = this.readStore();
    const companyClients = store.clients.filter((client) => client.empresaId === companyId);
    const companyCityIds = new Set(companyClients.map((client) => client.ciudadId));
    const cities = normalizeCities(
      store.catalogs.cities.filter((city) => companyCityIds.has(city.id) || store.catalogs.cities.length > 0),
    );

    return of({
      identificationTypes: normalizeIdentificationTypes(store.catalogs.identificationTypes),
      cities: cities.length ? cities : normalizeCities(store.catalogs.cities),
      zones: normalizeZoneCatalog(store.catalogs.zones),
    }).pipe(delay(120));
  }

  listClients(companyId: string, filters: ClientFilters): Observable<ClientListResponse> {
    const normalizedFilters = normalizeFilters(filters, companyId);
    const clients = this.readStore().clients
      .map((client) => this.cloneClient(client))
      .filter((client) => client.empresaId === normalizedFilters.empresaId)
      .filter((client) => this.matchesFilters(client, normalizedFilters))
      .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es-CO'));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return of({
      items: clients.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: clients.length,
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    }).pipe(delay(220));
  }

  getClient(companyId: string, clientId: string): Observable<Client> {
    const client = this.readStore().clients.find(
      (item) => item.empresaId === companyId && item.id === clientId,
    );

    if (!client) {
      return throwError(() => new Error('No se encontró el cliente solicitado.'));
    }

    return of(this.cloneClient(client)).pipe(delay(150));
  }

  saveClient(
    companyId: string,
    payload: SaveClientPayload,
    clientId?: string,
  ): Observable<ClientMutationResult> {
    const store = this.readStore();
    const currentClient = clientId
      ? store.clients.find((client) => client.empresaId === companyId && client.id === clientId)
      : undefined;
    const validationError = this.validatePayload(store, companyId, payload, clientId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const normalizedPayload = normalizePayload(payload, companyId);
    const nextClient: Client = {
      id: currentClient?.id ?? this.buildClientId(normalizedPayload.idCliente, normalizedPayload.nombre),
      empresaId: companyId,
      empresaNombre: normalizedPayload.empresaNombre,
      idCliente: normalizedPayload.idCliente,
      tipoIdentificacion: normalizedPayload.tipoIdentificacion,
      nombre: normalizedPayload.nombre,
      nombreComercial: normalizedPayload.nombreComercial,
      ciudadId: normalizedPayload.ciudadId,
      ciudadNombre: normalizedPayload.ciudadNombre,
      direccion: normalizedPayload.direccion,
      telefono: normalizedPayload.telefono,
      email: normalizedPayload.email,
      estado: normalizedPayload.estado,
      createdAt: currentClient?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      zona: normalizedPayload.zona,
      tieneDependenciasActivas: currentClient?.tieneDependenciasActivas ?? false,
    };
    const nextClients = currentClient
      ? store.clients.map((client) =>
          client.empresaId === companyId && client.id === currentClient.id ? nextClient : client,
        )
      : [nextClient, ...store.clients];
    const action: ClientMutationAction = currentClient ? 'updated' : 'created';
    const auditDraft = buildAuditDraft(
      action === 'created' ? 'create' : 'edit',
      nextClient,
      action === 'created'
        ? `Creación del cliente ${nextClient.nombre}.`
        : `Actualización del cliente ${nextClient.nombre}.`,
      currentClient ? sanitizeAuditPayload(currentClient) : null,
      sanitizeAuditPayload(nextClient),
    );

    this.writeStore({
      ...store,
      clients: nextClients,
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<ClientMutationResult>({
      action,
      client: this.cloneClient(nextClient),
      message:
        action === 'created'
          ? `El cliente ${nextClient.nombre} fue creado correctamente.`
          : `El cliente ${nextClient.nombre} fue actualizado correctamente.`,
      auditDraft,
    }).pipe(delay(320));
  }

  deleteClient(companyId: string, clientId: string): Observable<ClientMutationResult> {
    const store = this.readStore();
    const currentClient = store.clients.find(
      (client) => client.empresaId === companyId && client.id === clientId,
    );

    if (!currentClient) {
      return throwError(() => new Error('No se encontró el cliente solicitado.'));
    }

    if (currentClient.tieneDependenciasActivas) {
      const nextClient: Client = {
        ...this.cloneClient(currentClient),
        estado: 'INACTIVO',
        updatedAt: new Date().toISOString(),
      };
      const auditDraft = buildAuditDraft(
        'deactivate',
        nextClient,
        `Inactivación preventiva del cliente ${nextClient.nombre} por dependencias activas.`,
        sanitizeAuditPayload(currentClient),
        sanitizeAuditPayload(nextClient),
      );

      this.writeStore({
        ...store,
        clients: store.clients.map((client) =>
          client.empresaId === companyId && client.id === clientId ? nextClient : client,
        ),
        auditTrail: [auditDraft, ...store.auditTrail],
      });

      return of<ClientMutationResult>({
        action: 'inactivated',
        client: this.cloneClient(nextClient),
        message:
          'El cliente tiene dependencias activas y fue marcado como inactivo en lugar de eliminarse.',
        auditDraft,
      }).pipe(delay(260));
    }

    const auditDraft = buildAuditDraft(
      'delete',
      currentClient,
      `Eliminación del cliente ${currentClient.nombre}.`,
      sanitizeAuditPayload(currentClient),
      null,
    );

    this.writeStore({
      ...store,
      clients: store.clients.filter(
        (client) => !(client.empresaId === companyId && client.id === clientId),
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<ClientMutationResult>({
      action: 'deleted',
      client: null,
      message: `El cliente ${currentClient.nombre} fue eliminado correctamente.`,
      auditDraft,
    }).pipe(delay(240));
  }

  updateClientStatus(
    companyId: string,
    clientId: string,
    status: ClientStatus,
  ): Observable<ClientMutationResult> {
    const store = this.readStore();
    const currentClient = store.clients.find(
      (client) => client.empresaId === companyId && client.id === clientId,
    );

    if (!currentClient) {
      return throwError(() => new Error('No se encontró el cliente solicitado.'));
    }

    const nextClient: Client = {
      ...this.cloneClient(currentClient),
      estado: status,
      updatedAt: new Date().toISOString(),
    };
    const action: ClientMutationAction = status === 'ACTIVO' ? 'activated' : 'inactivated';
    const auditDraft = buildAuditDraft(
      status === 'ACTIVO' ? 'activate' : 'deactivate',
      nextClient,
      status === 'ACTIVO'
        ? `Activación del cliente ${nextClient.nombre}.`
        : `Inactivación del cliente ${nextClient.nombre}.`,
      sanitizeAuditPayload(currentClient),
      sanitizeAuditPayload(nextClient),
    );

    this.writeStore({
      ...store,
      clients: store.clients.map((client) =>
        client.empresaId === companyId && client.id === clientId ? nextClient : client,
      ),
      auditTrail: [auditDraft, ...store.auditTrail],
    });

    return of<ClientMutationResult>({
      action,
      client: this.cloneClient(nextClient),
      message:
        status === 'ACTIVO'
          ? `El cliente ${nextClient.nombre} fue activado.`
          : `El cliente ${nextClient.nombre} fue inactivado.`,
      auditDraft,
    }).pipe(delay(220));
  }

  private readStore(): ClientStore {
    if (typeof window === 'undefined') {
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeStore(structuredClone(INITIAL_CLIENTS_STORE));
      return structuredClone(INITIAL_CLIENTS_STORE);
    }

    try {
      const normalizedStore = normalizeStore(JSON.parse(raw) as ClientStore);

      if (JSON.stringify(normalizedStore) !== raw) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      this.writeStore(structuredClone(INITIAL_CLIENTS_STORE));
      return structuredClone(INITIAL_CLIENTS_STORE);
    }
  }

  private writeStore(store: ClientStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private validatePayload(
    store: ClientStore,
    companyId: string,
    payload: SaveClientPayload,
    clientId?: string,
  ): string | null {
    const normalizedPayload = normalizePayload(payload, companyId);

    if (!normalizedPayload.empresaId) {
      return 'La empresa activa es obligatoria.';
    }

    if (!normalizedPayload.idCliente) {
      return 'El ID cliente es obligatorio.';
    }

    if (!normalizedPayload.tipoIdentificacion) {
      return 'El tipo de identificación es obligatorio.';
    }

    if (!normalizedPayload.nombre) {
      return 'El nombre del cliente es obligatorio.';
    }

    if (!normalizedPayload.ciudadId) {
      return 'La ciudad es obligatoria.';
    }

    if (!normalizedPayload.zona) {
      return 'La zona es obligatoria.';
    }

    if (!normalizedPayload.direccion) {
      return 'La dirección es obligatoria.';
    }

    if (normalizedPayload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.email)) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    const duplicatedIdCliente = store.clients.some(
      (client) =>
        client.empresaId === companyId &&
        client.id !== clientId &&
        normalizeText(client.idCliente) === normalizeText(normalizedPayload.idCliente),
    );

    if (duplicatedIdCliente) {
      return 'Ya existe un cliente con ese ID cliente en la empresa activa.';
    }

    return null;
  }

  private matchesFilters(client: Client, filters: Required<ClientFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        client.idCliente,
        client.nombre,
        client.nombreComercial ?? '',
        client.ciudadNombre ?? '',
        client.direccion,
        client.telefono ?? '',
        client.email ?? '',
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || client.estado === filters.estado;
    const matchesCity = !filters.ciudadId || client.ciudadId === filters.ciudadId;
    const matchesZone = !filters.zona || client.zona === filters.zona;

    return matchesSearch && matchesStatus && matchesCity && matchesZone;
  }

  private cloneClient(client: Client): Client {
    return {
      ...client,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt ?? null,
    };
  }

  private buildClientId(idCliente: string, nombre: string): string {
    const source = idCliente || nombre;
    const slug = source
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug ? `client-${slug}` : `client-${Date.now()}`;
  }
}

function normalizeFilters(filters: ClientFilters, companyId: string): Required<ClientFilters> {
  return {
    ...DEFAULT_CLIENT_FILTERS,
    ...filters,
    empresaId: filters.empresaId ?? companyId,
    estado: filters.estado ?? 'TODOS',
    ciudadId: filters.ciudadId ?? null,
    zona: filters.zona ?? null,
    search: filters.search?.trim() ?? '',
    page: filters.page ?? DEFAULT_CLIENT_FILTERS.page,
    pageSize: filters.pageSize ?? DEFAULT_CLIENT_FILTERS.pageSize,
  };
}

function normalizePayload(payload: SaveClientPayload, companyId: string): SaveClientPayload {
  return {
    empresaId: payload.empresaId || companyId,
    empresaNombre: payload.empresaNombre.trim(),
    idCliente: payload.idCliente.trim().toUpperCase(),
    tipoIdentificacion: payload.tipoIdentificacion.trim(),
    nombre: payload.nombre.trim(),
    nombreComercial: payload.nombreComercial?.trim() || null,
    ciudadId: payload.ciudadId,
    ciudadNombre: payload.ciudadNombre?.trim() || '',
    zona: payload.zona.trim(),
    direccion: payload.direccion.trim(),
    telefono: payload.telefono?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    estado: payload.estado,
  };
}

function buildAuditDraft(
  action: ClientAuditDraft['action'],
  client: Client,
  summary: string,
  beforePayload: Record<string, unknown> | null,
  afterPayload: Record<string, unknown> | null,
): ClientAuditDraft {
  return {
    module: 'clientes',
    action,
    companyId: client.empresaId,
    companyName: client.empresaNombre ?? 'Empresa activa',
    entityId: client.id,
    entityName: client.nombre,
    summary,
    occurredAt: new Date().toISOString(),
    beforePayload,
    afterPayload,
  };
}

function sanitizeAuditPayload(client: Client): Record<string, unknown> {
  return {
    id: client.id,
    empresaId: client.empresaId,
    idCliente: client.idCliente,
    tipoIdentificacion: client.tipoIdentificacion,
    nombre: client.nombre,
    nombreComercial: client.nombreComercial ?? null,
    ciudadId: client.ciudadId,
    ciudadNombre: client.ciudadNombre ?? null,
    zona: client.zona ?? null,
    direccion: client.direccion,
    telefono: client.telefono ?? null,
    email: client.email ?? null,
    estado: client.estado,
    dependenciasActivas: client.tieneDependenciasActivas,
  };
}

function normalizeStore(store: ClientStore): ClientStore {
  const normalizedZones = normalizeZoneCatalog(store.catalogs?.zones ?? SHARED_ZONE_CATALOG);

  return {
    ...store,
    catalogs: {
      identificationTypes: store.catalogs?.identificationTypes ?? structuredClone(INITIAL_CLIENTS_STORE.catalogs.identificationTypes),
      cities: store.catalogs?.cities ?? structuredClone(INITIAL_CLIENTS_STORE.catalogs.cities),
      zones: normalizedZones,
    },
    clients: (store.clients ?? []).map((client) => ({
      ...client,
      zona: client.zona?.trim() || resolveDefaultZoneByCityId(client.ciudadId),
    })),
    auditTrail: store.auditTrail ?? [],
  };
}