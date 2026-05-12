import { SaveDriverPayload } from '../../domain/models/driver-form.model';
import { Driver, DriverAssignedRoute, DriverStatus } from '../../domain/models/driver.model';

export interface BackendDriverAssignedRouteDto {
  route_id?: string | number | null;
  routeId?: string | number | null;
  id_ruta?: string | null;
  idRuta?: string | null;
  nombre_ruta?: string | null;
  nombreRuta?: string | null;
  zona?: string | null;
  estado?: string | null;
}

export interface BackendDriverDto {
  id?: string | number | null;
  conductor_id?: string | number | null;
  conductorId?: string | number | null;
  empresa_id?: string | number | null;
  companyId?: string | number | null;
  empresa_nombre?: string | null;
  companyName?: string | null;
  id_conductor?: string | null;
  idConductor?: string | null;
  nombre_conductor?: string | null;
  nombreConductor?: string | null;
  tipo_documento?: string | null;
  tipoDocumento?: string | null;
  numero_documento?: string | null;
  numeroDocumento?: string | null;
  ciudad_id?: string | number | null;
  ciudadId?: string | number | null;
  ciudad_nombre?: string | null;
  ciudadNombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  numero_licencia?: string | null;
  numeroLicencia?: string | null;
  categoria_licencia?: string | null;
  categoriaLicencia?: string | null;
  vencimiento_licencia?: string | null;
  vencimientoLicencia?: string | null;
  rutas_asignadas?: BackendDriverAssignedRouteDto[] | null;
  rutasAsignadas?: BackendDriverAssignedRouteDto[] | null;
  estado?: boolean | string | null;
  activo?: boolean | number | string | null;
  isActive?: boolean | number | string | null;
  dependencias_activas?: boolean | number | string | null;
  tieneDependenciasActivas?: boolean | number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
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
  const nombreConductor = resolveText(
    dto.nombre_conductor,
    dto.nombreConductor,
    'Conductor sin nombre',
  );
  const rutasAsignadas = (dto.rutas_asignadas ?? dto.rutasAsignadas ?? []).map((route) =>
    mapAssignedRoute(route),
  );

  return {
    id: resolveText(dto.id, dto.conductor_id, dto.conductorId, dto.id_conductor, dto.idConductor, nombreConductor),
    empresaId: resolveText(dto.empresa_id, dto.companyId, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.companyName, companyNameFallback),
    idConductor: resolveText(dto.id_conductor, dto.idConductor, ''),
    nombreConductor,
    tipoDocumento: resolveText(dto.tipo_documento, dto.tipoDocumento, ''),
    numeroDocumento: resolveNullableText(dto.numero_documento, dto.numeroDocumento),
    ciudadId: resolveNullableText(dto.ciudad_id, dto.ciudadId),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre, dto.ciudadNombre),
    direccion: resolveNullableText(dto.direccion),
    celular: resolveNullableText(dto.celular),
    email: resolveNullableText(dto.email),
    numeroLicencia: resolveNullableText(dto.numero_licencia, dto.numeroLicencia),
    categoriaLicencia: resolveNullableText(dto.categoria_licencia, dto.categoriaLicencia),
    vencimientoLicencia: resolveNullableText(dto.vencimiento_licencia, dto.vencimientoLicencia),
    rutasAsignadas,
    cantidadRutasAsignadas: rutasAsignadas.length,
    estado: resolveStatus(dto.estado, dto.activo, dto.isActive),
    createdAt: resolveNullableText(dto.created_at, dto.createdAt) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.updatedAt),
    tieneDependenciasActivas: resolveBoolean(dto.dependencias_activas ?? dto.tieneDependenciasActivas),
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
    routeId: resolveText(dto.route_id, dto.routeId, ''),
    idRuta: resolveText(dto.id_ruta, dto.idRuta, ''),
    nombreRuta: resolveText(dto.nombre_ruta, dto.nombreRuta, 'Ruta asignada'),
    zona: resolveText(dto.zona, ''),
    estado: 'ACTIVO',
  };
}

function resolveStatus(
  ...values: Array<boolean | number | string | null | undefined>
): DriverStatus {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 'ACTIVO' : 'INACTIVO';
    }

    if (typeof value === 'number') {
      return value !== 0 ? 'ACTIVO' : 'INACTIVO';
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
