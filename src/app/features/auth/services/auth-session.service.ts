import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Company } from '../../../core/company/models/company.model';
import { LoginResponse } from '../models/login-response.model';
import { SessionUser } from '../models/session-user.model';
import { resolveCompanyIdentityState } from '../utils/auth.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly storageKey = 'medussa.erp.auth.session';

  private sessionSubject = new BehaviorSubject<LoginResponse | null>(
    this.restoreSession(),
  );

  session$ = this.sessionSubject.asObservable();

  setSession(session: LoginResponse, remember: boolean = false): void {
    const normalizedSession = this.normalizeSession(session);

    this.clearPersistedSession();

    const targetStorage = this.getStorage(remember);
    targetStorage?.setItem(this.storageKey, JSON.stringify(normalizedSession));

    this.sessionSubject.next(normalizedSession);
  }

  clearSession(): void {
    this.clearPersistedSession();
    this.sessionSubject.next(null);
  }

  getSession(): LoginResponse | null {
    return this.sessionSubject.value;
  }

  getSessionUser(): SessionUser | null {
    const session = this.sessionSubject.value;

    if (!session?.user) {
      return null;
    }

    return {
      ...session.user,
      companies: session.companies ?? [],
      activeCompanyId: session.activeCompanyId ?? null,
      activeBackendCompanyId: session.activeBackendCompanyId ?? null,
    };
  }

  getAvailableCompanies(): Company[] {
    return this.sessionSubject.value?.companies ?? [];
  }

  getAccessToken(): string | null {
    return this.sessionSubject.value?.access_token ?? null;
  }

  getRefreshToken(): string | null {
    return this.sessionSubject.value?.refresh_token ?? null;
  }

  getActiveCompanyId(): string | null {
    return this.sessionSubject.value?.activeCompanyId ?? null;
  }

  getActiveBackendCompanyId(): string | null {
    return this.sessionSubject.value?.activeBackendCompanyId ?? null;
  }

  getPreferredCompanyIdForRequest(): string | null {
    return this.getActiveBackendCompanyId() ?? this.getActiveCompanyId();
  }

  updateSession(session: LoginResponse): void {
    const normalizedSession = this.normalizeSession(session);

    this.sessionSubject.next(normalizedSession);
    this.persistSession(normalizedSession);
  }

  setActiveCompanyId(companyId: string | null): void {
    const currentSession = this.sessionSubject.value;

    if (!currentSession) {
      return;
    }

    const nextBackendCompanyId =
      currentSession.companies?.find((company) => company.id === companyId)?.backendId ?? null;

    const updatedSession = this.normalizeSession({
      ...currentSession,
      activeCompanyId: companyId,
      activeBackendCompanyId: nextBackendCompanyId,
      requiresCompanySelection: false,
    });

    this.sessionSubject.next(updatedSession);
    this.persistSession(updatedSession);
  }

  isAuthenticated(): boolean {
    return !!this.sessionSubject.value?.access_token;
  }

  private restoreSession(): LoginResponse | null {
    if (!this.isBrowser()) {
      return null;
    }

    return this.readStorage(localStorage) ?? this.readStorage(sessionStorage);
  }

  private readStorage(storage: Storage): LoginResponse | null {
    const raw = storage.getItem(this.storageKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as LoginResponse;
    } catch {
      storage.removeItem(this.storageKey);
      return null;
    }
  }

  private persistSession(session: LoginResponse): void {
    if (!this.isBrowser()) {
      return;
    }

    const shouldUseLocalStorage =
      localStorage.getItem(this.storageKey) !== null;

    const targetStorage = shouldUseLocalStorage ? localStorage : sessionStorage;

    this.clearPersistedSession();
    targetStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private normalizeSession(session: LoginResponse): LoginResponse {
    const companyState = resolveCompanyIdentityState(session.companies ?? [], {
      activeCompanyId: session.activeCompanyId ?? null,
      activeBackendCompanyId: session.activeBackendCompanyId ?? null,
    });

    return {
      ...session,
      companies: companyState.companies,
      activeCompanyId: companyState.activeCompanyId,
      activeBackendCompanyId: companyState.activeBackendCompanyId,
      requiresCompanySelection:
        session.requiresCompanySelection ??
        (companyState.companies.length > 1 && !companyState.activeCompanyId),
    };
  }

  private clearPersistedSession(): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.storageKey);
  }

  private getStorage(remember: boolean): Storage | null {
    if (!this.isBrowser()) {
      return null;
    }

    return remember ? localStorage : sessionStorage;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}