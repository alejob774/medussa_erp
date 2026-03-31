import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { LoginRequest } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';
import { mapBackendLoginResponseToLoginResponse } from '../utils/auth.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;

  login(payload: LoginRequest): Observable<LoginResponse> {
    const selectedServer = payload.server ?? 'produccion';

    const body = new HttpParams({
      fromObject: {
        username: payload.username,
        password: payload.password,
      },
    });

    return this.http
      .post<BackendLoginResponse>(this.loginUrl, body.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
      .pipe(
        map((response) =>
          mapBackendLoginResponseToLoginResponse(response, selectedServer),
        ),
      );
  }
}