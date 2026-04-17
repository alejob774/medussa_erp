import { SaveProductPayload } from '../../domain/models/product-form.model';
import { Product, ProductCatalogOption, ProductStatus } from '../../domain/models/product.model';

export interface BackendProductDto {
  id?: number | string | null;
  producto_id?: number | string | null;
  empresa_id?: number | string | null;
  company_id?: number | string | null;
  empresa_nombre?: string | null;
  company_name?: string | null;
  nombre?: string | null;
  name?: string | null;
  descripcion?: string | null;
  description?: string | null;
  sku?: string | null;
  codigo_sku?: string | null;
  familia?: string | null;
  family?: string | null;
  unidad_base?: string | null;
  base_unit?: string | null;
  referencia?: string | null;
  reference?: string | null;
  maneja_lote?: boolean | string | number | null;
  uses_lot?: boolean | string | number | null;
  lote?: boolean | string | number | null;
  maneja_vencimiento?: boolean | string | number | null;
  uses_expiration?: boolean | string | number | null;
  expiration_control?: boolean | string | number | null;
  vida_util_dias?: number | string | null;
  shelf_life_days?: number | string | null;
  factor_conversion?: number | string | null;
  conversion_factor?: number | string | null;
  precio_bruto?: number | string | null;
  gross_price?: number | string | null;
  precio_neto?: number | string | null;
  net_price?: number | string | null;
  estado?: boolean | string | null;
  activo?: boolean | null;
  movimientos_asociados?: boolean | string | number | null;
  has_movements?: boolean | string | number | null;
  created_at?: string | null;
  fecha_creacion?: string | null;
  updated_at?: string | null;
  fecha_actualizacion?: string | null;
}

export interface BackendProductCatalogsDto {
  familias?: Array<{ value?: string | null; label?: string | null } | string>;
  families?: Array<{ value?: string | null; label?: string | null } | string>;
  unidades?: Array<{ value?: string | null; label?: string | null } | string>;
  units?: Array<{ value?: string | null; label?: string | null } | string>;
  unidades_base?: Array<{ value?: string | null; label?: string | null } | string>;
}

export interface BackendSaveProductPayload {
  empresa_id: string;
  empresa_nombre?: string | null;
  nombre: string;
  descripcion: string;
  sku: string;
  familia: string;
  unidad_base: string;
  referencia: string | null;
  maneja_lote: boolean;
  maneja_vencimiento: boolean;
  vida_util_dias: number | null;
  factor_conversion: number | null;
  precio_bruto: number | null;
  precio_neto: number | null;
  estado: boolean;
}

export function mapBackendProductToProduct(
  dto: BackendProductDto,
  companyIdFallback: string,
  companyNameFallback: string,
): Product {
  const nombre = resolveText(dto.nombre, dto.name, 'Producto sin nombre');

  return {
    id: resolveId(dto.id, dto.producto_id, dto.sku, nombre),
    empresaId: resolveText(dto.empresa_id, dto.company_id, companyIdFallback),
    empresaNombre: resolveText(dto.empresa_nombre, dto.company_name, companyNameFallback),
    nombre,
    descripcion: resolveText(dto.descripcion, dto.description, ''),
    sku: resolveText(dto.sku, dto.codigo_sku, ''),
    familia: resolveText(dto.familia, dto.family, 'Sin familia'),
    unidadBase: resolveText(dto.unidad_base, dto.base_unit, 'UND'),
    referencia: resolveNullableText(dto.referencia, dto.reference),
    manejaLote: resolveBoolean(dto.maneja_lote, dto.uses_lot, dto.lote),
    manejaVencimiento: resolveBoolean(
      dto.maneja_vencimiento,
      dto.uses_expiration,
      dto.expiration_control,
    ),
    vidaUtilDias: resolveNullableNumber(dto.vida_util_dias, dto.shelf_life_days),
    factorConversion: resolveNullableNumber(dto.factor_conversion, dto.conversion_factor),
    precioBruto: resolveNullableNumber(dto.precio_bruto, dto.gross_price),
    precioNeto: resolveNullableNumber(dto.precio_neto, dto.net_price),
    estado: resolveStatus(dto.estado, dto.activo),
    tieneMovimientos: resolveBoolean(dto.movimientos_asociados, dto.has_movements),
    createdAt: resolveNullableText(dto.created_at, dto.fecha_creacion) ?? new Date().toISOString(),
    updatedAt: resolveNullableText(dto.updated_at, dto.fecha_actualizacion),
  };
}

export function mapProductPayloadToBackend(
  payload: SaveProductPayload,
  requestCompanyId: string,
): BackendSaveProductPayload {
  return {
    empresa_id: requestCompanyId,
    empresa_nombre: payload.empresaNombre.trim() || null,
    nombre: payload.nombre.trim(),
    descripcion: payload.descripcion.trim(),
    sku: payload.sku.trim().toUpperCase(),
    familia: payload.familia.trim(),
    unidad_base: payload.unidadBase.trim(),
    referencia: payload.referencia?.trim() || null,
    maneja_lote: payload.manejaLote,
    maneja_vencimiento: payload.manejaVencimiento,
    vida_util_dias: payload.manejaVencimiento ? payload.vidaUtilDias ?? null : null,
    factor_conversion: payload.factorConversion ?? null,
    precio_bruto: payload.precioBruto ?? null,
    precio_neto: payload.precioNeto ?? null,
    estado: payload.estado === 'ACTIVO',
  };
}

export function normalizeCatalogOptions(
  options: Array<{ value?: string | null; label?: string | null } | string>,
): ProductCatalogOption[] {
  return options
    .map((option) => {
      if (typeof option === 'string') {
        const value = option.trim();
        return value ? { value, label: value } : null;
      }

      const value = option.value?.trim() ?? option.label?.trim() ?? '';
      const label = option.label?.trim() ?? option.value?.trim() ?? value;

      return value ? { value, label } : null;
    })
    .filter((option): option is ProductCatalogOption => option !== null);
}

export function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      items?: unknown[];
      results?: unknown[];
      data?: unknown[];
    };

    if (Array.isArray(candidate.items)) {
      return candidate.items as T[];
    }

    if (Array.isArray(candidate.results)) {
      return candidate.results as T[];
    }

    if (Array.isArray(candidate.data)) {
      return candidate.data as T[];
    }
  }

  return [];
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveStatus(...values: Array<boolean | string | null | undefined>): ProductStatus {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 'ACTIVO' : 'INACTIVO';
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (['activo', 'active', '1', 'true'].includes(normalizedValue)) {
        return 'ACTIVO';
      }

      if (['inactivo', 'inactive', '0', 'false'].includes(normalizedValue)) {
        return 'INACTIVO';
      }
    }
  }

  return 'ACTIVO';
}

function resolveBoolean(...values: Array<boolean | string | number | null | undefined>): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (['si', 'sí', 'yes', 'true', '1', 'activo', 'active'].includes(normalizedValue)) {
        return true;
      }

      if (['no', 'false', '0', 'inactivo', 'inactive'].includes(normalizedValue)) {
        return false;
      }
    }
  }

  return false;
}

function resolveNullableNumber(...values: Array<number | string | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function resolveId(...values: Array<number | string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return `product-${Date.now()}`;
}

function resolveNullableText(...values: Array<number | string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function resolveText(...values: Array<number | string | null | undefined>): string {
  return resolveNullableText(...values) ?? '';
}