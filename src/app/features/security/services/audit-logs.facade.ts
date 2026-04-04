import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../core/company/services/company-context.service';
import { environment } from '../../../../environments/environment';
import {
  AuditExportFormat,
  AuditExportResult,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogListResponse,
} from '../models/audit-log.model';
import { AuditLogsApiRepository } from '../repositories/audit-logs-api.repository';
import { AuditLogsMockRepository } from '../repositories/audit-logs-mock.repository';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable({
  providedIn: 'root',
})
export class AuditLogsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(AuditLogsMockRepository);
  private readonly apiRepository = inject(AuditLogsApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  listLogs(filters: AuditLogFilters): Observable<AuditLogListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listLogs(companyId, filters));
  }

  getLogDetail(logId: string): Observable<AuditLogDetail> {
    return this.withActiveCompany((companyId) => this.repository.getLogDetail(companyId, logId));
  }

  exportLogs(
    filters: AuditLogFilters,
    format: AuditExportFormat,
  ): Observable<AuditExportResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.exportLogs(companyId, filters, format),
    );
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  private withActiveCompany<T>(
    operation: (companyId: string) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): AuditLogsRepository {
    return environment.useAuditLogsMock ? this.mockRepository : this.apiRepository;
  }
}