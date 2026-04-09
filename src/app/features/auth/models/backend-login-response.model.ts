import { Company } from '../../../core/company/models/company.model';
import { BackendAuthUser } from './backend-auth-user.model';

export interface LoginResponseBackend {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user?: BackendAuthUser;

  empresa_id?: string | null;
  active_company_id?: string | null;
  requires_company_selection?: boolean;
  companies?: Company[];
}

export type BackendLoginResponse = LoginResponseBackend;