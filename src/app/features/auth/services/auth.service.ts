import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from './auth-session.service';
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
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
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
      .pipe(map((response) => mapBackendLoginResponseToLoginResponse(response)));
  }

  getAuthenticatedContext(): Observable<BackendAuthMeResponse> {
    return this.http.get<BackendAuthMeResponse>(this.authMeUrl);
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, {});
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
}
