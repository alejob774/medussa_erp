export type AuditLogModuleKey =
  | 'usuarios'
  | 'roles'
  | 'perfiles'
  | 'configuracion'
  | 'auditoria';

export type AuditLogActionKey =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'export';

export type AuditExportFormat = 'csv' | 'excel';

export interface AuditLogFilters {
  search: string;
  companyId: string | null;
  user: string;
  module: AuditLogModuleKey | 'all';
  action: AuditLogActionKey | 'all';
  dateFrom: string | null;
  dateTo: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface AuditLogQueryFilters
  extends Omit<AuditLogFilters, 'pageIndex' | 'pageSize'> {}

export interface AuditLogItem {
  id: string;
  user: string;
  companyId: string;
  companyName: string;
  module: AuditLogModuleKey;
  action: AuditLogActionKey;
  description: string;
  ipAddress: string;
  eventDateTime: string;
}

export interface AuditLogDetail extends AuditLogItem {
  browserAgent: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface AuditExportFileResult {
  kind: 'file';
  format: AuditExportFormat;
  fileName: string;
  blob: Blob;
}

export interface AuditExportRowsResult {
  kind: 'rows';
  format: AuditExportFormat;
  fileName: string;
  rows: AuditLogDetail[];
}

export type AuditExportResult = AuditExportFileResult | AuditExportRowsResult;