import { Observable } from 'rxjs';
import {
  AuditExportFormat,
  AuditExportResult,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogListResponse,
} from '../models/audit-log.model';

export interface AuditLogsRepository {
  listLogs(companyId: string, filters: AuditLogFilters): Observable<AuditLogListResponse>;
  getLogDetail(companyId: string, logId: string): Observable<AuditLogDetail>;
  exportLogs(
    companyId: string,
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): Observable<AuditExportResult>;
}