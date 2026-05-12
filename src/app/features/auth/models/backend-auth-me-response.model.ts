export interface BackendAuthMeCompany {
  id?: string | number | null;
  empresa_id?: string | null;
  empresaId?: string | null;
  companyId?: string | null;
  backend_id?: string | null;
  backendId?: string | null;
  nombre_empresa?: string | null;
  nombre?: string | null;
  name?: string | null;
  codigo?: string | null;
  code?: string | null;
  descripcion?: string | null;
  description?: string | null;
  rol?: string | null;
  role?: string | null;
  perfil?: string | null;
  profile?: string | null;
  permisos?: unknown;
  permissions?: unknown;
  activa?: boolean | null;
  active?: boolean | null;
  isActive?: boolean | null;
}

export interface BackendAuthMeResponse {
  id: number | string;
  nombre?: string | null;
  apellido?: string | null;
  username?: string | null;
  email: string;
  empresa_id?: string | null;
  empresaId?: string | null;
  empresa_activa?: string | null;
  active_company_id?: string | null;
  activeCompanyId?: string | null;
  rol?: string | null;
  role?: string | null;
  perfil?: string | null;
  profile?: string | null;
  permisos?: unknown;
  permissions?: unknown;
  empresas?: BackendAuthMeCompany[] | null;
  companies?: BackendAuthMeCompany[] | null;
}
