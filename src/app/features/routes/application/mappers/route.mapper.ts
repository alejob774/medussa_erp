import {
  resolveBoolean,
  resolveMasterStatus,
  resolveNullableText,
  resolveText,
} from '../../../../core/http/master-api.utils';
import { SaveRoutePayload } from '../../domain/models/route-form.model';
import { Route, RouteAssignedClient, RouteStatus } from '../../domain/models/route.model';

export interface BackendRouteAssignedClientDto {
  client_id?: string | number | null;
  clientId?: string | number | null;
  id_cliente?: string | null;
  idCliente?: string | null;
  nombre?: string | null;
  zona?: string | null;
  ciudad_nombre?: string | null;
  ciudadNombre?: string | null;
}

export interface BackendRouteDto {
  id?: string | number | null;
  ruta_id?: string | number | null;
  routeId?: string | number | null;
  empresa_id?: string | number | null;
  companyId?: string | number | null;
  empresa_nombre?: string | null;
  companyName?: string | null;
  id_rut?: string | null;
  nombre_rut?: string | null;
  id_ruta?: string | null;
  idRuta?: string | null;
  nombre_ruta?: string | null;
  nombreRuta?: string | null;
  zona?: string | null;
  origen?: string | null;
  destino?: string | null;
  distancia_km?: number | string | null;
  distanciaKm?: number | string | null;
  vendedor_id?: string | number | null;
  vendedorId?: string | number | null;
  vendedor_codigo?: string | null;
  vendedorCodigo?: string | null;
  vendedor_nombre?: string | null;
  vendedorNombre?: string | null;
  conductor_id?: string | number | null;
  conductorId?: string | number | null;
  conductor_codigo?: string | null;
  conductorCodigo?: string | null;
  conductor_nombre?: string | null;
  conductorNombre?: string | null;
  clientes_asignados?: BackendRouteAssignedClientDto[] | null;
  clientesAsignados?: BackendRouteAssignedClientDto[] | null;
  dias_ruta?: string[] | null;
  diasRuta?: string[] | null;
  dias_despacho?: string[] | null;
  diasDespacho?: string[] | null;
  estado?: boolean | number | string | null;
  activo?: boolean | number | string | null;
  isActive?: boolean | number | string | null;
  dependencias_activas?: boolean | number | string | null;
  tieneDependenciasActivas?: boolean | number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

export interface BackendSaveRoutePayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  id_rut: string;
  id_ruta: string;
  nombre_rut: string;
  nombre_ruta: string;
  origen?: string | null;
  destino?: string | null;
  distancia_km?: number | null;
  zona: string;
  vendedor_id: string;
  vendedor_nombre?: string | null;
  conductor_id: string;
  conductor_nombre?: string | null;
  clientes_asignados: Array<{ client_id: string }>;
  dias_ruta: string[];
  dias_despacho: string[];
  estado: boolean;
}

export function mapBackendRouteToRoute(
  dto: BackendRouteDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Route {
  const nombreRuta = resolveText(dto.nombre_rut, dto.nombre_ruta, dto.nombreRuta, 'Ruta sin nombre');
  const clientesAsignados = (dto.clientes_asignados ?? dto.clientesAsignados ?? []).map(
    (client) => mapAssignedClient(client),
  );

  return {
    id: resolveText(dto.id, dto.ruta_id, dto.routeId, dto.id_rut, dto.id_ruta, dto.idRuta, nombreRuta),
    idRuta: resolveText(dto.id_rut, dto.id_ruta, dto.idRuta, ''),
    nombreRuta,
    zona: resolveText(dto.zona, dto.origen, dto.destino, ''),
    vendedorId: resolveText(dto.vendedor_id, dto.vendedorId, ''),
    vendedorCodigo: resolveText(dto.vendedor_codigo, dto.vendedorCodigo, ''),
    vendedorNombre: resolveText(dto.vendedor_nombre, dto.vendedorNombre, ''),
    conductorId: resolveText(dto.conductor_id, dto.conductorId, ''),
    conductorCodigo: resolveText(dto.conductor_codigo, dto.conductorCodigo, ''),
    conductorNombre: resolveText(dto.conductor_nombre, dto.conductorNombre, ''),
    clientesAsignados,
    cantidadClientesAsignados: clientesAsignados.length,
    diasRuta: normalizeStringList(dto.dias_ruta ?? dto.diasRuta),
    diasDespacho: normalizeStringList(dto.dias_despacho ?? dto.diasDespacho),
    estado: resolveMasterStatus(dto.estado, dto.activo, dto.isActive) as RouteStatus,
    empresaId: resolveText(dto.empresa_id, dto.companyId, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.companyName, companyNameFallback),
    createdAt: resolveNullableText(dto.created_at, dto.createdAt) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.updatedAt),
    tieneDependenciasActivas: resolveBoolean(
      dto.dependencias_activas ?? dto.tieneDependenciasActivas,
    ),
  };
}

export function mapRoutePayloadToBackend(
  payload: SaveRoutePayload,
  requestCompanyId: string,
): BackendSaveRoutePayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    id_rut: payload.idRuta.trim().toUpperCase(),
    id_ruta: payload.idRuta.trim().toUpperCase(),
    nombre_rut: payload.nombreRuta.trim(),
    nombre_ruta: payload.nombreRuta.trim(),
    origen: payload.zona.trim() || null,
    destino: payload.zona.trim() || null,
    distancia_km: null,
    zona: payload.zona.trim(),
    vendedor_id: payload.vendedorId.trim(),
    vendedor_nombre: payload.vendedorNombre?.trim() || null,
    conductor_id: payload.conductorId.trim(),
    conductor_nombre: payload.conductorNombre?.trim() || null,
    clientes_asignados: payload.clientesAsignados.map((client) => ({
      client_id: client.clientId,
    })),
    dias_ruta: payload.diasRuta.map((day) => day.trim()).filter(Boolean),
    dias_despacho: payload.diasDespacho.map((day) => day.trim()).filter(Boolean),
    estado: payload.estado === 'ACTIVO',
  };
}

function mapAssignedClient(dto: BackendRouteAssignedClientDto): RouteAssignedClient {
  return {
    clientId: resolveText(dto.client_id, dto.clientId, ''),
    idCliente: resolveText(dto.id_cliente, dto.idCliente, ''),
    nombre: resolveText(dto.nombre, 'Cliente asignado'),
    zona: resolveText(dto.zona, ''),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre, dto.ciudadNombre),
  };
}

function normalizeStringList(values: string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}
