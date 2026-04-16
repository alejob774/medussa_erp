import { CityCatalogItem } from '../../../clients/domain/models/city-catalog.model';
import { PaymentTermOption } from './payment-term.model';
import { SupplyType, SupplyTypeOption } from './supply-type.model';

export type SupplierStatus = 'ACTIVO' | 'INACTIVO';

export interface SupplierProductOption {
  value: string;
  label: string;
}

export interface Supplier {
  id: string;
  nit: string;
  nombreProveedor: string;
  ciudadId?: string | null;
  ciudadNombre?: string | null;
  direccion: string;
  telefono: string;
  email?: string | null;
  tipoAbastecimiento: SupplyType;
  productoPrincipal: string;
  leadTimeDias?: number | null;
  moq?: number | null;
  condicionPago?: string | null;
  estado: SupplierStatus;
  empresaId: string;
  empresaNombre?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface SupplierCatalogs {
  cities: CityCatalogItem[];
  supplyTypes: SupplyTypeOption[];
  paymentTerms: PaymentTermOption[];
  productOptions: SupplierProductOption[];
}

export const EMPTY_SUPPLIER_CATALOGS: SupplierCatalogs = {
  cities: [],
  supplyTypes: [],
  paymentTerms: [],
  productOptions: [],
};
