import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
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
    return this.withFallback(
      () =>
        this.http
          .get<unknown>(this.withTrailingSlash(this.baseUrl), {
            params: this.buildListParams(companyId, filters),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listClients(companyId, filters),
      'catálogo de clientes',
    );
  }

  getClient(companyId: string, clientId: string): Observable<Client> {
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
    return this.withFallback(
      () => {
        const requestBody = mapClientPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (clientId) {
          return this.resolveClientRequestId(companyId, clientId).pipe(
            switchMap((requestClientId) =>
              this.http
                .put<BackendClientDto | void>(
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

  private buildListParams(companyId: string, filters: ClientFilters): HttpParams {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const requestCompanyId = normalizedFilters.empresaId ?? companyId;
    let params = new HttpParams()
      .set('empresa_id', this.resolveRequestCompanyId(requestCompanyId))
      .set('page', String(normalizedFilters.page + 1))
      .set('page_size', String(normalizedFilters.pageSize));

    if (normalizedFilters.search) {
      params = params.set('search', normalizedFilters.search);
    }

    if (normalizedFilters.estado && normalizedFilters.estado !== 'TODOS') {
      params = params.set('estado', normalizedFilters.estado.toLowerCase());
    }

    if (normalizedFilters.ciudadId) {
      params = params.set('ciudad_id', normalizedFilters.ciudadId);
    }

    if (normalizedFilters.zona) {
      params = params.set('zona', normalizedFilters.zona);
    }

    return params;
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
              .put<BackendClientDto | void>(
                `${this.withTrailingSlash(this.baseUrl)}${requestClientId}`,
                mapClientPayloadToBackend(
                  this.buildStatusPayload(client, status),
                  this.resolveRequestCompanyId(companyId),
                ),
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
      .get<unknown>(this.withTrailingSlash(this.baseUrl), {
        params: new HttpParams()
          .set('empresa_id', this.resolveRequestCompanyId(companyId))
          .set('page', '1')
          .set('page_size', '500'),
      })
      .pipe(
        map((response) => {
          const client = extractArrayPayload<BackendClientDto>(response).find((candidate) =>
            this.matchesClientReference(candidate, clientId),
          );

          return this.resolveNullableText(client?.id, client?.cliente_id) ?? clientId;
        }),
      );
  }

  private matchesClientReference(client: BackendClientDto, clientId: string): boolean {
    const normalizedClientId = clientId.trim();
    const candidates = [
      this.resolveNullableText(client.id),
      this.resolveNullableText(client.cliente_id),
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

  private resolveRequestCompanyId(companyId: string): string {
    const session = this.authSessionService.getSession();
    const company = session?.companies?.find((candidate) => candidate.id === companyId);

    if (company?.backendId) {
      return company.backendId;
    }

    if (session?.activeCompanyId === companyId && session.activeBackendCompanyId) {
      return session.activeBackendCompanyId;
    }

    return companyId;
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