import { Company } from '../../../../core/company/models/company.model';
import {
  CompanyAssociatedUserVm,
  CompanyDetailVm,
  CompanyRecordStatus,
  CompanyRowVm,
  SaveCompanyPayload,
} from '../../domain/models/company-administration.model';

export interface BackendCompanyUserDto {
  id?: number | string | null;
  backend_id?: number | string | null;
  user_id?: number | string | null;
  nombre?: string;
  full_name?: string;
  email?: string;
  rol?: string;
  role?: string;
  estado?: boolean | string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
}

export interface EmpresaBackendResponse {
  id?: number | string | null;
  backend_id?: number | string | null;
  empresa_id?: number | string | null;
  codigo?: string | null;
  code?: string | null;
  nombre_empresa?: string | null;
  nombre?: string | null;
  name?: string | null;
  nit?: string | null;
  sector?: string | null;
  direccion?: string | null;
  address?: string | null;
  ciudad?: string | null;
  city?: string | null;
  pais?: string | null;
  country?: string | null;
  telefono?: string | null;
  phone?: string | null;
  email?: string | null;
  estado?: boolean | string | null;
  activo?: boolean | null;
  logo?: string | null;
  logo_url?: string | null;
  fecha_creacion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  fecha_inicio_operacion?: string | null;
  operation_start_date?: string | null;
  moneda?: string | null;
  moneda_base?: string | null;
  currency?: string | null;
  zona_horaria?: string | null;
  timezone?: string | null;
  idioma?: string | null;
  language?: string | null;
  impuestos?: string | null;
  tax_configuration?: string | null;
  configuraciones_iniciales?: Record<string, unknown> | string | null;
  initial_configuration?: Record<string, unknown> | string | null;
  usuarios_asociados?: BackendCompanyUserDto[] | null;
  associated_users?: BackendCompanyUserDto[] | null;
  usuarios_count?: number | null;
  associated_users_count?: number | null;
}

export interface BackendCompanyCatalogsDto {
  sectores?: Array<{ value?: string | null; label?: string | null } | string>;
  countries?: Array<{ value?: string | null; label?: string | null } | string>;
  currencies?: Array<{ value?: string | null; label?: string | null } | string>;
  timezones?: Array<{ value?: string | null; label?: string | null } | string>;
  languages?: Array<{ value?: string | null; label?: string | null } | string>;
  paises?: Array<{ value?: string | null; label?: string | null } | string>;
  monedas?: Array<{ value?: string | null; label?: string | null } | string>;
  zonas_horarias?: Array<{ value?: string | null; label?: string | null } | string>;
  idiomas?: Array<{ value?: string | null; label?: string | null } | string>;
}

interface EmpresaBackendRequestBase {
  empresa_id: string;
  nombre_empresa: string;
  nit: string;
  direccion: string;
  ciudad: string;
  pais: string;
  moneda: string;
  zona_horaria: string;
  telefono: string | null;
  email: string | null;
  logo: string | null;
  sector?: string | null;
  estado?: boolean;
  fecha_inicio_operacion?: string | null;
  configuraciones_iniciales?: Record<string, unknown> | null;
}

export interface EmpresaCreateBackendRequest extends EmpresaBackendRequestBase {}

export interface EmpresaUpdateBackendRequest extends EmpresaBackendRequestBase {}

export type BackendCompanyDto = EmpresaBackendResponse;

export type BackendSaveCompanyPayload = EmpresaCreateBackendRequest;

export function mapBackendCompanyToDetail(dto: EmpresaBackendResponse): CompanyDetailVm {
  const companyName = resolveText(dto.nombre_empresa, dto.nombre, dto.name, 'Empresa sin nombre');
  const associatedUsers = mapAssociatedUsers(
    dto.usuarios_asociados ?? dto.associated_users ?? [],
  );
  const dbId = resolveNullableText(dto.id, dto.backend_id);
  const backendCompanyId = resolveNullableText(dto.empresa_id, dto.backend_id);
  const initialConfiguration = parseInitialConfiguration(
    dto.configuraciones_iniciales ?? dto.initial_configuration,
  );

  return {
    id: resolveId(dbId, backendCompanyId, companyName),
    dbId,
    backendId: backendCompanyId,
    code: resolveText(dto.codigo, dto.code, buildCompanyCode(companyName)),
    companyName,
    nit: resolveText(dto.nit, 'Sin NIT'),
    sector: resolveText(dto.sector, 'Sin sector'),
    address: resolveText(dto.direccion, dto.address, ''),
    city: resolveText(dto.ciudad, dto.city, ''),
    country: resolveText(dto.pais, dto.country, 'Colombia'),
    phone: resolveText(dto.telefono, dto.phone, ''),
    email: resolveText(dto.email, ''),
    status: resolveStatus(dto.estado, dto.activo),
    logoUrl: resolveNullableText(dto.logo_url, dto.logo),
    associatedUsers,
    associatedUsersCount:
      dto.associated_users_count ?? dto.usuarios_count ?? associatedUsers.length,
    createdAt: resolveText(dto.fecha_creacion, dto.created_at, new Date().toISOString()),
    updatedAt: resolveNullableText(dto.updated_at),
    operationStartDate: resolveNullableText(
      dto.fecha_inicio_operacion,
      dto.operation_start_date,
    ),
    baseCurrency: resolveText(dto.moneda, dto.moneda_base, dto.currency, 'COP'),
    timezone: resolveText(dto.zona_horaria, dto.timezone, 'America/Bogota'),
    language: resolveText(
      dto.idioma,
      dto.language,
      resolveUnknownText(initialConfiguration['idioma']),
      'es-CO',
    ),
    taxConfiguration: resolveText(
      dto.impuestos,
      dto.tax_configuration,
      resolveUnknownText(initialConfiguration['impuestos']),
      '',
    ),
    initialConfiguration: stringifyInitialConfiguration(initialConfiguration),
  };
}

