import { RouteAssignedClient, RouteStatus } from './route.model';

export type RouteFormMode = 'create' | 'edit' | 'view';

export interface SaveRoutePayload {
  empresaId: string;
  empresaNombre: string;
  idRuta: string;
  nombreRuta: string;
  zona: string;
  vendedorId: string;
  vendedorNombre?: string;
  conductorId: string;
  conductorNombre?: string;
  clientesAsignados: RouteAssignedClient[];
  diasRuta: string[];
  diasDespacho: string[];
  estado: RouteStatus;
}
