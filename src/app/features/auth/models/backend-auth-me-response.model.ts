export interface BackendAuthMeResponse {
  id: number | string;
  nombre: string;
  email: string;
  empresa_id?: string | null;
  empresa_activa?: string | null;
  rol?: string | null;
  perfil?: string | null;
  permisos?: string[];
}