import { ZoneCatalogItem } from '../../../../core/catalogs/models/zone-catalog.model';
import { CityCatalogItem } from '../../../clients/domain/models/city-catalog.model';
import { VendorChannelOption } from './vendor-channel.model';
import { VendorTypeOption } from './vendor-type.model';

export type VendorStatus = 'ACTIVO' | 'INACTIVO';

export interface VendorAssignedClient {
  clientId: string;
  idCliente: string;
  nombre: string;
  zona: string;
  ciudadNombre?: string | null;
}

export interface VendorAssignableClient extends VendorAssignedClient {
  empresaId: string;
  empresaNombre?: string;
  estado: 'ACTIVO';
}

export interface Vendor {
  id: string;
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
  cantidadClientesAsignados: number;
  estado: VendorStatus;
  createdAt?: string;
  updatedAt?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface VendorCatalogs {
  cities: CityCatalogItem[];
  zones: ZoneCatalogItem[];
  vendorTypes: VendorTypeOption[];
  channels: VendorChannelOption[];
}

export const EMPTY_VENDOR_CATALOGS: VendorCatalogs = {
  cities: [],
  zones: [],
  vendorTypes: [],
  channels: [],
};