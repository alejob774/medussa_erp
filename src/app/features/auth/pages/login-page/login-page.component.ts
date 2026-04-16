import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { CompaniesFacadeService } from '../../../companies/application/facade/companies.facade';
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
  private readonly companiesFacade = inject(CompaniesFacadeService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';
  infoMessage = this.readNavigationInfoMessage();

  onLoginSubmit(value: LoginFormValue): void {
    this.loading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    this.authService
      .login({
        username: value.username,
        password: value.password,
      })
      .pipe(
        map((response) =>
          this.companyContextService.enrichSession(response, value.username),
        ),
        switchMap((session) =>
          this.companiesFacade.listContextCompanies().pipe(
            map((companies) =>
              this.companyContextService.hydrateSessionCompanies(session, companies),
            ),
            catchError(() => of(session)),
          ),
        ),
        switchMap((session) => {
          const nextRoute = this.companyContextService.resolvePostLoginRoute(session);

          this.authSessionService.setSession(session, value.remember);

          if (nextRoute === '/select-company' || !session.activeCompanyId) {
            return of(nextRoute);
          }

          return this.authService
            .syncAuthenticatedContext()
            .pipe(map(() => nextRoute));
        }),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (nextRoute) => {
          void this.router.navigate([nextRoute]);
        },
        error: (error) => {
          this.authSessionService.clearSession();
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

    if (httpError?.status === 403) {
      return 'La empresa activa no esta autorizada para esta sesion.';
    }

    if (httpError?.status === 422) {
      return 'El backend rechazo la validacion de la sesion o de la empresa activa.';
    }

    return httpError?.error?.detail || 'No fue posible iniciar sesion.';
  }

  private readNavigationInfoMessage(): string {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const historyState =
      typeof window !== 'undefined' ? (window.history.state as { logoutMessage?: unknown }) : null;
    const logoutMessage =
      navigationState?.['logoutMessage'] ?? historyState?.logoutMessage ?? '';

    return typeof logoutMessage === 'string' ? logoutMessage : '';
  }
}
