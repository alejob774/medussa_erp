import { CapacityUnitOption } from './capacity-unit.model';
import { EquipmentLocationOption } from './equipment-location.model';
import { EquipmentTypeOption } from './equipment-type.model';

export type EquipmentStatus = 'ACTIVO' | 'INACTIVO';

export interface Equipment {
  id: string;
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
  empresaId: string;
  empresaNombre?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface EquipmentCatalogs {
  capacityUnits: CapacityUnitOption[];
  equipmentTypes: EquipmentTypeOption[];
  equipmentLocations: EquipmentLocationOption[];
}

export const EMPTY_EQUIPMENT_CATALOGS: EquipmentCatalogs = {
  capacityUnits: [],
  equipmentTypes: [],
  equipmentLocations: [],
};
