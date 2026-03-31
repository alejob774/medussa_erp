import { Company } from '../../../core/company/models/company.model';
import { AuthUser } from './auth-user.model';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  user?: AuthUser;

  activeCompanyId?: string | null;
  requiresCompanySelection?: boolean;
  companies?: Company[];

  selectedServer?: string;
}