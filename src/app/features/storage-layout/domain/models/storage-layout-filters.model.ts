import { AbcCategory } from './storage-location-assignment.model';
import {
  SanitaryRestriction,
  StorageType,
} from './storage-location.model';

export type StorageOccupancyFilter =
  | 'TODAS'
  | 'SATURADA'
  | 'RIESGO'
  | 'CONTROLADA'
  | 'OCIOSA';

export interface StorageLayoutFilters {
  bodegaId: string | null;
  zona: string | null;
  tipoAlmacenamiento: StorageType | null;
  restriccionSanitaria: SanitaryRestriction | null;
  ocupacion: StorageOccupancyFilter;
  sku: string | null;
  categoriaABC: AbcCategory | 'TODAS';
}

export const DEFAULT_STORAGE_LAYOUT_FILTERS: StorageLayoutFilters = {
  bodegaId: null,
  zona: null,
  tipoAlmacenamiento: null,
  restriccionSanitaria: null,
  ocupacion: 'TODAS',
  sku: null,
  categoriaABC: 'TODAS',
};
