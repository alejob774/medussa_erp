import {
  resolveBoolean,
  resolveMasterStatus,
  resolveNullableNumber,
  resolveNullableText,
  resolveText,
} from '../../../../core/http/master-api.utils';
import { SaveSupplierPayload } from '../../domain/models/supplier-form.model';
import { Supplier, SupplierStatus } from '../../domain/models/supplier.model';
import { SupplyType } from '../../domain/models/supply-type.model';

export interface BackendSupplierDto {
  id?: string | number | null;
  proveedor_id?: string | number | null;
  supplierId?: string | number | null;
  empresa_id?: string | number | null;
  companyId?: string | number | null;
  empresa_nombre?: string | null;
  companyName?: string | null;
  nit?: string | null;
  nombre_proveedor?: string | null;
  nombreProveedor?: string | null;
  ciudad_id?: string | number | null;
  ciudadId?: string | number | null;
  ciudad_nombre?: string | null;
  ciudadNombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  tipo_abastecimiento?: string | null;
  tipoAbastecimiento?: string | null;
  producto_principal?: string | null;
  productoPrincipal?: string | null;
  lead_time_dias?: number | string | null;
  leadTimeDias?: number | string | null;
  moq?: number | string | null;
  condicion_pago?: string | null;
  condicionPago?: string | null;
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

export interface BackendSaveSupplierPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  nit: string;
  nombre_proveedor: string;
  ciudad_id: string | null;
  ciudad_nombre: string | null;
  direccion: string;
  telefono: string;
  email: string | null;
  tipo_abastecimiento: SupplyType;
  producto_principal: string;
  lead_time_dias: number | null;
  moq: number | null;
  condicion_pago: string | null;
  estado: boolean;
}

export function mapBackendSupplierToSupplier(
  dto: BackendSupplierDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Supplier {
  const nombreProveedor = resolveText(
    dto.nombre_proveedor,
    dto.nombreProveedor,
    'Proveedor sin nombre',
  );

  return {
    id: resolveText(dto.id, dto.proveedor_id, dto.supplierId, dto.nit, nombreProveedor),
    nit: resolveText(dto.nit, ''),
    nombreProveedor,
    ciudadId: resolveNullableText(dto.ciudad_id, dto.ciudadId),
    ciudadNombre: resolveNullableText(dto.ciudad_nombre, dto.ciudadNombre),
    direccion: resolveText(dto.direccion, ''),
    telefono: resolveText(dto.telefono, ''),
    email: resolveNullableText(dto.email),
    tipoAbastecimiento: resolveSupplyType(dto.tipo_abastecimiento, dto.tipoAbastecimiento),
    productoPrincipal: resolveText(dto.producto_principal, dto.productoPrincipal, ''),
    leadTimeDias: resolveNullableNumber(dto.lead_time_dias ?? dto.leadTimeDias),
    moq: resolveNullableNumber(dto.moq),
    condicionPago: resolveNullableText(dto.condicion_pago, dto.condicionPago),
    estado: resolveMasterStatus(dto.estado, dto.activo, dto.isActive) as SupplierStatus,
    empresaId: resolveText(dto.empresa_id, dto.companyId, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.companyName, companyNameFallback),
    createdAt: resolveNullableText(dto.created_at, dto.createdAt) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.updatedAt),
    tieneDependenciasActivas: resolveBoolean(
      dto.dependencias_activas ?? dto.tieneDependenciasActivas,
    ),
  };
}

export function mapSupplierPayloadToBackend(
  payload: SaveSupplierPayload,
  requestCompanyId: string,
): BackendSaveSupplierPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    nit: payload.nit.trim().toUpperCase(),
    nombre_proveedor: payload.nombreProveedor.trim(),
    ciudad_id: payload.ciudadId?.trim() || null,
    ciudad_nombre: payload.ciudadNombre?.trim() || null,
    direccion: payload.direccion.trim(),
    telefono: payload.telefono.trim(),
    email: payload.email?.trim().toLowerCase() || null,
    tipo_abastecimiento: payload.tipoAbastecimiento,
    producto_principal: payload.productoPrincipal.trim(),
    lead_time_dias: payload.leadTimeDias ?? null,
    moq: payload.moq ?? null,
    condicion_pago: payload.condicionPago?.trim() || null,
    estado: payload.estado === 'ACTIVO',
  };
}

function resolveSupplyType(
  ...values: Array<string | null | undefined>
): SupplyType {
  const normalizedValue = values
    .map((value) => value?.trim().toUpperCase())
    .find((value): value is SupplyType => value === 'MIR' || value === 'LOGISTICA');

  return normalizedValue ?? 'MIR';
}
