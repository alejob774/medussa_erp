import { BackendAuthUser } from './backend-auth-user.model';

export interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user?: BackendAuthUser;
}