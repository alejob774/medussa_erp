import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { QualityControlDashboard, QualityControlMutationResult } from '../../domain/models/quality-control-response.model';
import { QualityInspectionFilters } from '../../domain/models/quality-inspection-filters.model';
import {
  CloseQualityNonConformityPayload,
  QualityControlRepository,
  QualityLotDecisionPayload,
  SaveQualityInspectionPayload,
  SaveQualityNonConformityPayload,
} from '../../domain/repositories/quality-control.repository';
import { QualityControlApiRepository } from '../../infrastructure/repositories/quality-control-api.repository';
import { QualityControlMockRepository } from '../../infrastructure/repositories/quality-control-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class QualityControlFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(QualityControlMockRepository);
  private readonly apiRepository = inject(QualityControlApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: QualityInspectionFilters): Observable<QualityControlDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveInspection(
    payload: SaveQualityInspectionPayload,
    inspectionId?: string,
  ): Observable<QualityControlMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveInspection(companyId, payload, inspectionId),
    );
  }

  takeLotDecision(
    inspectionId: string,
    payload: QualityLotDecisionPayload,
  ): Observable<QualityControlMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.takeLotDecision(companyId, inspectionId, payload),
    );
  }

  saveNonConformity(
    inspectionId: string,
    payload: SaveQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveNonConformity(companyId, inspectionId, payload),
    );
  }

  closeNonConformity(
    nonConformityId: string,
    payload: CloseQualityNonConformityPayload,
  ): Observable<QualityControlMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.closeNonConformity(companyId, nonConformityId, payload),
    );
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

  private get repository(): QualityControlRepository {
    return environment.useQualityControlMock ? this.mockRepository : this.apiRepository;
  }
}
