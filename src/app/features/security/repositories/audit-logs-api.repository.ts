import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../auth/services/auth-session.service';
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

interface BackendAuditLogListResponseDto {
  items?: BackendAuditLogItemDto[];
  results?: BackendAuditLogItemDto[];
  data?: BackendAuditLogItemDto[];
  total?: number;
  count?: number;
  page?: number;
  page_size?: number;
}

interface BackendAuditLogItemDto {
  id?: number | string;
  evento_id?: number | string;
  usuario?: string;
  user?: string;
  username?: string;
  empresa_id?: string;
  company_id?: string;
  empresa_nombre?: string;
  company_name?: string;
  modulo?: string;
  accion?: string;
  descripcion?: string;
  detalle?: string;
  ip_origen?: string;
  ip_address?: string;
  fecha_hora?: string;
  created_at?: string;
  timestamp?: string;
}

interface BackendAuditLogDetailDto extends BackendAuditLogItemDto {
  navegador_agente?: string;
  browser_agent?: string;
  payload_antes?: Record<string, unknown> | null;
  before_payload?: Record<string, unknown> | null;
  payload_despues?: Record<string, unknown> | null;
  after_payload?: Record<string, unknown> | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogsApiRepository implements AuditLogsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(AuditLogsMockRepository);
  private readonly auditUrl = `${environment.apiUrl}/auditoria`;

  listLogs(companyId: string, filters: AuditLogFilters): Observable<AuditLogListResponse> {
    return this.withFallback(
      () =>
        this.http
          .get<BackendAuditLogListResponseDto | BackendAuditLogItemDto[]>(this.auditUrl, {
            params: this.buildListParams(filters),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listLogs(companyId, filters),
      'eventos de auditoria',
    );
  }

  getLogDetail(companyId: string, logId: string): Observable<AuditLogDetail> {
    return this.withFallback(
      () =>
        this.http
          .get<BackendAuditLogDetailDto>(`${this.auditUrl}/${logId}`)
          .pipe(map((response) => this.mapDetail(response, companyId))),
      () => this.mockRepository.getLogDetail(companyId, logId),
      'detalle de auditoria',
    );
  }

  exportLogs(
    companyId: string,
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): Observable<AuditExportResult> {
    return this.withFallback(
      () =>
        this.http
          .get(`${this.auditUrl}/export`, {
            params: this.buildExportParams(filters, format),
            observe: 'response',
            responseType: 'blob',
          })
          .pipe(
            map((response) => this.mapExportResponse(response, companyId, format)),
          ),
      () => this.mockRepository.exportLogs(companyId, filters, format),
      'exportacion de auditoria',
    );
  }

  private buildListParams(filters: AuditLogFilters): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.pageIndex + 1))
      .set('page_size', String(filters.pageSize));

    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }

    if (filters.user.trim()) {
      params = params.set('usuario', filters.user.trim());
    }

    if (filters.module !== 'all') {
      params = params.set('modulo', filters.module);
    }

    if (filters.action !== 'all') {
      params = params.set('accion', filters.action);
    }

    if (filters.dateFrom) {
      params = params.set('fecha_desde', filters.dateFrom);
    }

    if (filters.dateTo) {
      params = params.set('fecha_hasta', filters.dateTo);
    }

    return params;
  }

  private buildExportParams(
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): HttpParams {
    return this.buildListParams({
      ...filters,
      pageIndex: 0,
      pageSize: 10000,
    }).set('format', format === 'excel' ? 'xlsx' : 'csv');
  }

  private mapListResponse(
    response: BackendAuditLogListResponseDto | BackendAuditLogItemDto[],
    companyId: string,
    filters: AuditLogFilters,
  ): AuditLogListResponse {
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.results ?? response.data ?? [];
    const total = Array.isArray(response)
      ? response.length
      : response.total ?? response.count ?? items.length;

    return {
      items: items.map((item) => this.mapListItem(item, companyId)),
      total,
      pageIndex: filters.pageIndex,
      pageSize: filters.pageSize,
    };
  }

  private mapListItem(response: BackendAuditLogItemDto, companyId: string): AuditLogItem {
    return {
      id: String(response.id ?? response.evento_id ?? 'sin-id'),
      user:
        response.usuario ?? response.user ?? response.username ?? 'Usuario no disponible',
      companyId: response.empresa_id ?? response.company_id ?? companyId,
      companyName:
        response.empresa_nombre ?? response.company_name ?? this.resolveCompanyName(companyId),
      module: this.normalizeModule(response.modulo),
      action: this.normalizeAction(response.accion),
      description: response.descripcion ?? response.detalle ?? 'Sin descripcion',
      ipAddress: response.ip_origen ?? response.ip_address ?? '0.0.0.0',
      eventDateTime:
        response.fecha_hora ?? response.created_at ?? response.timestamp ?? new Date().toISOString(),
    };
  }

  private mapDetail(response: BackendAuditLogDetailDto, companyId: string): AuditLogDetail {
    const base = this.mapListItem(response, companyId);

    return {
      ...base,
      browserAgent:
        response.navegador_agente ??
        response.browser_agent ??
        'Agente no informado por el backend',
      beforePayload: response.payload_antes ?? response.before_payload ?? null,
      afterPayload: response.payload_despues ?? response.after_payload ?? null,
    };
  }

  private mapExportResponse(
    response: HttpResponse<Blob>,
    companyId: string,
    format: AuditExportFormat,
  ): AuditExportResult {
    return {
      kind: 'file',
      format,
      blob: response.body ?? new Blob(),
      fileName:
        this.resolveFileName(response.headers.get('content-disposition')) ??
        buildAuditExportFileName(this.resolveCompanyName(companyId), format),
    };
  }

  private normalizeModule(value: string | undefined): AuditLogModuleKey {
    switch ((value ?? '').trim().toLowerCase()) {
      case 'usuarios':
      case 'roles':
      case 'perfiles':
      case 'configuracion':
      case 'auditoria':
        return value!.trim().toLowerCase() as AuditLogModuleKey;
      default:
        return 'auditoria';
    }
  }

  private normalizeAction(value: string | undefined): AuditLogActionKey {
    switch ((value ?? '').trim().toLowerCase()) {
      case 'view':
      case 'create':
      case 'edit':
      case 'delete':
      case 'approve':
      case 'export':
        return value!.trim().toLowerCase() as AuditLogActionKey;
      default:
        return 'view';
    }
  }

  private resolveCompanyName(companyId: string): string {
    const session = this.authSessionService.getSession();
    return (
      session?.companies?.find((company) => company.id === companyId)?.name ??
      'Empresa activa'
    );
  }

  private resolveFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const match = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/\"/g, '').trim()) : null;
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
      return new Error('No tienes permisos para consultar la auditoria de la empresa activa.');
    }

    if (error.status === 422) {
      return new Error('El backend reporto errores de validacion para los filtros enviados.');
    }

    return new Error(
      (typeof error.error?.detail === 'string' && error.error.detail) ||
        `No fue posible cargar ${resourceLabel}.`,
    );
  }
}