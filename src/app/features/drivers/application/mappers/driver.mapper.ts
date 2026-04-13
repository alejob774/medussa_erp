import { SaveDriverPayload } from '../../domain/models/driver-form.model';
import { Driver, DriverAssignedRoute, DriverStatus } from '../../domain/models/driver.model';

export interface BackendDriverAssignedRouteDto {
  route_id?: string | number | null;
  id_ruta?: string | null;
  nombre_ruta?: string | null;
  zona?: string | null;
  estado?: string | null;
}

export interface BackendDriverDto {
  id?: string | number | null;
  conductor_id?: string | number | null;
  empresa_id?: string | number | null;
  empresa_nombre?: string | null;
  id_conductor?: string | null;
  nombre_conductor?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  ciudad_id?: string | number | null;
  ciudad_nombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  numero_licencia?: string | null;
  categoria_licencia?: string | null;
  vencimiento_licencia?: string | null;
  rutas_asignadas?: BackendDriverAssignedRouteDto[] | null;
  estado?: boolean | string | null;
  dependencias_activas?: boolean | number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BackendSaveDriverPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  id_conductor: string;
  nombre_conductor: string;
  tipo_documento: string;
  numero_documento: string | null;
  ciudad_id: string | null;
  ciudad_nombre: string | null;
  direccion: string | null;
  celular: string | null;
  email: string | null;
  numero_licencia: string | null;
  categoria_licencia: string | null;
  vencimiento_licencia: string | null;
  rutas_asignadas: Array<{ route_id: string }>;
  estado: boolean;
}

export function mapBackendDriverToDriver(
  dto: BackendDriverDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Driver {
  const nombreConductor = resolveText(dto.nombre_conductor, 'Conductor sin nombre');
  const rutasAsignadas = (dto.rutas_asignadas ?? []).map((route) => mapAssignedRoute(route));

  return {
    id: resolveText(dto.id, dto.conductor_id, dto.id_conductor, nombreConductor),
    empresaId: resolveText(dto.empresa_id, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, companyNameFallback),
    idConductor: resolveText(dto.id_conductor, ''),
    nombreConductor,
    tipoDocumento: resolveText(dto.tipo_documento, ''),
    numeroDocumento: resolveNullableText(dto.numero_documento),
    ciudadId: resolveNullableText(dto.ciudad_id),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre),
    direccion: resolveNullableText(dto.direccion),
    celular: resolveNullableText(dto.celular),
    email: resolveNullableText(dto.email),
    numeroLicencia: resolveNullableText(dto.numero_licencia),
    categoriaLicencia: resolveNullableText(dto.categoria_licencia),
    vencimientoLicencia: resolveNullableText(dto.vencimiento_licencia),
    rutasAsignadas,
    cantidadRutasAsignadas: rutasAsignadas.length,
    estado: resolveStatus(dto.estado),
    createdAt: resolveNullableText(dto.created_at) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at),
    tieneDependenciasActivas: resolveBoolean(dto.dependencias_activas),
  };
}

export function mapDriverPayloadToBackend(
  payload: SaveDriverPayload,
  requestCompanyId: string,
): BackendSaveDriverPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    id_conductor: payload.idConductor.trim().toUpperCase(),
    nombre_conductor: payload.nombreConductor.trim(),
    tipo_documento: payload.tipoDocumento.trim(),
    numero_documento: payload.numeroDocumento?.trim() || null,
    ciudad_id: payload.ciudadId?.trim() || null,
    ciudad_nombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion?.trim() || null,
    celular: payload.celular?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    numero_licencia: payload.numeroLicencia?.trim() || null,
    categoria_licencia: payload.categoriaLicencia?.trim() || null,
    vencimiento_licencia: payload.vencimientoLicencia?.trim() || null,
    rutas_asignadas: payload.rutasAsignadas.map((route) => ({ route_id: route.routeId })),
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

function mapAssignedRoute(dto: BackendDriverAssignedRouteDto): DriverAssignedRoute {
  return {
    routeId: resolveText(dto.route_id, ''),
    idRuta: resolveText(dto.id_ruta, ''),
    nombreRuta: resolveText(dto.nombre_ruta, 'Ruta asignada'),
    zona: resolveText(dto.zona, ''),
    estado: 'ACTIVO',
  };
}

function resolveStatus(value: boolean | string | null | undefined): DriverStatus {
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