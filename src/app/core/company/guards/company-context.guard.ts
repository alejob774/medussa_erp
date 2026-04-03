import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyContextService } from '../services/company-context.service';

export const companyContextGuard: CanActivateFn = () => {
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);

  return companyContextService.ensureCompanyContext()
    ? true
    : router.createUrlTree(['/select-company']);
};
