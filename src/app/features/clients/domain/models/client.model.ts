import { CityCatalogItem } from './city-catalog.model';
import { IdentificationTypeOption } from './identification-type.model';

export type ClientStatus = 'ACTIVO' | 'INACTIVO';

export interface Client {
  id: string;
  empresaId: string;
  empresaNombre?: string;
  idCliente: string;
  tipoIdentificacion: string;
  nombre: string;
  nombreComercial?: string | null;
  ciudadId: string;
  ciudadNombre?: string;
  direccion: string;
  telefono?: string | null;
  email?: string | null;
  estado: ClientStatus;
  createdAt?: string;
  updatedAt?: string | null;
  zona?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface ClientCatalogs {
  identificationTypes: IdentificationTypeOption[];
  cities: CityCatalogItem[];
}

export const EMPTY_CLIENT_CATALOGS: ClientCatalogs = {
  identificationTypes: [],
  cities: [],
};