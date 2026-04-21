export type TpmMaintenanceType = 'PREVENTIVO' | 'CORRECTIVO' | 'PREDICTIVO' | 'SANITARIO' | 'CALIBRACION';

export interface TpmPlan {
  id: string;
  empresaId: string;
  equipoId: string;
  tipo: TpmMaintenanceType;
  frecuenciaDias: number | null;
  frecuenciaHorasUso: number | null;
  activo: boolean;
  tareasProgramadas: string[];
  tecnicoAsignado: string;
  ultimoGeneradoEn: string | null;
  proximoVencimiento: string | null;
  ultimaHoraGenerada: number | null;
}
