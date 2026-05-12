import { Company } from '../../../core/company/models/company.model';
import { BackendAuthMeCompany } from './backend-auth-me-response.model';
import { BackendAuthUser } from './backend-auth-user.model';

export interface LoginResponseBackend {
  access_token: string;
  accessToken?: string;
  refresh_token: string;
  refreshToken?: string;
  token_type: string;
  tokenType?: string;
  expires_in?: number;
  expiresIn?: number;
  user?: BackendAuthUser;

  empresa_id?: string | null;
  empresaId?: string | null;
  active_company_id?: string | null;
  activeCompanyId?: string | null;
  requires_company_selection?: boolean;
  requiresCompanySelection?: boolean;
  companies?: Array<Company | BackendAuthMeCompany>;
  empresas?: BackendAuthMeCompany[] | null;
}

export type BackendLoginResponse = LoginResponseBackend;
