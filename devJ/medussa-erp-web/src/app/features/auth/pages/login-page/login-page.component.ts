// src/app/features/auth/pages/login-page/login-page.component.ts
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
        server: value.server,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.authSessionService.setSession(response);
          this.loginSuccess = true;
          console.log('Login response:', response);
        },
        error: (error) => {
          console.error('Login error:', error);
          this.errorMessage =
            error?.error?.detail || 'No fue posible iniciar sesión.';
        },
      });
  }
}