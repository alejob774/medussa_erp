import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuditLogDetail } from '../../models/audit-log.model';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_MODULE_LABELS,
  formatAuditEventDate,
  serializeAuditPayload,
} from '../../utils/audit-log.utils';

@Component({
  selector: 'app-audit-log-detail-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './audit-log-detail-panel.component.html',
  styleUrl: './audit-log-detail-panel.component.scss',
})
export class AuditLogDetailPanelComponent {
  @Input() detail: AuditLogDetail | null = null;
  @Input() loading = false;
  @Input() errorMessage = '';

  @Output() closePanel = new EventEmitter<void>();

  readonly moduleLabels = AUDIT_MODULE_LABELS;
  readonly actionLabels = AUDIT_ACTION_LABELS;

  formatDate(value: string): string {
    return formatAuditEventDate(value);
  }

  formatPayload(payload: Record<string, unknown> | null): string {
    return serializeAuditPayload(payload);
  }
}