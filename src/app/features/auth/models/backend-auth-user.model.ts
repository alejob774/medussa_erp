export interface BackendAuthUser {
  id: number | string;
  username?: string;
  nombre?: string;
  apellido?: string | null;
  email: string;
  empresa_id?: string | null;
  empresaId?: string | null;
  empresa_ids?: string[] | null;
  companyIds?: string[] | null;
  roles?: string[];
  rol?: string | null;
  role?: string | null;
  perfil?: string | null;
  profile?: string | null;
  permisos?: unknown;
  permissions?: unknown;
}
