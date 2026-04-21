export type StorageType =
  | 'Seco'
  | 'Refrigerado'
  | 'Congelado'
  | 'Material empaque'
  | 'Cuarentena';

export type SanitaryRestriction =
  | 'Sin restriccion'
  | 'Solo refrigerado'
  | 'No alimentos abiertos'
  | 'Material quimico separado'
  | 'Producto terminado';

export type StorageLocationStatus = 'ACTIVA' | 'BLOQUEADA' | 'MANTENIMIENTO';

export interface StorageLocation {
  id: string;
  empresaId: string;
  bodegaId: string;
  codigo: string;
  zona: string;
  pasillo: string;
  rack: string;
  nivel: string;
  posicion: string;
  capacidad: number;
  tipoAlmacenamiento: StorageType;
  restriccionSanitaria: SanitaryRestriction;
  estado: StorageLocationStatus;
}
