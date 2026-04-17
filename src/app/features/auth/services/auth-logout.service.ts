import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, take } from 'rxjs/operators';
import { PendingChangesService } from '../../../core/forms/services/pending-changes.service';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';

export interface LogoutResult {
  backendLogoutAttempted: boolean;
  backendLogoutFailed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthLogoutService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly pendingChangesService = inject(PendingChangesService);
  private readonly sessionStorageKeys = [
    'medussa.erp.auth.session',
    'medussa.erp.security.user-shadow',
  ] as const;

  private logoutInProgress = false;

  logout(): Observable<LogoutResult> {
    if (this.logoutInProgress) {
      return of({
        backendLogoutAttempted: false,
        backendLogoutFailed: false,
      });
    }

    this.logoutInProgress = true;

    const hasSession = this.authSessionService.isAuthenticated();
    const logoutRequest$ = hasSession ? this.authService.logout() : of(void 0);
    let backendLogoutFailed = false;

    return logoutRequest$.pipe(
      take(1),
      map(() => ({
        backendLogoutAttempted: hasSession,
        backendLogoutFailed: false,
      })),
      catchError(() => {
        backendLogoutFailed = hasSession;

        return of({
          backendLogoutAttempted: hasSession,
          backendLogoutFailed: hasSession,
        });
      }),
      finalize(() => {
        this.clearFrontendSessionArtifacts();
        void this.router.navigate(['/login'], {
          replaceUrl: true,
          state: backendLogoutFailed
            ? {
                logoutMessage:
                  'El backend no confirmo el cierre de sesion, pero la sesion local se cerro correctamente.',
              }
            : undefined,
        });
        this.logoutInProgress = false;
      }),
    );
  }

  private clearFrontendSessionArtifacts(): void {
    this.pendingChangesService.clear();
    this.authSessionService.clearSession();
    if (typeof window !== 'undefined') {
      this.clearKnownStorageKeys(localStorage);
      this.clearKnownStorageKeys(sessionStorage);
    }
    this.clearAccessibleCookies();
  }

  private clearKnownStorageKeys(storage: Storage): void {
    this.sessionStorageKeys.forEach((key) => storage.removeItem(key));
  }

  private clearAccessibleCookies(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie.split(';').forEach((cookie) => {
      const cookieName = cookie.split('=')[0]?.trim();

      if (!cookieName) {
        return;
      }

      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
    });
  }
}
