import { Injectable, inject } from '@angular/core';
import { combineLatest, map, shareReplay } from 'rxjs';
import { AuthSessionService } from '../../../features/auth/services/auth-session.service';
import { hasRequiredPermissions } from '../../permissions/utils/permission.utils';
import { CompanyContextService } from '../../company/services/company-context.service';
import { ERP_NAVIGATION_SECTIONS } from '../mocks/navigation.mock';
import { NavigationItem, NavigationSection } from '../models/navigation-item.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationFacadeService {
  private readonly authSessionService = inject(AuthSessionService);
  private readonly companyContextService = inject(CompanyContextService);

  readonly sections$ = combineLatest([
    this.authSessionService.session$,
    this.companyContextService.activeCompanyId$,
  ]).pipe(
    map(([session, activeCompanyId]) => {
      const permissions = session?.user?.permissions ?? [];

      return ERP_NAVIGATION_SECTIONS.map((section) => ({
        ...section,
        items: this.filterItems(section.items, activeCompanyId, permissions),
      })).filter((section) => section.items.length > 0);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private filterItems(
    items: NavigationItem[],
    activeCompanyId: string | null,
    permissions: string[],
  ): NavigationItem[] {
    return items
      .map((item) => {
        const children = item.children?.length
          ? this.filterItems(item.children, activeCompanyId, permissions)
          : undefined;

        return {
          ...item,
          children,
        };
      })
      .filter((item) => this.isItemVisible(item, activeCompanyId, permissions));
  }

  private isItemVisible(
    item: NavigationItem,
    activeCompanyId: string | null,
    permissions: string[],
  ): boolean {
    const allowedByCompany =
      !item.companyIds?.length ||
      (activeCompanyId ? item.companyIds.includes(activeCompanyId) : false);
    const allowedByPermissions = hasRequiredPermissions(
      permissions,
      item.requiredPermissions,
    );

    if (item.children?.length) {
      return item.children.length > 0 && allowedByCompany;
    }

    return allowedByCompany && allowedByPermissions;
  }
}
