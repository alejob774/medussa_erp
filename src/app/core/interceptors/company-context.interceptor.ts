import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from '../../features/auth/services/auth-session.service';

const COMPANY_CONTEXT_HEADER = 'X-Company-ID';

export const companyContextInterceptor: HttpInterceptorFn = (req, next) => {
  const authSessionService = inject(AuthSessionService);

  if (req.url.includes('/login') || req.headers.has(COMPANY_CONTEXT_HEADER)) {
    return next(req);
  }

  const session = authSessionService.getSession();
  const activeCompanyId = session?.activeCompanyId?.trim();

  if (!activeCompanyId) {
    return next(req);
  }

  const activeCompany = session?.companies?.find(
    (company) => company.id === activeCompanyId,
  );
  const requestCompanyId =
    activeCompany?.backendId?.trim() ||
    session?.activeBackendCompanyId?.trim() ||
    activeCompanyId;

  return next(
    req.clone({
      setHeaders: {
        [COMPANY_CONTEXT_HEADER]: requestCompanyId,
      },
    }),
  );
};
