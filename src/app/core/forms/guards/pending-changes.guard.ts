import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { PendingChangesService } from '../services/pending-changes.service';

export const pendingChangesGuard: CanDeactivateFn<unknown> = () => {
  return inject(PendingChangesService).confirmDiscard();
};
