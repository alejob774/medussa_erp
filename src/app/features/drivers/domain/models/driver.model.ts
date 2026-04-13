import { ZoneCatalogItem } from '../../../../core/catalogs/models/zone-catalog.model';
import { CityCatalogItem } from '../../../clients/domain/models/city-catalog.model';
import { DocumentTypeOption } from './document-type.model';
import { LicenseCategoryOption } from './license-category.model';
import { RouteCatalogItem } from './route-catalog.model';

export type DriverStatus = 'ACTIVO' | 'INACTIVO';

export interface DriverAssignedRoute {
  routeId: string;
  idRuta: string;
  nombreRuta: string;
  zona: string;
  estado: 'ACTIVO';
}

export interface DriverAssignableRoute extends DriverAssignedRoute {
  empresaId: string;
  empresaNombre?: string;
  assignedDriverId?: string | null;
  assignedDriverCode?: string | null;
  assignedDriverName?: string | null;
}

export interface Driver {
  id: string;
  empresaId: string;
  empresaNombre: string;
  idConductor: string;
  nombreConductor: string;
  tipoDocumento: string;
  numeroDocumento?: string | null;
  ciudadId?: string | null;
  ciudadNombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  numeroLicencia?: string | null;
  categoriaLicencia?: string | null;
  vencimientoLicencia?: string | null;
  rutasAsignadas: DriverAssignedRoute[];
  cantidadRutasAsignadas: number;
  estado: DriverStatus;
  createdAt?: string;
  updatedAt?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface DriverCatalogs {
  cities: CityCatalogItem[];
  zones: ZoneCatalogItem[];
  documentTypes: DocumentTypeOption[];
  licenseCategories: LicenseCategoryOption[];
  routes: RouteCatalogItem[];
}

export const EMPTY_DRIVER_CATALOGS: DriverCatalogs = {
  cities: [],
  zones: [],
  documentTypes: [],
  licenseCategories: [],
  routes: [],
};