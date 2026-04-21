import { Observable } from 'rxjs';
import { OeeFilters } from '../models/oee-filters.model';
import { OeeDashboard, OeeMutationResult } from '../models/oee-response.model';
import { OeeShiftCode } from '../models/oee-shift.model';

export interface SaveOeeRecordPayload {
  planta: string;
  lineaProduccion: string;
  maquinaId: string;
  turno: OeeShiftCode;
  fechaOperacion: string;
  horaInicio: string;
  horaFin: string;
  tiempoProgramado: number;
  tiempoParado: number;
  causaParo: string | null;
  unidadesProducidas: number;
  unidadesObjetivo: number;
  unidadesRechazadas: number;
  operario: string;
  supervisor: string;
  ordenProduccion: string | null;
  usuarioCrea: string;
}

export interface RegisterOeeDowntimePayload {
  tiempoParadoAdicional: number;
  causaParo: string;
  usuario: string;
  observacion: string | null;
}

export interface OeeRepository {
  getDashboard(companyId: string, filters: OeeFilters): Observable<OeeDashboard>;
  saveRecord(companyId: string, payload: SaveOeeRecordPayload, recordId?: string): Observable<OeeMutationResult>;
  registerDowntime(
    companyId: string,
    recordId: string,
    payload: RegisterOeeDowntimePayload,
  ): Observable<OeeMutationResult>;
}
