import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, throwError, timeout } from 'rxjs';
import { Company } from '../../../core/company/models/company.model';
import { CompanyMockFacadeService } from '../../../core/company/services/company-mock-facade.service';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from './auth-session.service';
import { AuthUser } from '../models/auth-user.model';
import {
  BackendAuthMeCompany,
  BackendAuthMeResponse,
} from '../models/backend-auth-me-response.model';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { LoginRequest } from '../models/login-request.model';
import { LoginRequestBackend } from '../models/login-request-backend.model';
import { LoginResponse } from '../models/login-response.model';
import {
  mapBackendCompaniesToCompanies,
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
  private readonly userCompaniesUrl = `${environment.apiUrl}/empresas/mis-empresas`;
  private readonly selectCompanyUrl = `${environment.apiUrl}/auth/seleccionar-empresa`;

  login(payload: LoginRequest): Observable<LoginResponse> {
    if (environment.useAuthMock) {
      return of(this.createMockLoginSession(payload.username));
    }

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
    if (environment.useAuthMock) {
      return of(this.buildMockAuthenticatedContext());
    }

    return this.http.get<BackendAuthMeResponse>(this.authMeUrl);
  }

  listUserCompanies(
    session: LoginResponse | null = this.authSessionService.getSession(),
    username?: string,
  ): Observable<Company[]> {
    if (environment.useUserCompaniesMock) {
      return of(this.resolveFallbackCompanies(session, username));
    }

    return this.http.get<unknown>(this.userCompaniesUrl).pipe(
      map((response) =>
        mapBackendCompaniesToCompanies(
          this.extractCompanyPayload(response),
          session?.companies ?? [],
        ),
      ),
      catchError((error: unknown) => {
        if (environment.enableUserCompaniesFallback && this.isRecoverableContextFallback(error)) {
          return of(this.resolveFallbackCompanies(session, username));
        }

        return throwError(() => error);
      }),
    );
  }

  selectActiveCompany(companyId: string | null): Observable<'selected' | 'fallback' | 'skipped'> {
    const currentSession = this.authSessionService.getSession();

    if (!currentSession?.access_token || !companyId) {
      return of('skipped');
    }

    if (environment.useAuthMock) {
      return of('fallback');
    }

    const requestCompanyId = this.resolveRequestCompanyId(companyId, currentSession);
    const body = {
      empresa_id: requestCompanyId,
      company_id: requestCompanyId,
      companyId: requestCompanyId,
    };

    return this.http.post<unknown>(this.selectCompanyUrl, body).pipe(
      map(() => 'selected' as const),
      catchError((error: unknown) => {
        if (environment.enableAuthFallback && this.isRecoverableContextFallback(error)) {
          return of('fallback' as const);
        }

        return throwError(() => error);
      }),
    );
  }

  logout(): Observable<void> {
    if (environment.useAuthMock) {
      return of(void 0);
    }

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
    if (!environment.allowMockLoginFallback && !environment.enableAuthFallback) {
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
        if (environment.enableAuthFallback && this.isRecoverableContextFallback(error)) {
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

  private resolveFallbackCompanies(
    session: LoginResponse | null,
    username?: string,
  ): Company[] {
    const sessionCompanies = session?.companies ?? [];

    if (sessionCompanies.length) {
      return sessionCompanies.map((company) => ({ ...company }));
    }

    return this.companyMockFacade
      .getSessionContext(username ?? session?.user?.username)
      .companies.map((company) => ({ ...company }));
  }

  private buildMockAuthenticatedContext(): BackendAuthMeResponse {
    const session = this.authSessionService.getSession();
    const mockContext = this.companyMockFacade.getSessionContext(session?.user?.username);
    const companies = session?.companies?.length ? session.companies : mockContext.companies;
    const activeCompany =
      companies.find((company) => company.id === session?.activeCompanyId) ??
      companies.find((company) => company.backendId === session?.activeBackendCompanyId) ??
      companies[0] ??
      null;

    return {
      id: session?.user?.id ?? 'mock-user',
      nombre: session?.user?.displayName ?? session?.user?.username ?? 'Usuario local',
      username: session?.user?.username ?? 'usuario',
      email: session?.user?.email ?? 'usuario@medussa.local',
      empresa_id: activeCompany?.backendId ?? activeCompany?.id ?? null,
      empresa_activa: activeCompany?.backendId ?? activeCompany?.id ?? null,
      rol: session?.user?.roleName ?? session?.user?.roles?.[0] ?? mockContext.roles[0] ?? null,
      perfil: session?.user?.profileName ?? 'Modo local',
      permisos: session?.user?.permissions ?? mockContext.permissions,
      empresas: companies.map((company) => ({
        empresa_id: company.backendId ?? company.id,
        nombre_empresa: company.name,
        codigo: company.code,
        rol: session?.user?.roleName ?? session?.user?.roles?.[0] ?? mockContext.roles[0] ?? null,
        perfil: session?.user?.profileName ?? 'Modo local',
        permisos: session?.user?.permissions ?? mockContext.permissions,
        activa: company.id === activeCompany?.id,
      })),
    };
  }

  private extractCompanyPayload(payload: unknown): Array<Company | BackendAuthMeCompany> {
    if (Array.isArray(payload)) {
      return payload as Array<Company | BackendAuthMeCompany>;
    }

    if (payload && typeof payload === 'object') {
      const candidate = payload as {
        empresas?: unknown[];
        companies?: unknown[];
        items?: unknown[];
        results?: unknown[];
        data?: unknown[];
      };

      const companies =
        candidate.empresas ??
        candidate.companies ??
        candidate.items ??
        candidate.results ??
        candidate.data;

      return Array.isArray(companies)
        ? (companies as Array<Company | BackendAuthMeCompany>)
        : [];
    }

    return [];
  }

  private resolveRequestCompanyId(companyId: string, session: LoginResponse): string {
    const company = session.companies?.find(
      (candidate) => candidate.id === companyId || candidate.backendId === companyId,
    );

    return (
      company?.backendId ??
      (session.activeCompanyId === companyId ? session.activeBackendCompanyId : null) ??
      companyId
    );
  }

  private buildMockDisplayName(username: string): string {
    const displayNames: Record<string, string> = {
      admin: 'Administrador local Industrias Alimenticias El Arbolito',
      ventas: 'Coordinacion comercial local',
      produccion: 'Coordinacion de produccion local',
      rrhh: 'Coordinacion de talento local',
    };

    return displayNames[username] ?? `Usuario local ${username}`;
  }
}
