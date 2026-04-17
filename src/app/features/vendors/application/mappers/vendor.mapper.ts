import { SaveVendorPayload } from '../../domain/models/vendor-form.model';
import { Vendor, VendorAssignedClient, VendorStatus } from '../../domain/models/vendor.model';

export interface BackendVendorAssignedClientDto {
  client_id?: string | number | null;
  id_cliente?: string | null;
  nombre?: string | null;
  zona?: string | null;
  ciudad_nombre?: string | null;
}

export interface BackendVendorDto {
  id?: string | number | null;
  vendedor_id?: string | number | null;
  empresa_id?: string | number | null;
  empresa_nombre?: string | null;
  id_vendedor?: string | null;
  nombre_vendedor?: string | null;
  tipo_vendedor?: string | null;
  zona?: string | null;
  canal?: string | null;
  cuota_mensual?: number | string | null;
  ciudad_id?: string | number | null;
  ciudad_nombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  estado?: boolean | string | null;
  clientes_asignados?: BackendVendorAssignedClientDto[] | null;
  dependencias_activas?: boolean | number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BackendSaveVendorPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  id_vendedor: string;
  nombre_vendedor: string;
  tipo_vendedor: string;
  zona: string;
  canal: string;
  cuota_mensual: number | null;
  ciudad_id: string | null;
  ciudad_nombre: string | null;
  direccion: string | null;
  celular: string | null;
  email: string | null;
  clientes_asignados: Array<{ client_id: string }>;
  estado: boolean;
}

export function mapBackendVendorToVendor(
  dto: BackendVendorDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Vendor {
  const assignedClients = (dto.clientes_asignados ?? []).map((client) => mapAssignedClient(client));
  const nombreVendedor = resolveText(dto.nombre_vendedor, 'Vendedor sin nombre');

  return {
    id: resolveText(dto.id, dto.vendedor_id, dto.id_vendedor, nombreVendedor),
    empresaId: resolveText(dto.empresa_id, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, companyNameFallback),
    idVendedor: resolveText(dto.id_vendedor, ''),
    nombreVendedor,
    tipoVendedor: resolveText(dto.tipo_vendedor, ''),
    zona: resolveText(dto.zona, ''),
    canal: resolveText(dto.canal, ''),
    cuotaMensual: resolveNullableNumber(dto.cuota_mensual),
    ciudadId: resolveNullableText(dto.ciudad_id),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre),
    direccion: resolveNullableText(dto.direccion),
    celular: resolveNullableText(dto.celular),
    email: resolveNullableText(dto.email),
    clientesAsignados: assignedClients,
    cantidadClientesAsignados: assignedClients.length,
    estado: resolveStatus(dto.estado),
    createdAt: resolveNullableText(dto.created_at) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at),
    tieneDependenciasActivas: resolveBoolean(dto.dependencias_activas),
  };
}

export function mapVendorPayloadToBackend(
  payload: SaveVendorPayload,
  requestCompanyId: string,
): BackendSaveVendorPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    id_vendedor: payload.idVendedor.trim().toUpperCase(),
    nombre_vendedor: payload.nombreVendedor.trim(),
    tipo_vendedor: payload.tipoVendedor.trim(),
    zona: payload.zona.trim(),
    canal: payload.canal.trim(),
    cuota_mensual: payload.cuotaMensual ?? null,
    ciudad_id: payload.ciudadId?.trim() || null,
    ciudad_nombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion?.trim() || null,
    celular: payload.celular?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    clientes_asignados: payload.clientesAsignados.map((client) => ({ client_id: client.clientId })),
    estado: payload.estado === 'ACTIVO',
  };
}

export function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { items?: unknown[]; results?: unknown[]; data?: unknown[] };

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

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mapAssignedClient(dto: BackendVendorAssignedClientDto): VendorAssignedClient {
  return {
    clientId: resolveText(dto.client_id, ''),
    idCliente: resolveText(dto.id_cliente, ''),
    nombre: resolveText(dto.nombre, 'Cliente asignado'),
    zona: resolveText(dto.zona, ''),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre),
  };
}

function resolveStatus(value: boolean | string | null | undefined): VendorStatus {
  if (typeof value === 'boolean') {
    return value ? 'ACTIVO' : 'INACTIVO';
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['activo', 'active', '1', 'true'].includes(normalized)) {
      return 'ACTIVO';
    }

    if (['inactivo', 'inactive', '0', 'false'].includes(normalized)) {
      return 'INACTIVO';
    }
  }

  return 'ACTIVO';
}

function resolveBoolean(value: boolean | number | string | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'si', 'sí', 'yes'].includes(value.trim().toLowerCase());
  }

  return false;
}

function resolveNullableNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveNullableText(...values: Array<number | string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function resolveText(...values: Array<number | string | null | undefined>): string {
  return resolveNullableText(...values) ?? '';
}