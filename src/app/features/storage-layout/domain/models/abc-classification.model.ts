import { AbcCategory, StorageRotationLevel } from './storage-location-assignment.model';

export interface AbcClassification {
  id: string;
  empresaId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  categoriaABC: AbcCategory;
  rotacion: StorageRotationLevel;
  participacionPct: number;
  sugerenciaUbicacion: string;
}
