import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { BomFormulaFilters } from '../../domain/models/bom-formula-filters.model';
import { BomFormulaDashboard, BomFormulaMutationResult } from '../../domain/models/bom-formula-response.model';
import {
  BomFormulaDecisionPayload,
  BomFormulaNewVersionPayload,
  BomFormulaRepository,
  SaveBomFormulaPayload,
} from '../../domain/repositories/bom-formula.repository';

@Injectable({
  providedIn: 'root',
})
export class BomFormulaApiRepository implements BomFormulaRepository {
  getDashboard(_companyId: string, _filters: BomFormulaFilters): Observable<BomFormulaDashboard> {
    return throwError(() => new Error('BOM / Formulas API no disponible en runtime frontend-only.'));
  }

  saveFormula(
    _companyId: string,
    _payload: SaveBomFormulaPayload,
    _formulaId?: string,
  ): Observable<BomFormulaMutationResult> {
    return throwError(() => new Error('BOM / Formulas API no disponible en runtime frontend-only.'));
  }

  approveFormula(
    _companyId: string,
    _formulaId: string,
    _payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult> {
    return throwError(() => new Error('BOM / Formulas API no disponible en runtime frontend-only.'));
  }

  rejectFormula(
    _companyId: string,
    _formulaId: string,
    _payload: BomFormulaDecisionPayload,
  ): Observable<BomFormulaMutationResult> {
    return throwError(() => new Error('BOM / Formulas API no disponible en runtime frontend-only.'));
  }

  createNewVersion(
    _companyId: string,
    _formulaId: string,
    _payload: BomFormulaNewVersionPayload,
  ): Observable<BomFormulaMutationResult> {
    return throwError(() => new Error('BOM / Formulas API no disponible en runtime frontend-only.'));
  }
}
