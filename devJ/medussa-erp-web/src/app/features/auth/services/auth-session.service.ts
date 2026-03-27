// src/app/features/auth/services/auth-session.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoginResponse } from '../models/login-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private sessionSubject = new BehaviorSubject<LoginResponse | null>(null);
  session$ = this.sessionSubject.asObservable();

  setSession(session: LoginResponse): void {
    this.sessionSubject.next(session);
  }

  clearSession(): void {
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

  isAuthenticated(): boolean {
    return !!this.sessionSubject.value?.access_token;
  }
}