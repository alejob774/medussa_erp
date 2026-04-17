export type RouteCatalogStatus = 'ACTIVO' | 'INACTIVO';

export interface RouteCatalogItem {
  routeId: string;
  idRuta: string;
  nombreRuta: string;
  zona: string;
  estado: RouteCatalogStatus;
  empresaId: string;
  empresaNombre?: string | null;
}