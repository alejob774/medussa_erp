import { ZoneCatalogItem } from '../../../../core/catalogs/models/zone-catalog.model';
import { WeekDayOption } from './week-day.model';

export type RouteStatus = 'ACTIVO' | 'INACTIVO';

export interface RouteVendorOption {
  vendorId: string;
  idVendedor: string;
  nombre: string;
  zona: string;
  empresaId: string;
  empresaNombre?: string | null;
  estado: 'ACTIVO';
}

export interface RouteDriverOption {
  driverId: string;
  idConductor: string;
  nombre: string;
  empresaId: string;
  empresaNombre?: string | null;
  estado: 'ACTIVO';
}

export interface RouteAssignableClient {
  clientId: string;
  idCliente: string;
  nombre: string;
  zona: string;
  ciudadNombre?: string | null;
  empresaId: string;
  empresaNombre?: string | null;
  estado: 'ACTIVO';
}

export interface RouteAssignedClient {
  clientId: string;
  idCliente: string;
  nombre: string;
  zona: string;
  ciudadNombre?: string | null;
}

export interface Route {
  id: string;
  idRuta: string;
  nombreRuta: string;
  zona: string;
  vendedorId: string;
  vendedorCodigo: string;
  vendedorNombre: string;
  conductorId: string;
  conductorCodigo: string;
  conductorNombre: string;
  clientesAsignados: RouteAssignedClient[];
  cantidadClientesAsignados: number;
  diasRuta: string[];
  diasDespacho: string[];
  estado: RouteStatus;
  empresaId: string;
  empresaNombre?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  tieneDependenciasActivas: boolean;
}

export interface RouteCatalogs {
  zones: ZoneCatalogItem[];
  weekDays: WeekDayOption[];
  vendors: RouteVendorOption[];
  drivers: RouteDriverOption[];
  clients: RouteAssignableClient[];
}

export const EMPTY_ROUTE_CATALOGS: RouteCatalogs = {
  zones: [],
  weekDays: [],
  vendors: [],
  drivers: [],
  clients: [],
};
