export type StorageAssignmentPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type StorageRotationLevel = 'ALTA' | 'MEDIA' | 'BAJA';
export type AbcCategory = 'A' | 'B' | 'C';

export interface StorageLocationAssignment {
  id: string;
  empresaId: string;
  ubicacionId: string;
  skuId: string;
  sku: string;
  productoNombre: string;
  prioridad: StorageAssignmentPriority;
  categoriaABC: AbcCategory;
  rotacion: StorageRotationLevel;
  fechaAsignacion: string;
}
