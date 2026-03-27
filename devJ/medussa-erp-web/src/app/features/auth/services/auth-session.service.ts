import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoginResponse } from '../models/login-response.model';

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
    const normalizedSession: LoginResponse = {
      ...session,
      activeCompanyId: session.activeCompanyId ?? null,
      requiresCompanySelection: session.requiresCompanySelection ?? false,
      companies: session.companies ?? [],
    };

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

  getAccessToken(): string | null {
    return this.sessionSubject.value?.access_token ?? null;
  }

  getRefreshToken(): string | null {
    return this.sessionSubject.value?.refresh_token ?? null;
  }

  getActiveCompanyId(): string | null {
    return this.sessionSubject.value?.activeCompanyId ?? null;
  }

  setActiveCompanyId(companyId: string | null): void {
    const currentSession = this.sessionSubject.value;

    if (!currentSession) {
      return;
    }

    const updatedSession: LoginResponse = {
      ...currentSession,
      activeCompanyId: companyId,
    };

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