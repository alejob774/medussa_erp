export interface BackendAuthMeCompany {
  empresa_id?: string | null;
  nombre_empresa?: string | null;
  rol?: string | null;
  perfil?: string | null;
  permisos?: unknown;
}

export interface BackendAuthMeResponse {
  id: number | string;
  nombre: string;
  apellido?: string | null;
  username?: string | null;
  email: string;
  empresa_id?: string | null;
  empresa_activa?: string | null;
  rol?: string | null;
  perfil?: string | null;
  permisos?: unknown;
  empresas?: BackendAuthMeCompany[] | null;
}
