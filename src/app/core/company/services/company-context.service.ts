import { Injectable, inject } from '@angular/core';
import { combineLatest, distinctUntilChanged, map, Observable } from 'rxjs';
import { LoginResponse } from '../../../features/auth/models/login-response.model';
import { AuthService } from '../../../features/auth/services/auth.service';
import { AuthSessionService } from '../../../features/auth/services/auth-session.service';
import { PendingChangesService } from '../../forms/services/pending-changes.service';
import { Company } from '../models/company.model';
import { CompanyMockFacadeService } from './company-mock-facade.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyContextService {
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly companyMockFacade = inject(CompanyMockFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  readonly companies$: Observable<Company[]> = this.authSessionService.session$.pipe(
    map((session) => session?.companies ?? []),
  );

  readonly activeCompanyId$: Observable<string | null> =
    this.authSessionService.session$.pipe(
      map((session) => session?.activeCompanyId ?? null),
      distinctUntilChanged(),
    );

  readonly activeCompany$: Observable<Company | null> = combineLatest([
    this.companies$,
    this.activeCompanyId$,
  ]).pipe(
    map(([companies, activeCompanyId]) => {
      if (!activeCompanyId) {
        return null;
      }

      return companies.find((company) => company.id === activeCompanyId) ?? null;
    }),
    distinctUntilChanged((previous, current) => previous?.id === current?.id),
  );

  enrichSession(session: LoginResponse, username?: string): LoginResponse {
    const mockContext = this.companyMockFacade.getSessionContext(
      username ?? session.user?.username,
    );
    const companies = session.companies?.length
      ? session.companies
      : mockContext.companies;
    const roles = session.user?.roles?.length ? session.user.roles : mockContext.roles;
    const permissions = Array.from(
      new Set([...(session.user?.permissions ?? []), ...mockContext.permissions]),
    );
    const normalizedUsername = username ?? session.user?.username ?? 'usuario';
    const activeCompanyId =
      session.activeCompanyId ??
      (companies.length === 1
        ? companies[0].id
        : mockContext.defaultCompanyId ?? null);

    return {
      ...session,
      user: {
        id: session.user?.id ?? normalizedUsername,
        username: normalizedUsername,
        email: session.user?.email ?? `${normalizedUsername}@medussa.local`,
        roles,
        permissions,
      },
      companies,
      activeCompanyId,
      requiresCompanySelection: companies.length > 1 && !activeCompanyId,
    };
  }

  resolvePostLoginRoute(session: LoginResponse): string {
    if (this.shouldSelectCompany(session)) {
      return '/select-company';
    }

    if (!session.activeCompanyId && session.companies?.length === 1) {
      this.setActiveCompany(session.companies[0].id, { force: true });
    }

    return '/dashboard';
  }

  ensureCompanyContext(): boolean {
    const session = this.authSessionService.getSession();

    if (!session) {
      return false;
    }

    if (session.activeCompanyId) {
      return true;
    }

    const companies = session.companies ?? [];

    if (companies.length === 1) {
      this.setActiveCompany(companies[0].id, { force: true });
      return true;
    }

    return companies.length <= 1;
  }

  shouldSelectCompany(session: LoginResponse | null = this.authSessionService.getSession()): boolean {
    if (!session) {
      return false;
    }

    return (session.companies?.length ?? 0) > 1 && !session.activeCompanyId;
  }

  setActiveCompany(
    companyId: string | null,
    options: { force?: boolean } = {},
  ): boolean {
    const previousCompanyId = this.authSessionService.getActiveCompanyId();

    if (previousCompanyId === companyId) {
      return true;
    }

    if (
      !options.force &&
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar. Si cambias de empresa, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return false;
    }

    this.authSessionService.setActiveCompanyId(companyId);
    this.authService.syncAuthenticatedContext().subscribe({
      error: (error: unknown) => {
        this.authSessionService.setActiveCompanyId(previousCompanyId);
        console.error('No fue posible sincronizar el contexto autenticado.', error);
      },
    });

    return true;
  }

  getAvailableCompanies(): Company[] {
    return this.authSessionService.getSession()?.companies ?? [];
  }

  getActiveCompany(): Company | null {
    const session = this.authSessionService.getSession();

    return (
      session?.companies?.find((company) => company.id === session.activeCompanyId) ?? null
    );
  }

  getUserPermissions(): string[] {
    return this.authSessionService.getSession()?.user?.permissions ?? [];
  }
}
