import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { AUDIT_LOG_MOCK_DETAILS } from '../mocks/audit-logs.mock';
import {
  AuditExportFormat,
  AuditExportResult,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogItem,
  AuditLogListResponse,
} from '../models/audit-log.model';
import { buildAuditExportFileName } from '../utils/audit-log.utils';
import { AuditLogsRepository } from './audit-logs.repository';

@Injectable({
  providedIn: 'root',
})
export class AuditLogsMockRepository implements AuditLogsRepository {
  listLogs(companyId: string, filters: AuditLogFilters): Observable<AuditLogListResponse> {
    const filteredLogs = this.filterLogs(companyId, filters);
    const startIndex = filters.pageIndex * filters.pageSize;
    const items = filteredLogs
      .slice(startIndex, startIndex + filters.pageSize)
      .map((log) => this.toListItem(log));

    return of({
      items,
      total: filteredLogs.length,
      pageIndex: filters.pageIndex,
      pageSize: filters.pageSize,
    }).pipe(delay(280));
  }

  getLogDetail(companyId: string, logId: string): Observable<AuditLogDetail> {
    const log = AUDIT_LOG_MOCK_DETAILS.find(
      (candidate) => candidate.id === logId && candidate.companyId === companyId,
    );

    if (!log) {
      return throwError(() => new Error('No se encontró el evento de auditoría solicitado.'));
    }

    return of(log).pipe(delay(180));
  }

  exportLogs(
    companyId: string,
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): Observable<AuditExportResult> {
    const logs = this.filterLogs(companyId, {
      ...filters,
      pageIndex: 0,
      pageSize: Number.MAX_SAFE_INTEGER,
    });

    return of<AuditExportResult>({
      kind: 'rows',
      format,
      fileName: buildAuditExportFileName(logs[0]?.companyName ?? null, format),
      rows: logs,
    }).pipe(delay(220));
  }

  private filterLogs(companyId: string, filters: AuditLogFilters): AuditLogDetail[] {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const normalizedUser = filters.user.trim().toLowerCase();
    const effectiveCompanyId = filters.companyId ?? companyId;
    const fromDate = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const toDate = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;

    return AUDIT_LOG_MOCK_DETAILS.filter((log) => {
      const eventDate = new Date(log.eventDateTime);
      const matchesCompany = log.companyId === effectiveCompanyId;
      const matchesSearch =
        !normalizedSearch ||
        log.user.toLowerCase().includes(normalizedSearch) ||
        log.ipAddress.toLowerCase().includes(normalizedSearch) ||
        log.description.toLowerCase().includes(normalizedSearch);
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
    }).sort(
      (left, right) =>
        new Date(right.eventDateTime).getTime() - new Date(left.eventDateTime).getTime(),
    );
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
}