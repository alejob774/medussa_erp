import { Observable } from 'rxjs';
import { TpmFilters } from '../models/tpm-filters.model';
import { TpmDashboard, TpmMutationResult } from '../models/tpm-response.model';
import { TpmEquipmentState } from '../models/tpm-asset.model';
import { TpmMaintenanceType, TpmPlan } from '../models/tpm-plan.model';
import { TpmSparePart } from '../models/tpm-spare-part.model';
import { TpmWorkOrderState } from '../models/tpm-work-order.model';

export interface SaveTpmAssetPayload {
  equipoId: string;
  codigoEquipo: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  ubicacion: string;
  fechaInstalacion: string;
  horasUso: number;
  estadoEquipo: TpmEquipmentState;
  fechaUltimoMantenimiento: string | null;
  fechaProximoMantenimiento: string | null;
  notasTecnicas: string | null;
}

export interface SaveTpmPlanPayload {
  equipoId: string;
  tipo: TpmMaintenanceType;
  frecuenciaDias: number | null;
  frecuenciaHorasUso: number | null;
  activo: boolean;
  tareasProgramadas: string[];
  tecnicoAsignado: string;
  proximoVencimiento: string | null;
}

export interface SaveTpmSparePartPayload {
  codigoRepuesto: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
}

export interface SaveTpmWorkOrderPayload {
  equipoId: string;
  planId: string | null;
  tipo: TpmMaintenanceType;
  fechaProgramada: string;
  fechaInicio: string | null;
  tecnico: string;
  estado: Exclude<TpmWorkOrderState, 'CERRADA'>;
  tiempoReparacion: number;
  costo: number;
  causaRaiz: string | null;
  observaciones: string | null;
  repuestosUsados: SaveTpmSparePartPayload[];
  generaBloqueo: boolean;
  impactoOee: string | null;
  usuario: string;
}

export interface CloseTpmWorkOrderPayload {
  fechaCierre: string;
  tiempoReparacion: number;
  costo: number;
  causaRaiz: string | null;
  observaciones: string | null;
  repuestosUsados: SaveTpmSparePartPayload[];
  estadoEquipoPosterior: TpmEquipmentState;
  usuario: string;
}

export interface TpmRepository {
  getDashboard(companyId: string, filters: TpmFilters): Observable<TpmDashboard>;
  saveAsset(companyId: string, payload: SaveTpmAssetPayload, assetId?: string): Observable<TpmMutationResult>;
  savePlan(companyId: string, payload: SaveTpmPlanPayload, planId?: string): Observable<TpmMutationResult>;
  saveWorkOrder(
    companyId: string,
    payload: SaveTpmWorkOrderPayload,
    workOrderId?: string,
  ): Observable<TpmMutationResult>;
  closeWorkOrder(
    companyId: string,
    workOrderId: string,
    payload: CloseTpmWorkOrderPayload,
  ): Observable<TpmMutationResult>;
}
