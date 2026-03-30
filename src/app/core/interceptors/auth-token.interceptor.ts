import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from '../../features/auth/services/auth-session.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authSessionService = inject(AuthSessionService);

  const isLoginRequest = req.url.includes('/login');

  if (isLoginRequest) {
    return next(req);
  }

  const accessToken = authSessionService.getAccessToken();
  const activeCompanyId = authSessionService.getActiveCompanyId();

  if (!accessToken && !activeCompanyId) {
    return next(req);
  }

  const setHeaders: Record<string, string> = {};

  if (accessToken) {
    setHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  if (activeCompanyId) {
    // TODO: confirmar con backend si este contexto viaja en JWT, header o ambos.
    setHeaders['X-Empresa-Id'] = activeCompanyId;
  }

  return next(
    req.clone({
      setHeaders,
    }),
  );
};