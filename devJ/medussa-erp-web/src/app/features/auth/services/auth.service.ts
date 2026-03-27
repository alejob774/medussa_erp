// src/app/features/auth/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LoginRequest } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  login(payload: LoginRequest): Observable<LoginResponse> {
    const mockResponse: LoginResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
    };

    return of(mockResponse);
  }
}