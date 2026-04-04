import { Injectable } from '@angular/core';
import {
  AuditExportFormat,
  AuditLogDetail,
} from '../models/audit-log.model';
import { mapAuditDetailToExportRow } from '../utils/audit-log.utils';

@Injectable({
  providedIn: 'root',
})
export class AuditLogExportService {
  async exportRows(
    rows: AuditLogDetail[],
    format: AuditExportFormat,
    fileName: string,
  ): Promise<void> {
    const exportRows = rows.map((row) => mapAuditDetailToExportRow(row));

    if (format === 'csv') {
      this.downloadCsv(exportRows, fileName);
      return;
    }

    await this.downloadExcel(exportRows, fileName);
  }

  downloadBlob(blob: Blob, fileName: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(objectUrl);
  }

  private downloadCsv(rows: Record<string, string>[], fileName: string): void {
    const headers = Object.keys(rows[0] ?? {});
    const csvContent = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
      .map((columns) =>
        columns
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    this.downloadBlob(new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }), fileName);
  }

  private async downloadExcel(
    rows: Record<string, string>[],
    fileName: string,
  ): Promise<void> {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria');
    XLSX.writeFile(workbook, fileName, {
      compression: true,
    });
  }
}