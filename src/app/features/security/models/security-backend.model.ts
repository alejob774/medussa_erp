export interface UsuarioEmpresaBackendMembership {
  empresa_id: string;
  rol_id?: number | string | null;
  perfil_id?: number | string | null;
}

export interface UsuarioBackendListItem {
  id: number | string;
  nombre?: string;
  apellido?: string;
  username?: string;
  email: string;
  cargo?: string;
  celular?: string;
  telefono?: string;
  telefono_fijo?: string;
  foto?: string;
  foto_url?: string;
  avatar_url?: string;
  imagen_url?: string;
  estado?: boolean | string | number | null;
  empresas?: UsuarioEmpresaBackendMembership[];
}

export interface UsuarioDetalleBackendResponse extends UsuarioBackendListItem {
  permisos?: unknown;
}

export interface UsuarioCreateBackendRequest {
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  password?: string;
  cargo?: string;
  celular?: string;
  telefono_fijo?: string;
  foto_url?: string;
  empresas: UsuarioEmpresaBackendMembership[];
}

export interface RolBackendResponse {
  id: number | string;
  nombre?: string;
  descripcion?: string;
  estado?: boolean | string | number | null;
  activo?: boolean | null;
  empresa_id?: string | null;
  global?: boolean;
  permisos?: unknown;
}

export interface RolCreateBackendRequest {
  empresa_id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  permisos?: unknown;
}

export interface RolUpdateBackendRequest extends RolCreateBackendRequest {}

export interface PerfilBackendResponse {
  id: number | string;
  nombre?: string;
  descripcion?: string;
  estado?: boolean | string | number | null;
  activo?: boolean | null;
  empresa_id?: string | null;
  permisos?: unknown;
}

export interface PerfilCreateBackendRequest {
  empresa_id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  permisos: Record<string, string[]>;
}

export interface PerfilUpdateBackendRequest extends PerfilCreateBackendRequest {}

export interface AuditoriaBackendItem {
  id?: number | string;
  evento_id?: number | string;
  usuario?: string;
  user?: string;
  username?: string;
  empresa_id?: string;
  company_id?: string;
  empresa_nombre?: string;
  company_name?: string;
  modulo?: string;
  accion?: string;
  descripcion?: string;
  detalle?: string;
  ip_origen?: string;
  ip_address?: string;
  fecha_hora?: string;
  created_at?: string;
  timestamp?: string;
  navegador_agente?: string;
  browser_agent?: string;
  payload_antes?: Record<string, unknown> | null;
  before_payload?: Record<string, unknown> | null;
  payload_despues?: Record<string, unknown> | null;
  after_payload?: Record<string, unknown> | null;
}
