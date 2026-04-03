import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import {
  LoginFormComponent,
  LoginFormValue,
} from '../../components/login-form/login-form.component';
import { AuthService } from '../../services/auth.service';
import { AuthSessionService } from '../../services/auth-session.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, AuthLayoutComponent, LoginFormComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly companyContextService = inject(CompanyContextService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';

  onLoginSubmit(value: LoginFormValue): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService
      .login({
        username: value.username,
        password: value.password,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const session = this.companyContextService.enrichSession(
            response,
            value.username,
          );
          const nextRoute = this.companyContextService.resolvePostLoginRoute(session);

          this.authSessionService.setSession(session, value.remember);
          void this.router.navigate([nextRoute]);
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