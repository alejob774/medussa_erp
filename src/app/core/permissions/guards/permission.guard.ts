import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyContextService } from '../../company/services/company-context.service';
import { PermissionKey } from '../models/permission.model';
import { hasRequiredPermissions } from '../utils/permission.utils';

export const permissionGuard: CanActivateFn = (route) => {
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);
  const userPermissions = companyContextService.getUserPermissions();
  const requiredPermission = route.data?.['permission'] as
    | PermissionKey
    | PermissionKey[]
    | undefined;

  if (hasRequiredPermissions(userPermissions, requiredPermission)) {
    return true;
  }

  const fallbackRoute = hasRequiredPermissions(userPermissions, 'dashboard.view')
    ? ['/dashboard']
    : ['/login'];

  return router.createUrlTree(fallbackRoute);
};
