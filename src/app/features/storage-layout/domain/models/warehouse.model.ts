export type WarehouseType = 'PRINCIPAL' | 'EMPAQUE' | 'FRIO' | 'SATELITE';
export type WarehouseStatus = 'ACTIVA' | 'INACTIVA';

export interface Warehouse {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  tipo: WarehouseType;
  estado: WarehouseStatus;
}
