import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendClientDto,
  extractArrayPayload,
  mapBackendClientToClient,
  mapClientPayloadToBackend,
  normalizeText,
} from '../../application/mappers/client.mapper';
import { DEFAULT_CLIENT_FILTERS, ClientFilters } from '../../domain/models/client-filters.model';
import { SaveClientPayload } from '../../domain/models/client-form.model';
import { Client, ClientCatalogs, ClientStatus } from '../../domain/models/client.model';
import {
  ClientAuditDraft,
  ClientListResponse,
  ClientMutationAction,
  ClientMutationResult,
} from '../../domain/models/client-response.model';
import { ClientsRepository } from '../../domain/repositories/client.repository';
import { ClientMockRepository } from './client-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class ClientApiRepository implements ClientsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(ClientMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  getCatalogs(companyId: string): Observable<ClientCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listClients(companyId: string, filters: ClientFilters): Observable<ClientListResponse> {
    if (!this.canUseBackendForCompany(companyId)) {
      return this.mockRepository.listClients(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.http
          .get<unknown>(this.withTrailingSlash(this.baseUrl))
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listClients(companyId, filters),
      'catálogo de clientes',
    );
  }

  getClient(companyId: string, clientId: string): Observable<Client> {
    if (!this.canUseBackendForCompany(companyId)) {
      return this.mockRepository.getClient(companyId, clientId);
    }

    return this.withFallback(
      () => this.loadClient(companyId, clientId),
      () => this.mockRepository.getClient(companyId, clientId),
      'cliente',
    );
  }

  saveClient(
    companyId: string,
    payload: SaveClientPayload,
    clientId?: string,
  ): Observable<ClientMutationResult> {
    if (!this.canUseBackendForCompany(companyId)) {
      return this.mockRepository.saveClient(companyId, payload, clientId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapClientPayloadToBackend(payload);

        if (clientId) {
          return this.resolveClientRequestId(companyId, clientId).pipe(
            switchMap((requestClientId) =>
              this.http
                .patch<BackendClientDto | void>(
                  `${this.withTrailingSlash(this.baseUrl)}${requestClientId}`,
                  requestBody,
                )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedClient(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      clientId,
                      requestClientId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.http
          .post<BackendClientDto>(this.withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((response) =>
              this.resolveSavedClient(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveClient(companyId, payload, clientId),
      clientId ? 'actualización de cliente' : 'creación de cliente',
    );
  }

  deleteClient(companyId: string, clientId: string): Observable<ClientMutationResult> {
    if (!this.canUseBackendForCompany(companyId)) {
      return this.mockRepository.deleteClient(companyId, clientId);
    }

    return this.withFallback(
      () =>
        this.resolveClientRequestId(companyId, clientId).pipe(
          switchMap((requestClientId) =>
            this.http
              .delete<unknown>(`${this.withTrailingSlash(this.baseUrl)}${requestClientId}`)
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, clientId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, clientId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteClient(companyId, clientId),
      'eliminación de cliente',
    );
  }

  updateClientStatus(
    companyId: string,
    clientId: string,
    status: ClientStatus,
  ): Observable<ClientMutationResult> {
    if (!this.canUseBackendForCompany(companyId)) {
      return this.mockRepository.updateClientStatus(companyId, clientId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, clientId, status),
      () => this.mockRepository.updateClientStatus(companyId, clientId, status),
      'estado de cliente',
    );
  }

  private loadClient(companyId: string, clientId: string): Observable<Client> {
    return this.resolveClientRequestId(companyId, clientId).pipe(
      switchMap((requestClientId) =>
        this.http
          .get<BackendClientDto>(`${this.withTrailingSlash(this.baseUrl)}${requestClientId}`)
          .pipe(
            map((client) =>
              mapBackendClientToClient(client, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: ClientFilters,
  ): ClientListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const clients = extractArrayPayload<BackendClientDto>(payload)
      .map((client) =>
        mapBackendClientToClient(client, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((client) => this.matchesFilters(client, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: clients.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: this.resolveTotal(payload, clients.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedClient(
    companyId: string,
    response: BackendClientDto | void,
    action: Extract<ClientMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<ClientMutationResult> {
    if (response) {
      const client = mapBackendClientToClient(response, companyId, companyName);
      return of(this.buildMutationResult(action, client));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el cliente guardado.'));
    }

    return this.loadClient(companyId, candidateId).pipe(
      map((client) => this.buildMutationResult(action, client)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    clientId: string,
    status: ClientStatus,
  ): Observable<ClientMutationResult> {
    return this.loadClient(companyId, clientId).pipe(
      switchMap((client) =>
        this.resolveClientRequestId(companyId, clientId).pipe(
          switchMap((requestClientId) =>
            this.http
              .patch<BackendClientDto | void>(
                `${this.withTrailingSlash(this.baseUrl)}${requestClientId}`,
                mapClientPayloadToBackend(this.buildStatusPayload(client, status)),
              )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedClient(
                    companyId,
                    response,
                    'updated',
                    client.empresaNombre ?? 'Empresa activa',
                    client.id,
                    requestClientId,
                  ),
                ),
                map((result): ClientMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El cliente ${result.client?.nombre ?? client.nombre} fue activado.`
                      : `El cliente ${result.client?.nombre ?? client.nombre} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.client ?? { ...client, estado: status },
                    status === 'ACTIVO'
                      ? `Activación del cliente ${client.nombre}.`
                      : `Inactivación del cliente ${client.nombre}.`,
                    this.sanitizeAuditPayload(client),
                    this.sanitizeAuditPayload(result.client ?? { ...client, estado: status }),
                  ),
                })),
              ),
          ),
        ),
      ),
    );
  }

  private buildStatusPayload(client: Client, status: ClientStatus): SaveClientPayload {
    return {
      empresaId: client.empresaId,
      empresaNombre: client.empresaNombre ?? 'Empresa activa',
      idCliente: client.idCliente,
      tipoIdentificacion: client.tipoIdentificacion,
      nombre: client.nombre,
      nombreComercial: client.nombreComercial ?? null,
      ciudadId: client.ciudadId,
      ciudadNombre: client.ciudadNombre ?? '',
      zona: client.zona ?? '',
      direccion: client.direccion,
      telefono: client.telefono ?? null,
      email: client.email ?? null,
      estado: status,
    };
  }

  private mapDeleteResponse(
    companyId: string,
    clientId: string,
    response: unknown,
  ): ClientMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const client = mapBackendClientToClient(
        response as BackendClientDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: ClientMutationAction = client.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        client: action === 'deleted' ? null : client,
        message:
          action === 'inactivated'
            ? 'El backend reportó que el cliente fue inactivado por dependencias operativas.'
            : `El cliente ${client.nombre} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          client,
          action === 'inactivated'
            ? `Inactivación del cliente ${client.nombre} reportada por backend.`
            : `Eliminación del cliente ${client.nombre}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(client),
        ),
      };
    }

    const auditClient: Client = {
      id: clientId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      idCliente: clientId,
      tipoIdentificacion: '',
      nombre: 'Cliente eliminado',
      nombreComercial: null,
      ciudadId: '',
      ciudadNombre: '',
      zona: null,
      direccion: '',
      telefono: null,
      email: null,
      estado: 'INACTIVO',
      createdAt: undefined,
      updatedAt: null,
      tieneDependenciasActivas: false,
    };

    return {
      action: 'deleted',
      client: null,
      message: 'El cliente fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft(
        'delete',
        auditClient,
        `Eliminación del cliente ${clientId}.`,
        null,
        null,
      ),
    };
  }

  private resolveClientRequestId(companyId: string, clientId: string): Observable<string> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.baseUrl))
      .pipe(
        map((response) => {
          const client = extractArrayPayload<BackendClientDto>(response).find((candidate) =>
            this.matchesClientReference(candidate, clientId),
          );

          return this.resolveNullableText(
            client?.id,
            client?.cliente_id,
            client?.id_cli,
            client?.id_cliente,
          ) ?? clientId;
        }),
      );
  }

  private matchesClientReference(client: BackendClientDto, clientId: string): boolean {
    const normalizedClientId = clientId.trim();
    const candidates = [
      this.resolveNullableText(client.id),
      this.resolveNullableText(client.cliente_id),
      this.resolveNullableText(client.id_cli),
      this.resolveNullableText(client.id_cliente),
      this.resolveNullableText(client.customer_code),
    ];

    return candidates.includes(normalizedClientId);
  }

  private normalizeFilters(filters: ClientFilters, companyId: string): Required<ClientFilters> {
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

  private resolveTotal(payload: unknown, fallback: number): number {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const candidate = payload as { total?: number; count?: number };
      return candidate.total ?? candidate.count ?? fallback;
    }

    return fallback;
  }

  private resolveCompanyName(companyId: string): string {
    return (
      this.authSessionService
        .getSession()
        ?.companies?.find(
          (company) => company.id === companyId || company.backendId === companyId,
        )?.name ?? 'Empresa activa'
    );
  }

  private canUseBackendForCompany(companyId: string): boolean {
    const sessionCompany = this.authSessionService
      .getSession()
      ?.companies?.find((candidate) => candidate.id === companyId);
    const backendCompanyId = sessionCompany?.backendId ?? null;

    return companyId === 'medussa-retail' || backendCompanyId === 'EMP-002';
  }

  private shouldInactivateInstead(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const detail = this.extractBackendDetail(error).toLowerCase();
    return error.status === 409 || detail.includes('depend') || detail.includes('inactiv');
  }

  private buildMutationResult(
    action: Extract<ClientMutationAction, 'created' | 'updated'>,
    client: Client,
  ): ClientMutationResult {
    return {
      action,
      client,
      message:
        action === 'created'
          ? `El cliente ${client.nombre} fue creado correctamente.`
          : `El cliente ${client.nombre} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        client,
        action === 'created'
          ? `Creación del cliente ${client.nombre}.`
          : `Actualización del cliente ${client.nombre}.`,
        null,
        this.sanitizeAuditPayload(client),
      ),
    };
  }

  private buildAuditDraft(
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

  private sanitizeAuditPayload(client: Client): Record<string, unknown> {
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

  private resolveNullableText(...values: Array<number | string | null | undefined>): string | null {
    for (const value of values) {
      if (typeof value === 'number') {
        return String(value);
      }

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractBackendDetail(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return '';
  }

  private withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context: string,
  ): Observable<T> {
    return operation().pipe(
      catchError((error: unknown) => {
        if (environment.enableClientsAdministrationFallback && this.shouldFallbackToMock(error)) {
          console.warn(`Se activó fallback mock para ${context}.`, error);
          return fallback();
        }

        return throwError(() => this.mapHttpError(error, context));
      }),
    );
  }

  private shouldFallbackToMock(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return true;
    }

    return [0, 404, 405, 500, 501, 502, 503, 504].includes(error.status);
  }

  private mapHttpError(error: unknown, context: string): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return new Error('No tienes permisos para operar clientes en la empresa activa.');
      }

      if (error.status === 422) {
        return new Error(
          this.extractBackendDetail(error) ||
            'El backend reportó errores de validación para los datos enviados.',
        );
      }

      return new Error(
        this.extractBackendDetail(error) ||
          `No fue posible completar la operación de ${context}.`,
      );
    }

    return error instanceof Error
      ? error
      : new Error(`No fue posible completar la operación de ${context}.`);
  }
}
