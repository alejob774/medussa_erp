import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { hasRequiredPermissions } from '../../../../core/permissions/utils/permission.utils';
import { AuditLogDetailPanelComponent } from '../../components/audit-log-detail-panel/audit-log-detail-panel.component';
import {
  AuditExportFormat,
  AuditLogDetail,
  AuditLogFilters,
  AuditLogItem,
} from '../../models/audit-log.model';
import { AuditLogExportService } from '../../services/audit-log-export.service';
import { AuditLogsFacadeService } from '../../services/audit-logs.facade';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULE_OPTIONS,
  formatAuditEventDate,
} from '../../utils/audit-log.utils';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AuditLogDetailPanelComponent,
  ],
  templateUrl: './audit-logs-page.component.html',
  styleUrl: './audit-logs-page.component.scss',
})
export class AuditLogsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auditLogsFacade = inject(AuditLogsFacadeService);
  private readonly companyContextService = inject(CompanyContextService);
  private readonly auditLogExportService = inject(AuditLogExportService);

  readonly activeCompany$ = this.auditLogsFacade.activeCompany$;
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    companyId: this.fb.control<string | null>(null),
    user: [''],
    module: this.fb.nonNullable.control<'all' | (typeof AUDIT_MODULE_OPTIONS)[number]['value']>('all'),
    action: this.fb.nonNullable.control<'all' | (typeof AUDIT_ACTION_OPTIONS)[number]['value']>('all'),
    dateFrom: this.fb.control<string | null>(null),
    dateTo: this.fb.control<string | null>(null),
  });

  readonly moduleOptions = AUDIT_MODULE_OPTIONS;
  readonly actionOptions = AUDIT_ACTION_OPTIONS;
  readonly moduleLabels = AUDIT_MODULE_LABELS;
  readonly actionLabels = AUDIT_ACTION_LABELS;
  readonly pageSizeOptions = [10, 25, 50];

  logs: AuditLogItem[] = [];
  totalLogs = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  detailLoading = false;
  detailOpen = false;
  selectedDetail: AuditLogDetail | null = null;
  errorMessage = '';
  detailErrorMessage = '';
  exportLoading: AuditExportFormat | null = null;
  canExport = false;
  activeCompanyName = '';

  constructor() {
    this.canExport = hasRequiredPermissions(
      this.companyContextService.getUserPermissions(),
      'auditoria_export',
    );

    this.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.activeCompanyName = company.name;
        this.resetForCompany(company.id);
        this.loadLogs();
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.closeDetailPanel();
    this.loadLogs();
  }

  handlePageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.closeDetailPanel();
    this.loadLogs();
  }

  openDetail(log: AuditLogItem): void {
    this.detailOpen = true;
    this.selectedDetail = null;
    this.detailErrorMessage = '';
    this.detailLoading = true;

    this.auditLogsFacade
      .getLogDetail(log.id)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: (detail) => {
          this.selectedDetail = detail;
        },
        error: (error: unknown) => {
          this.detailErrorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  closeDetailPanel(): void {
    this.detailOpen = false;
    this.detailLoading = false;
    this.detailErrorMessage = '';
    this.selectedDetail = null;
  }

  export(format: AuditExportFormat): void {
    if (!this.canExport || this.exportLoading) {
      return;
    }

    this.exportLoading = format;
    this.errorMessage = '';

    this.auditLogsFacade
      .exportLogs(this.currentFilters, format)
      .pipe(finalize(() => (this.exportLoading = null)))
      .subscribe({
        next: (result) => {
          if (result.kind === 'file') {
            this.auditLogExportService.downloadBlob(result.blob, result.fileName);
            return;
          }

          void this.runClientExport(result.rows, result.format, result.fileName);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  formatDate(value: string): string {
    return formatAuditEventDate(value);
  }

  private resetForCompany(companyId: string): void {
    this.pageIndex = 0;
    this.pageSize = 10;
    this.closeDetailPanel();
    this.errorMessage = '';
    this.filterForm.reset({
      search: '',
      companyId,
      user: '',
      module: 'all',
      action: 'all',
      dateFrom: null,
      dateTo: null,
    });
  }

  private loadLogs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auditLogsFacade
      .listLogs(this.currentFilters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.logs = response.items;
          this.totalLogs = response.total;
        },
        error: (error: unknown) => {
          this.logs = [];
          this.totalLogs = 0;
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private async runClientExport(
    rows: AuditLogDetail[],
    format: AuditExportFormat,
    fileName: string,
  ): Promise<void> {
    try {
      await this.auditLogExportService.exportRows(rows, format, fileName);
    } catch (error: unknown) {
      this.errorMessage = this.resolveErrorMessage(error);
    }
  }

  private get currentFilters(): AuditLogFilters {
    const rawValue = this.filterForm.getRawValue();

    return {
      search: rawValue.search?.trim() ?? '',
      companyId: rawValue.companyId ?? this.auditLogsFacade.getActiveCompanyId(),
      user: rawValue.user?.trim() ?? '',
      module: rawValue.module,
      action: rawValue.action,
      dateFrom: rawValue.dateFrom,
      dateTo: rawValue.dateTo,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'Ocurrio un error al procesar la auditoria.';
  }
}