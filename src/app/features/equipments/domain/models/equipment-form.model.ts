import { EquipmentStatus } from './equipment.model';

export type EquipmentFormMode = 'create' | 'edit' | 'view';

export interface SaveEquipmentPayload {
  empresaId: string;
  empresaNombre: string;
  idEquipo: string;
  nombreEquipo: string;
  capacidad: number;
  unidadCapacidad: string;
  diametro?: number | null;
  altura?: number | null;
  empresaFabricante: string;
  direccionFabricante?: string | null;
  correoFabricante?: string | null;
  tipoEquipo?: string | null;
  ubicacionOperativa?: string | null;
  estado: EquipmentStatus;
}
