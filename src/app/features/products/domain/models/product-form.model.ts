import { ProductStatus } from './product.model';

export type ProductFormMode = 'create' | 'edit' | 'view';

export interface SaveProductPayload {
  empresaId: string;
  empresaNombre: string;
  nombre: string;
  familia: string;
  descripcion: string;
  sku: string;
  referencia?: string | null;
  unidadBase: string;
  manejaLote: boolean;
  manejaVencimiento: boolean;
  vidaUtilDias?: number | null;
  factorConversion?: number | null;
  precioBruto?: number | null;
  precioNeto?: number | null;
  estado: ProductStatus;
}