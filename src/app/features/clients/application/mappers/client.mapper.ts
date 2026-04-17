import { CityCatalogItem } from '../../domain/models/city-catalog.model';
import { SaveClientPayload } from '../../domain/models/client-form.model';
import { Client, ClientStatus } from '../../domain/models/client.model';
import { IdentificationTypeOption } from '../../domain/models/identification-type.model';

export interface BackendClientDto {
  id?: number | string | null;
  cliente_id?: number | string | null;
  empresa_id?: number | string | null;
  company_id?: number | string | null;
  empresa_nombre?: string | null;
  company_name?: string | null;
  id_cliente?: string | null;
  customer_code?: string | null;
  tipo_identificacion?: string | null;
  identification_type?: string | null;
  nombre?: string | null;
  name?: string | null;
  nombre_comercial?: string | null;
  trade_name?: string | null;
  ciudad_id?: number | string | null;
  city_id?: number | string | null;
  ciudad_nombre?: string | null;
  city_name?: string | null;
  direccion?: string | null;
  address?: string | null;
  telefono?: string | null;
  phone?: string | null;
  email?: string | null;
  estado?: boolean | string | null;
  activo?: boolean | null;
  zona?: string | null;
  dependencies_active?: boolean | string | number | null;
  dependencias_activas?: boolean | string | number | null;
  created_at?: string | null;
  fecha_creacion?: string | null;
  updated_at?: string | null;
  fecha_actualizacion?: string | null;
}

export interface BackendClientCatalogsDto {
  tipos_identificacion?: Array<{ value?: string | null; label?: string | null } | string>;
  identification_types?: Array<{ value?: string | null; label?: string | null } | string>;
  ciudades?: Array<{
    id?: string | number | null;
    value?: string | number | null;
    nombre?: string | null;
    name?: string | null;
    departamento?: string | null;
    department?: string | null;
  }>;
  cities?: Array<{
    id?: string | number | null;
    value?: string | number | null;
    nombre?: string | null;
    name?: string | null;
    departamento?: string | null;
    department?: string | null;
  }>;
  zonas?: Array<{ value?: string | null; label?: string | null } | string>;
  zones?: Array<{ value?: string | null; label?: string | null } | string>;
}

export interface BackendSaveClientPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  id_cliente: string;
  tipo_identificacion: string;
  nombre: string;
  nombre_comercial: string | null;
  ciudad_id: string;
  ciudad_nombre: string | null;
  zona: string | null;
  direccion: string;
  telefono: string | null;
  email: string | null;
  estado: boolean;
}

export function mapBackendClientToClient(
  dto: BackendClientDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Client {
  const nombre = resolveText(dto.nombre, dto.name, 'Cliente sin nombre');

  return {
    id: resolveId(dto.id, dto.cliente_id, dto.id_cliente, dto.customer_code, nombre),
    empresaId: resolveText(dto.empresa_id, dto.company_id, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.company_name, companyNameFallback),
    idCliente: resolveText(dto.id_cliente, dto.customer_code, ''),
    tipoIdentificacion: resolveText(dto.tipo_identificacion, dto.identification_type, ''),
    nombre,
    nombreComercial: resolveNullableText(dto.nombre_comercial, dto.trade_name),
    ciudadId: resolveText(dto.ciudad_id, dto.city_id, ''),
    ciudadNombre: resolveText(dto.ciudad_nombre, dto.city_name, ''),
    direccion: resolveText(dto.direccion, dto.address, ''),
    telefono: resolveNullableText(dto.telefono, dto.phone),
    email: resolveNullableText(dto.email),
    estado: resolveStatus(dto.estado, dto.activo),
    createdAt: resolveNullableText(dto.created_at, dto.fecha_creacion) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.fecha_actualizacion),
    zona: resolveNullableText(dto.zona),
    tieneDependenciasActivas: resolveBoolean(dto.dependencies_active, dto.dependencias_activas),
  };
}

export function mapClientPayloadToBackend(
  payload: SaveClientPayload,
  requestCompanyId: string,
): BackendSaveClientPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    id_cliente: payload.idCliente.trim().toUpperCase(),
    tipo_identificacion: payload.tipoIdentificacion.trim(),
    nombre: payload.nombre.trim(),
    nombre_comercial: payload.nombreComercial?.trim() || null,
    ciudad_id: payload.ciudadId,
    ciudad_nombre: payload.ciudadNombre?.trim() || null,
    zona: payload.zona.trim() || null,
    direccion: payload.direccion.trim(),
    telefono: payload.telefono?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    estado: payload.estado === 'ACTIVO',
  };
}

export function normalizeIdentificationTypes(
  options: Array<{ value?: string | null; label?: string | null } | string>,
): IdentificationTypeOption[] {
  return options
    .map((option) => {
      if (typeof option === 'string') {
        const value = option.trim();
        return value ? { value, label: value } : null;
      }

      const value = option.value?.trim() ?? option.label?.trim() ?? '';
      const label = option.label?.trim() ?? option.value?.trim() ?? value;

      return value ? { value, label } : null;
    })
    .filter((option): option is IdentificationTypeOption => option !== null);
}

export function normalizeCities(
  options: Array<{
    id?: string | number | null;
    value?: string | number | null;
    nombre?: string | null;
    name?: string | null;
    departamento?: string | null;
    department?: string | null;
  }>,
): CityCatalogItem[] {
  return options
    .map<CityCatalogItem | null>((option) => {
      const id = resolveNullableText(option.id, option.value);
      const name = resolveNullableText(option.nombre, option.name);

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        department: resolveNullableText(option.departamento, option.department),
      } satisfies CityCatalogItem;
    })
    .filter((option): option is CityCatalogItem => option !== null);
}

export function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      items?: unknown[];
      results?: unknown[];
      data?: unknown[];
    };

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

function resolveStatus(...values: Array<boolean | string | null | undefined>): ClientStatus {
  for (const value of values) {
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
  }

  return 'ACTIVO';
}

function resolveBoolean(...values: Array<boolean | string | number | null | undefined>): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (['si', 'sí', 'yes', 'true', '1', 'activo', 'active'].includes(normalized)) {
        return true;
      }

      if (['no', 'false', '0', 'inactivo', 'inactive'].includes(normalized)) {
        return false;
      }
    }
  }

  return false;
}

function resolveId(...values: Array<number | string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return `client-${Date.now()}`;
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