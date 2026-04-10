export type ProductStatus = 'ACTIVO' | 'INACTIVO';

export interface Product {
  id: string;
  empresaId: string;
  empresaNombre: string;
  nombre: string;
  descripcion: string;
  sku: string;
  familia: string;
  unidadBase: string;
  referencia?: string | null;
  manejaLote: boolean;
  manejaVencimiento: boolean;
  vidaUtilDias?: number | null;
  factorConversion?: number | null;
  precioBruto?: number | null;
  precioNeto?: number | null;
  estado: ProductStatus;
  tieneMovimientos: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ProductCatalogOption {
  value: string;
  label: string;
}

export interface ProductCatalogs {
  families: ProductCatalogOption[];
  units: ProductCatalogOption[];
}

export const EMPTY_PRODUCT_CATALOGS: ProductCatalogs = {
  families: [],
  units: [],
};