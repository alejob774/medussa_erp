export interface BackendAuthUser {
  id: number | string;
  username?: string;
  nombre?: string;
  apellido?: string | null;
  email: string;
  empresa_id?: string | null;
  empresa_ids?: string[] | null;
  roles?: string[];
  rol?: string | null;
  perfil?: string | null;
  permisos?: unknown;
}
