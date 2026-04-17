import { SupplierStatus } from './supplier.model';
import { SupplyType } from './supply-type.model';

export type SupplierFormMode = 'create' | 'edit' | 'view';

export interface SaveSupplierPayload {
  empresaId: string;
  empresaNombre: string;
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
}
