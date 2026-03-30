import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import {
  LoginFormComponent,
  LoginFormValue,
} from '../../components/login-form/login-form.component';
import { AuthService } from '../../services/auth.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { SessionStartedComponent } from '../session-started/session-started.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    AuthLayoutComponent,
    LoginFormComponent,
    SessionStartedComponent,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private authSessionService = inject(AuthSessionService);

  loading = false;
  errorMessage = '';
  loginSuccess = false;

  onLoginSubmit(value: LoginFormValue): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService
      .login({
        username: value.username,
        password: value.password,
        server: value.server === 'desarrollo' ? 'desarrollo' : 'produccion',
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.authSessionService.setSession(response, value.remember);
          this.loginSuccess = true;
        },
        error: (error) => {
          this.errorMessage = this.resolveLoginErrorMessage(error);
          console.error('Login error:', error);
        },
      });
  }

  private resolveLoginErrorMessage(error: unknown): string {
    const httpError = error as {
      status?: number;
      error?: { detail?: string };
    };

    if (httpError?.status === 0) {
      return 'No fue posible conectarse con el backend. Revisa URL, puerto y CORS.';
    }

    return httpError?.error?.detail || 'No fue posible iniciar sesión.';
  }
}