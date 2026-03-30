export interface BackendAuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permisos: string[];
}