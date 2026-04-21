export type TpmEquipmentState = 'OPERATIVO' | 'DETENIDO' | 'EN_MANTENIMIENTO' | 'BLOQUEADO';

export interface TpmAsset {
  id: string;
  empresaId: string;
  empresaNombre: string;
  equipoId: string;
  codigoEquipo: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  ubicacion: string;
  fechaInstalacion: string;
  horasUso: number;
  horasUsoBase: number;
  estadoEquipo: TpmEquipmentState;
  fechaUltimoMantenimiento: string | null;
  fechaProximoMantenimiento: string | null;
  notasTecnicas: string | null;
}
