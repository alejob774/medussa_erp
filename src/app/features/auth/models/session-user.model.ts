import { Company } from '../../../core/company/models/company.model';
import { AuthUser } from './auth-user.model';

export interface SessionUser extends AuthUser {
  companies: Company[];
  activeCompanyId: string | null;
}
