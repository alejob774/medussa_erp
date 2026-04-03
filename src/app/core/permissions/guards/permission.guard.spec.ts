import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { CompanyContextService } from '../../company/services/company-context.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  let router: Router;
  let getUserPermissions: jasmine.Spy;

  const runGuard = (permission?: string | string[]) =>
    TestBed.runInInjectionContext(() =>
      permissionGuard({ data: { permission } } as never, {} as never),
    );

  beforeEach(() => {
    getUserPermissions = jasmine.createSpy('getUserPermissions').and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompanyContextService,
          useValue: {
            getUserPermissions,
          },
        },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when the user has the required permission', () => {
    getUserPermissions.and.returnValue(['dashboard.view']);

    expect(runGuard('dashboard.view')).toBeTrue();
  });

  it('redirects to login when the user lacks dashboard access', () => {
    const result = runGuard('dashboard.view');

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('redirects to dashboard when the user has dashboard access but lacks another permission', () => {
    getUserPermissions.and.returnValue(['dashboard.view']);

    const result = runGuard('sales.view');

    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
