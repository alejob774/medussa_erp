import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { AuditoriaBackendItem } from '../models/security-backend.model';
import {
  AuditExportFormat,
  AuditExportResult,
  AuditLogActionKey,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogItem,
  AuditLogListResponse,
  AuditLogModuleKey,
} from '../models/audit-log.model';
import { buildAuditExportFileName } from '../utils/audit-log.utils';
import { AuditLogsMockRepository } from './audit-logs-mock.repository';
import { AuditLogsRepository } from './audit-logs.repository';

@Injectable({
  providedIn: 'root',
})
export class AuditLogsApiRepository implements AuditLogsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(AuditLogsMockRepository);
  private readonly auditUrl = `${environment.apiUrl}/auditoria/`;
  private readonly detailCache = new Map<string, AuditLogDetail>();

  listLogs(companyId: string, filters: AuditLogFilters): Observable<AuditLogListResponse> {
    return this.withFallback(
      () =>
        this.fetchAuditLogDetails(companyId, filters).pipe(
          map((logs) => this.buildListResponse(logs, companyId, filters)),
        ),
      () => this.mockRepository.listLogs(companyId, filters),
      'eventos de auditoría',
    );
  }

  getLogDetail(companyId: string, logId: string): Observable<AuditLogDetail> {
    const cachedLog = this.detailCache.get(logId);

    if (cachedLog) {
      return of(cachedLog);
    }

    return this.withFallback(
      () =>
        this.fetchAuditLogDetails(companyId, {
          search: '',
          companyId,
          user: '',
          module: 'all',
          action: 'all',
          dateFrom: null,
          dateTo: null,
          pageIndex: 0,
          pageSize: 500,
        }).pipe(
          map((logs) => {
            const log = logs.find((item) => item.id === logId);

            if (!log) {
              throw new Error('No se encontró el evento de auditoría solicitado.');
            }

            return log;
          }),
        ),
      () => this.mockRepository.getLogDetail(companyId, logId),
      'detalle de auditoría',
    );
  }

  exportLogs(
    companyId: string,
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): Observable<AuditExportResult> {
    return this.withFallback(
      () =>
        this.fetchAuditLogDetails(companyId, {
          ...filters,
          pageIndex: 0,
          pageSize: 1000,
        }).pipe(
          map((logs) => ({
            kind: 'rows' as const,
            format,
            fileName: buildAuditExportFileName(this.resolveCompanyName(companyId), format),
            rows: this.applyClientFilters(logs, companyId, {
              ...filters,
              pageIndex: 0,
              pageSize: Number.MAX_SAFE_INTEGER,
            }),
          })),
        ),
      () => this.mockRepository.exportLogs(companyId, filters, format),
      'exportación de auditoría',
    );
  }

  private fetchAuditLogDetails(
    companyId: string,
    filters: AuditLogFilters,
  ): Observable<AuditLogDetail[]> {
    return this.http
      .get<unknown>(this.auditUrl, {
        params: this.buildBackendParams(companyId, filters),
      })
      .pipe(
        map((response) =>
          this.extractArrayPayload<AuditoriaBackendItem>(response)
            .map((item) => this.mapDetail(item, companyId))
            .sort(
              (left, right) =>
                new Date(right.eventDateTime).getTime() - new Date(left.eventDateTime).getTime(),
            ),
        ),
        map((logs) => {
          logs.forEach((log) => this.detailCache.set(log.id, log));
          return logs;
        }),
      );
  }

  private buildBackendParams(companyId: string, filters: AuditLogFilters): HttpParams {
    let params = new HttpParams()
      .set('empresa_id', this.resolveRequestCompanyId(filters.companyId ?? companyId))
      .set('skip', '0')
      .set('limit', '500');

    if (/^\d+$/.test(filters.user.trim())) {
      params = params.set('user_id', filters.user.trim());
    }

    return params;
  }

  private buildListResponse(
    logs: AuditLogDetail[],
    companyId: string,
    filters: AuditLogFilters,
  ): AuditLogListResponse {
    const filteredLogs = this.applyClientFilters(logs, companyId, filters);
    const startIndex = filters.pageIndex * filters.pageSize;
    const items = filteredLogs
      .slice(startIndex, startIndex + filters.pageSize)
      .map((log) => this.toListItem(log));

    return {
      items,
      total: filteredLogs.length,
      pageIndex: filters.pageIndex,
      pageSize: filters.pageSize,
    };
  }

  private applyClientFilters(
    logs: AuditLogDetail[],
    companyId: string,
    filters: AuditLogFilters,
  ): AuditLogDetail[] {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const normalizedUser = filters.user.trim().toLowerCase();
    const effectiveCompanyId = filters.companyId ?? companyId;
    const fromDate = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const toDate = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;

    return logs.filter((log) => {
      const eventDate = new Date(log.eventDateTime);
      const matchesCompany = log.companyId === effectiveCompanyId;
      const matchesSearch =
        !normalizedSearch ||
        [log.user, log.description, log.ipAddress, log.companyName]
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesUser = !normalizedUser || log.user.toLowerCase().includes(normalizedUser);
      const matchesModule = filters.module === 'all' || log.module === filters.module;
      const matchesAction = filters.action === 'all' || log.action === filters.action;
      const matchesFrom = !fromDate || eventDate >= fromDate;
      const matchesTo = !toDate || eventDate <= toDate;

      return (
        matchesCompany &&
        matchesSearch &&
        matchesUser &&
        matchesModule &&
        matchesAction &&
        matchesFrom &&
        matchesTo
      );
    });
  }

  private mapDetail(response: AuditoriaBackendItem, companyId: string): AuditLogDetail {
    return {
      id: String(response.id ?? response.evento_id ?? 'sin-id'),
      user:
        response.usuario ?? response.user ?? response.username ?? 'Usuario no disponible',
      companyId: this.resolveFrontendCompanyId(response.empresa_id ?? response.company_id ?? companyId),
      companyName:
        response.empresa_nombre ?? response.company_name ?? this.resolveCompanyName(companyId),
      module: this.normalizeModule(response.modulo),
      action: this.normalizeAction(response.accion),
      description: response.descripcion ?? response.detalle ?? 'Sin descripción',
      ipAddress: response.ip_origen ?? response.ip_address ?? '0.0.0.0',
      eventDateTime:
        response.fecha_hora ?? response.created_at ?? response.timestamp ?? new Date().toISOString(),
      browserAgent:
        response.navegador_agente ??
        response.browser_agent ??
        'Agente no informado por el backend',
      beforePayload: response.payload_antes ?? response.before_payload ?? null,
      afterPayload: response.payload_despues ?? response.after_payload ?? null,
    };
  }

  private toListItem(log: AuditLogDetail): AuditLogItem {
    return {
      id: log.id,
      user: log.user,
      companyId: log.companyId,
      companyName: log.companyName,
      module: log.module,
      action: log.action,
      description: log.description,
      ipAddress: log.ipAddress,
      eventDateTime: log.eventDateTime,
    };
  }

  private normalizeModule(value: string | undefined): AuditLogModuleKey {
    const normalizedValue = (value ?? '').trim().toLowerCase();

    switch (normalizedValue) {
      case 'cliente':
      case 'clientes':
        return 'clientes';
      case 'inventario':
      case 'producto':
      case 'productos':
        return 'productos';
      case 'seguridad':
      case 'usuario':
      case 'usuarios':
        return 'usuarios';
      case 'roles':
      case 'perfiles':
      case 'configuracion':
      case 'auditoria':
        return normalizedValue as AuditLogModuleKey;
      default:
        return 'auditoria';
    }
  }

  private normalizeAction(value: string | undefined): AuditLogActionKey {
    switch ((value ?? '').trim().toLowerCase()) {
      case 'view':
      case 'ver':
      case 'create':
      case 'crear':
      case 'create_role':
      case 'create_profile':
      case 'edit':
      case 'editar':
      case 'actualizar':
      case 'delete':
      case 'desactivar':
      case 'eliminar':
      case 'eliminar_logico':
      case 'approve':
      case 'aprobar':
      case 'export':
      case 'exportar': {
        const normalizedValue = value!.trim().toLowerCase();

        if (['create', 'crear', 'create_role', 'create_profile'].includes(normalizedValue)) {
          return 'create';
        }

        if (['edit', 'editar', 'actualizar'].includes(normalizedValue)) {
          return 'edit';
        }

        if (['delete', 'desactivar', 'eliminar', 'eliminar_logico'].includes(normalizedValue)) {
          return 'delete';
        }

        if (['approve', 'aprobar'].includes(normalizedValue)) {
          return 'approve';
        }

        if (['export', 'exportar'].includes(normalizedValue)) {
          return 'export';
        }

        return 'view';
      }
      default:
        return 'view';
    }
  }

  private extractArrayPayload<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === 'object') {
      const candidate = payload as {
        items?: unknown[];
        results?: unknown[];
        data?: unknown[];
      };

      if (Array.isArray(candidate.items)) {
        return candidate.items as T[];
      }

      if (Array.isArray(candidate.results)) {
        return candidate.results as T[];
      }

      if (Array.isArray(candidate.data)) {
        return candidate.data as T[];
      }
    }

    return [];
  }

  private resolveFrontendCompanyId(backendCompanyId: string): string {
    const session = this.authSessionService.getSession();
    const normalizedBackendCompanyId = backendCompanyId.trim();

    return (
      session?.companies?.find(
        (company) =>
          company.backendId === normalizedBackendCompanyId || company.id === normalizedBackendCompanyId,
      )?.id ?? normalizedBackendCompanyId
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

  private resolveCompanyName(companyId: string): string {
    const session = this.authSessionService.getSession();
    return (
      session?.companies?.find((company) => company.id === companyId)?.name ??
      'Empresa activa'
    );
  }

  private withFallback<T>(
    apiOperation: () => Observable<T>,
    mockOperation: () => Observable<T>,
    resourceLabel: string,
  ): Observable<T> {
    return apiOperation().pipe(
      catchError((error: unknown) => {
        if (environment.enableAuditLogsFallback && this.shouldFallbackToMock(error)) {
          return mockOperation();
        }

        return throwError(() => this.mapHttpError(error, resourceLabel));
      }),
    );
  }

  private shouldFallbackToMock(error: unknown): boolean {
    const status = (error as HttpErrorResponse)?.status;
    return status === 0 || status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504;
  }

  private mapHttpError(error: unknown, resourceLabel: string): Error {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error : new Error(`No fue posible cargar ${resourceLabel}.`);
    }

    if (error.status === 403) {
      return new Error('No tienes permisos para consultar la auditoría de la empresa activa.');
    }

    if (error.status === 422) {
      return new Error('El backend reportó errores de validación para los filtros enviados.');
    }

    return new Error(
      (typeof error.error?.detail === 'string' && error.error.detail) ||
        `No fue posible cargar ${resourceLabel}.`,
    );
  }
}
