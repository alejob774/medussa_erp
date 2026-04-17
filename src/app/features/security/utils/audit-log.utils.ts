import {
  AuditExportFormat,
  AuditLogActionKey,
  AuditLogDetail,
  AuditLogModuleKey,
} from '../models/audit-log.model';

export const AUDIT_MODULE_LABELS: Record<AuditLogModuleKey, string> = {
  clientes: 'Clientes',
  vendedores: 'Vendedores',
  conductores: 'Conductores',
  usuarios: 'Usuarios',
  roles: 'Roles',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
  auditoria: 'Auditoría',
  productos: 'Productos',
};

export const AUDIT_ACTION_LABELS: Record<AuditLogActionKey, string> = {
  view: 'Consulta',
  create: 'Creación',
  edit: 'Edición',
  delete: 'Eliminación',
  approve: 'Aprobación',
  export: 'Exportación',
};

export const AUDIT_MODULE_OPTIONS = Object.entries(AUDIT_MODULE_LABELS).map(
  ([value, label]) => ({
    value: value as AuditLogModuleKey,
    label,
  }),
);

export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(
  ([value, label]) => ({
    value: value as AuditLogActionKey,
    label,
  }),
);

export function formatAuditEventDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function serializeAuditPayload(
  payload: Record<string, unknown> | null,
): string {
  if (!payload) {
    return 'Sin datos';
  }

  return JSON.stringify(payload, null, 2);
}

export function buildAuditExportFileName(
  companyName: string | null | undefined,
  format: AuditExportFormat,
): string {
  const extension = format === 'csv' ? 'csv' : 'xlsx';
  const normalizedCompanyName = (companyName ?? 'empresa-activa')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'empresa-activa';
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

  return `auditoria-${normalizedCompanyName}-${stamp}.${extension}`;
}

export function mapAuditDetailToExportRow(log: AuditLogDetail): Record<string, string> {
  return {
    'ID del evento': log.id,
    Usuario: log.user,
    Empresa: log.companyName,
    Modulo: AUDIT_MODULE_LABELS[log.module],
    Accion: AUDIT_ACTION_LABELS[log.action],
    Descripcion: log.description,
    'IP Origen': log.ipAddress,
    'Fecha y Hora': formatAuditEventDate(log.eventDateTime),
    'Navegador/Agente': log.browserAgent,
    'Payload Antes': serializeAuditPayload(log.beforePayload),
    'Payload Despues': serializeAuditPayload(log.afterPayload),
  };
}