import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { LoginRequest } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { mapBackendLoginResponseToLoginResponse } from '../utils/auth.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  /**
   * Cambia esto a false cuando ya tengas:
   * - URL/puerto real del backend
   * - CORS habilitado
   * - credenciales de prueba
   */
  private readonly useMockLogin = true;

  /**
   * TODO:
   * Reemplazar estas URLs cuando backend confirme host y puerto reales.
   * Por ahora ambas apuntan al mismo placeholder local.
   */
  private readonly apiBaseUrls: Record<'produccion' | 'desarrollo', string> = {
    produccion: 'http://localhost:8000',
    desarrollo: 'http://localhost:8000',
  };

  login(payload: LoginRequest): Observable<LoginResponse> {
    const selectedServer = payload.server ?? 'produccion';

    const requestBody = {
      username: payload.username,
      password: payload.password,
    };

    if (this.useMockLogin) {
      return of(this.buildMockLoginResponse(selectedServer)).pipe(delay(800));
    }

    const baseUrl = this.resolveApiBaseUrl(selectedServer);

    return this.http
      .post<BackendLoginResponse>(`${baseUrl}/login`, requestBody)
      .pipe(
        map((response) =>
          mapBackendLoginResponseToLoginResponse(response, selectedServer),
        ),
      );
  }

  private resolveApiBaseUrl(server: 'produccion' | 'desarrollo'): string {
    return this.apiBaseUrls[server];
  }

  private buildMockLoginResponse(
    selectedServer: 'produccion' | 'desarrollo',
  ): LoginResponse {
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      selectedServer,
      activeCompanyId: null,
      requiresCompanySelection: false,
      companies: [],
    };
  }
}