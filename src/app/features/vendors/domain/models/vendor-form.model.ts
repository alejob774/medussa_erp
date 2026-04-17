import { VendorAssignedClient, VendorStatus } from './vendor.model';

export type VendorFormMode = 'create' | 'edit' | 'view';

export interface SaveVendorPayload {
  empresaId: string;
  empresaNombre: string;
  idVendedor: string;
  nombreVendedor: string;
  tipoVendedor: string;
  zona: string;
  canal: string;
  cuotaMensual?: number | null;
  ciudadId?: string | null;
  ciudadNombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  clientesAsignados: VendorAssignedClient[];
  estado: VendorStatus;
}