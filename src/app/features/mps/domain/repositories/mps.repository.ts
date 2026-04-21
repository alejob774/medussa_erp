import { Observable } from 'rxjs';
import { MpsDashboard, MpsMutationResult } from '../models/mps-response.model';
import { MpsPlanFilters } from '../models/mps-plan-filters.model';

export interface GenerateMpsPlanPayload {
  fechaInicio: string;
  fechaFin: string;
  planta: string | null;
  familia: string | null;
  skuId: string | null;
  considerarFEFO: boolean;
  considerarPedidosUrgentes: boolean;
  usuario: string;
  observaciones: string | null;
}

export interface UpdateMpsDetailPayload {
  cantidadPlanificada: number;
  fechaProduccion: string;
  lineaProduccion: string;
  usuario: string;
  observacion: string | null;
}

export interface SimulateMpsPlanPayload {
  demandaAjustePct: number;
  capacidadAjustePct: number;
  considerarFEFO: boolean;
  usuario: string;
  observacion: string | null;
}

export interface ApproveMpsPlanPayload {
  usuario: string;
  observacion: string | null;
}

export interface MpsRepository {
  getDashboard(companyId: string, filters: MpsPlanFilters): Observable<MpsDashboard>;
  generatePlan(companyId: string, payload: GenerateMpsPlanPayload): Observable<MpsMutationResult>;
  updateDetail(
    companyId: string,
    planId: string,
    detailId: string,
    payload: UpdateMpsDetailPayload,
  ): Observable<MpsMutationResult>;
  simulatePlan(
    companyId: string,
    planId: string,
    payload: SimulateMpsPlanPayload,
  ): Observable<MpsMutationResult>;
  approvePlan(
    companyId: string,
    planId: string,
    payload: ApproveMpsPlanPayload,
  ): Observable<MpsMutationResult>;
}
