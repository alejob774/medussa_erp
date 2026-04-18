import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, throwError, timeout } from 'rxjs';
import { CompanyMockFacadeService } from '../../../core/company/services/company-mock-facade.service';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import { AuthUser } from '../models/auth-user.model';
import { BackendAuthMeResponse } from '../models/backend-auth-me-response.model';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { LoginRequest } from '../models/login-request.model';
import { LoginRequestBackend } from '../models/login-request-backend.model';
import { LoginResponse } from '../models/login-response.model';
import {
  mapBackendLoginResponseToLoginResponse,
  mergeAuthenticatedContextIntoSession,
} from '../utils/auth.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginTimeoutMs = 5000;
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly companyMockFacade = inject(CompanyMockFacadeService);
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;
  private readonly authMeUrl = `${environment.apiUrl}/auth/me`;
  private readonly logoutUrl = `${environment.apiUrl}/auth/logout`;

  login(payload: LoginRequest): Observable<LoginResponse> {
    const requestPayload: LoginRequestBackend = {
      username: payload.username.trim().toLowerCase(),
      password: payload.password,
    };

    const body = new HttpParams({
      fromObject: {
        username: requestPayload.username,
        password: requestPayload.password,
      },
    });

    return this.http
      .post<BackendLoginResponse>(this.loginUrl, body.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
      .pipe(
        timeout(this.loginTimeoutMs),
        map((response) => mapBackendLoginResponseToLoginResponse(response)),
      );
  }

  getAuthenticatedContext(): Observable<BackendAuthMeResponse> {
    return this.http.get<BackendAuthMeResponse>(this.authMeUrl);
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, {});
  }

  createMockLoginSession(username: string): LoginResponse {
    const normalizedUsername = username.trim().toLowerCase() || 'admin';
    const mockContext = this.companyMockFacade.getSessionContext(normalizedUsername);
    const primaryRole = mockContext.roles[0] ?? 'super-admin';
    const authUser: AuthUser = {
      id: `mock-${normalizedUsername}`,
      username: normalizedUsername,
      email: `${normalizedUsername}@medussa.local`,
      displayName: this.buildMockDisplayName(normalizedUsername),
      roles: [...mockContext.roles],
      roleName: primaryRole,
      profileName: 'Modo local',
      permissions: [...mockContext.permissions],
    };

    return {
      access_token: `mock-access-token-${normalizedUsername}`,
      refresh_token: `mock-refresh-token-${normalizedUsername}`,
      token_type: 'bearer',
      expires_in: 60 * 60 * 8,
      user: authUser,
      activeCompanyId: mockContext.defaultCompanyId,
      activeBackendCompanyId:
        mockContext.companies.find((company) => company.id === mockContext.defaultCompanyId)?.backendId ??
        null,
      requiresCompanySelection:
        mockContext.companies.length > 1 && !mockContext.defaultCompanyId,
      companies: mockContext.companies.map((company) => ({ ...company })),
    };
  }

  canUseMockLoginFallback(error: unknown): boolean {
    if (!environment.allowMockLoginFallback) {
      return false;
    }

    const status = (error as { status?: number })?.status;
    const errorName = (error as { name?: string })?.name;

    if (errorName === 'TimeoutError') {
      return true;
    }

    if (status === 0 || status === 404 || status === 405) {
      return true;
    }

    return typeof status === 'number' && status >= 500;
  }

  syncAuthenticatedContext(): Observable<'synced' | 'fallback' | 'skipped'> {
    const currentSession = this.authSessionService.getSession();

    if (!currentSession?.access_token || !currentSession.activeCompanyId) {
      return of('skipped');
    }

    return this.getAuthenticatedContext().pipe(
      map((response) => {
        const nextSession = mergeAuthenticatedContextIntoSession(
          this.authSessionService.getSession() ?? currentSession,
          response,
        );

        this.authSessionService.updateSession(nextSession);
        return 'synced' as const;
      }),
      catchError((error: unknown) => {
        if (this.isRecoverableContextFallback(error)) {
          return of('fallback' as const);
        }

        return throwError(() => error);
      }),
    );
  }

  private isRecoverableContextFallback(error: unknown): boolean {
    const status = (error as { status?: number })?.status;

    return status === 0 || status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504;
  }

  private buildMockDisplayName(username: string): string {
    const displayNames: Record<string, string> = {
      admin: 'Administrador local Medussa Holding',
      ventas: 'Coordinacion comercial local',
      produccion: 'Coordinacion de produccion local',
      rrhh: 'Coordinacion de talento local',
    };

    return displayNames[username] ?? `Usuario local ${username}`;
  }
}