export function mapCompanyDetailToRow(company: CompanyDetailVm): CompanyRowVm {
  return {
    ...company,
    associatedUsers: company.associatedUsers.map((user) => ({ ...user })),
    associatedUsersCount: company.associatedUsersCount ?? company.associatedUsers.length,
  };
}

export function mapCompanyDetailToContextCompany(company: CompanyDetailVm): Company {
  const frontendCompanyId = resolveFrontendCompanyId(
    company.backendId ?? company.id,
    company.companyName,
  );

  return {
    id: frontendCompanyId,
    dbId: company.dbId ?? company.id,
    backendId: company.backendId ?? company.id,
    name: company.companyName,
    code: company.code,
    description: [company.sector, company.city].filter(Boolean).join(' · '),
  };
}

export function mapCompanyPayloadToBackend(
  payload: SaveCompanyPayload,
): EmpresaCreateBackendRequest {
  return {
    empresa_id: buildBackendCompanyId(payload.companyName),
    nombre_empresa: payload.companyName.trim(),
    nit: payload.nit.trim(),
    direccion: payload.address.trim(),
    ciudad: payload.city.trim(),
    pais: payload.country.trim(),
    moneda: payload.baseCurrency,
    zona_horaria: payload.timezone,
    telefono: payload.phone.trim() || null,
    email: payload.email.trim() || null,
    logo: payload.logoUrl,
    sector: payload.sector.trim() || null,
    estado: payload.status === 'active',
    fecha_inicio_operacion: payload.operationStartDate,
    configuraciones_iniciales: {
      idioma: payload.language,
      impuestos: payload.taxConfiguration.trim(),
      configuracion_inicial: payload.initialConfiguration.trim() || null,
    },
  };
}

function mapAssociatedUsers(users: BackendCompanyUserDto[]): CompanyAssociatedUserVm[] {
  return users.map((user) => ({
    userId: resolveId(user.id, user.user_id, 'usuario'),
    backendId: resolveNullableText(user.backend_id),
    fullName: resolveText(user.nombre, user.full_name, 'Usuario asociado'),
    email: resolveText(user.email, 'sin-correo@medussa.local'),
    roleLabel: resolveNullableText(user.rol, user.role),
    status: resolveStatus(user.estado),
    avatarUrl: resolveNullableText(user.avatar_url, user.photo_url),
  }));
}

function resolveStatus(...values: Array<boolean | string | null | undefined>): CompanyRecordStatus {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 'active' : 'inactive';
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (['activo', 'active', '1', 'true'].includes(normalized)) {
        return 'active';
      }

      if (['inactivo', 'inactive', '0', 'false'].includes(normalized)) {
        return 'inactive';
      }
    }
  }

  return 'active';
}

function resolveId(
  ...values: Array<number | string | null | undefined>
): string {
  for (const value of values) {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return `company-${Date.now()}`;
}

function resolveNullableText(
  ...values: Array<number | string | null | undefined>
): string | null {
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

function resolveText(
  ...values: Array<number | string | null | undefined>
): string {
  const resolved = resolveNullableText(...values);
  return resolved ?? '';
}

function buildCompanyCode(companyName: string): string {
  const tokens = companyName
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  if (!tokens.length) {
    return 'COMP';
  }

  return tokens
    .slice(0, 4)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
}

function resolveFrontendCompanyId(
  backendCompanyId?: string | null,
  companyName?: string | null,
): string {
  const normalizedBackendCompanyId = backendCompanyId?.trim().toUpperCase();
  const normalizedCompanyName = normalizeComparableText(companyName);

  if (normalizedBackendCompanyId === 'EMP-001' || normalizedCompanyName.includes('arbolito')) {
    return 'medussa-holding';
  }

  if (normalizedBackendCompanyId === 'EMP-002' || normalizedCompanyName.includes('medussa holding')) {
    return 'medussa-retail';
  }

  return backendCompanyId?.trim() || buildCompanyCode(companyName ?? 'empresa').toLowerCase();
}

function buildBackendCompanyId(companyName: string): string {
  const normalizedName = normalizeComparableText(companyName)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .toUpperCase();

  return normalizedName ? `EMP-${normalizedName}` : `EMP-${Date.now()}`;
}

function normalizeComparableText(value?: string | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseInitialConfiguration(
  value: Record<string, unknown> | string | null | undefined,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsedValue = JSON.parse(value) as Record<string, unknown>;
      return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
    } catch {
      return {};
    }
  }

  return value;
}

function stringifyInitialConfiguration(value: Record<string, unknown>): string {
  return Object.keys(value).length ? JSON.stringify(value) : '';
}

function resolveUnknownText(value: unknown): string | null {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}
