import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { OeeFilters } from '../../domain/models/oee-filters.model';
import { OeeDashboard, OeeMutationResult } from '../../domain/models/oee-response.model';
import {
  OeeRepository,
  RegisterOeeDowntimePayload,
  SaveOeeRecordPayload,
} from '../../domain/repositories/oee.repository';
import { OeeApiRepository } from '../../infrastructure/repositories/oee-api.repository';
import { OeeMockRepository } from '../../infrastructure/repositories/oee-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class OeeFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(OeeMockRepository);
  private readonly apiRepository = inject(OeeApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: OeeFilters): Observable<OeeDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveRecord(payload: SaveOeeRecordPayload, recordId?: string): Observable<OeeMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveRecord(companyId, payload, recordId));
  }

  registerDowntime(recordId: string, payload: RegisterOeeDowntimePayload): Observable<OeeMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.registerDowntime(companyId, recordId, payload));
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.companyContextService.getActiveCompany()?.id ?? null;

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): OeeRepository {
    return environment.useOeeMock ? this.mockRepository : this.apiRepository;
  }
}
