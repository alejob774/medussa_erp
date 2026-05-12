import {
  resolveBoolean,
  resolveMasterStatus,
  resolveNullableNumber,
  resolveNullableText,
  resolveText,
} from '../../../../core/http/master-api.utils';
import { SaveEquipmentPayload } from '../../domain/models/equipment-form.model';
import { Equipment, EquipmentStatus } from '../../domain/models/equipment.model';

export interface BackendEquipmentDto {
  id?: string | number | null;
  equipo_id?: string | number | null;
  equipmentId?: string | number | null;
  empresa_id?: string | number | null;
  companyId?: string | number | null;
  empresa_nombre?: string | null;
  companyName?: string | null;
  id_equipo?: string | null;
  idEquipo?: string | null;
  nombre_equipo?: string | null;
  nombreEquipo?: string | null;
  capacidad?: number | string | null;
  unidad_capacidad?: string | null;
  unidadCapacidad?: string | null;
  diametro?: number | string | null;
  altura?: number | string | null;
  empresa_fabricante?: string | null;
  empresaFabricante?: string | null;
  direccion_fabricante?: string | null;
  direccionFabricante?: string | null;
  correo_fabricante?: string | null;
  correoFabricante?: string | null;
  tipo_equipo?: string | null;
  tipoEquipo?: string | null;
  ubicacion_operativa?: string | null;
  ubicacionOperativa?: string | null;
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

export interface BackendSaveEquipmentPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  id_equipo: string;
  nombre_equipo: string;
  capacidad: number;
  unidad_capacidad: string;
  diametro: number | null;
  altura: number | null;
  empresa_fabricante: string;
  direccion_fabricante: string | null;
  correo_fabricante: string | null;
  tipo_equipo: string | null;
  ubicacion_operativa: string | null;
  estado: boolean;
}

export function mapBackendEquipmentToEquipment(
  dto: BackendEquipmentDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Equipment {
  const nombreEquipo = resolveText(dto.nombre_equipo, dto.nombreEquipo, 'Equipo sin nombre');

  return {
    id: resolveText(dto.id, dto.equipo_id, dto.equipmentId, dto.id_equipo, dto.idEquipo, nombreEquipo),
    idEquipo: resolveText(dto.id_equipo, dto.idEquipo, ''),
    nombreEquipo,
    capacidad: resolveNullableNumber(dto.capacidad) ?? 0,
    unidadCapacidad: resolveText(dto.unidad_capacidad, dto.unidadCapacidad, ''),
    diametro: resolveNullableNumber(dto.diametro),
    altura: resolveNullableNumber(dto.altura),
    empresaFabricante: resolveText(dto.empresa_fabricante, dto.empresaFabricante, ''),
    direccionFabricante: resolveNullableText(dto.direccion_fabricante, dto.direccionFabricante),
    correoFabricante: resolveNullableText(dto.correo_fabricante, dto.correoFabricante),
    tipoEquipo: resolveNullableText(dto.tipo_equipo, dto.tipoEquipo),
    ubicacionOperativa: resolveNullableText(dto.ubicacion_operativa, dto.ubicacionOperativa),
    estado: resolveMasterStatus(dto.estado, dto.activo, dto.isActive) as EquipmentStatus,
    empresaId: resolveText(dto.empresa_id, dto.companyId, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.companyName, companyNameFallback),
    createdAt: resolveNullableText(dto.created_at, dto.createdAt) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.updatedAt),
    tieneDependenciasActivas: resolveBoolean(
      dto.dependencias_activas ?? dto.tieneDependenciasActivas,
    ),
  };
}

export function mapEquipmentPayloadToBackend(
  payload: SaveEquipmentPayload,
  requestCompanyId: string,
): BackendSaveEquipmentPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    id_equipo: payload.idEquipo.trim().toUpperCase(),
    nombre_equipo: payload.nombreEquipo.trim(),
    capacidad: Number(payload.capacidad),
    unidad_capacidad: payload.unidadCapacidad.trim(),
    diametro: payload.diametro ?? null,
    altura: payload.altura ?? null,
    empresa_fabricante: payload.empresaFabricante.trim(),
    direccion_fabricante: payload.direccionFabricante?.trim() || null,
    correo_fabricante: payload.correoFabricante?.trim().toLowerCase() || null,
    tipo_equipo: payload.tipoEquipo?.trim() || null,
    ubicacion_operativa: payload.ubicacionOperativa?.trim() || null,
    estado: payload.estado === 'ACTIVO',
  };
}
