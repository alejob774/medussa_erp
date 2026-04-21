import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { BomFormulaFilters } from '../../domain/models/bom-formula-filters.model';
import { BomFormulaDashboard, BomFormulaMutationResult } from '../../domain/models/bom-formula-response.model';
import {
  BomFormulaDecisionPayload,
  BomFormulaNewVersionPayload,
  BomFormulaRepository,
  SaveBomFormulaPayload,
} from '../../domain/repositories/bom-formula.repository';
import { BomFormulaApiRepository } from '../../infrastructure/repositories/bom-formula-api.repository';
import { BomFormulaMockRepository } from '../../infrastructure/repositories/bom-formula-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class BomFormulaFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(BomFormulaMockRepository);
  private readonly apiRepository = inject(BomFormulaApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getDashboard(filters: BomFormulaFilters): Observable<BomFormulaDashboard> {
    return this.withActiveCompany((companyId) => this.repository.getDashboard(companyId, filters));
  }

  saveFormula(payload: SaveBomFormulaPayload, formulaId?: string): Observable<BomFormulaMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveFormula(companyId, payload, formulaId));
  }

  approveFormula(formulaId: string, payload: BomFormulaDecisionPayload): Observable<BomFormulaMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.approveFormula(companyId, formulaId, payload));
  }

  rejectFormula(formulaId: string, payload: BomFormulaDecisionPayload): Observable<BomFormulaMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.rejectFormula(companyId, formulaId, payload));
  }

  createNewVersion(
    formulaId: string,
    payload: BomFormulaNewVersionPayload,
  ): Observable<BomFormulaMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.createNewVersion(companyId, formulaId, payload));
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

  private get repository(): BomFormulaRepository {
    return environment.useBomFormulaMock ? this.mockRepository : this.apiRepository;
  }
}
