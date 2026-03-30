export interface LoginRequest {
  username: string;
  password: string;
  server?: 'produccion' | 'desarrollo';
}