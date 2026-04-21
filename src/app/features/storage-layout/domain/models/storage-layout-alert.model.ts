export type StorageLayoutAlertType =
  | 'ZONA_SATURADA'
  | 'ZONA_OCIOSA'
  | 'RESTRICCION_INCOMPATIBLE'
  | 'UBICACION_BLOQUEADA';

export type StorageLayoutAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface StorageLayoutAlert {
  id: string;
  empresaId: string;
  ubicacionId: string;
  tipoAlerta: StorageLayoutAlertType;
  severidad: StorageLayoutAlertSeverity;
  descripcion: string;
}
