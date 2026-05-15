import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { getBackendErrorMessage, mapBackendError } from './backend-error.mapper';

export interface MasterEndpointUrls {
  contractedUrl: string;
  flatFallbackUrl: string;
}

export function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export function buildMasterEndpointUrls(
  apiUrl: string,
  domain: string,
): MasterEndpointUrls {
  return {
    contractedUrl: `${apiUrl}/maestros/${domain}`,
    flatFallbackUrl: `${apiUrl}/${domain}`,
  };
}

export function buildMasterListParams(companyId: string): HttpParams {
  return new HttpParams()
    .set('empresa_id', companyId)
    .set('companyId', companyId)
    .set('skip', '0')
    .set('limit', '500');
}

export function withApiFallback<T>(
  operation: () => Observable<T>,
  fallback: () => Observable<T>,
  options: {
    fallbackEnabled: boolean;
    context: string;
    permissionMessage: string;
  },
): Observable<T> {
  return operation().pipe(
    catchError((error: unknown) => {
      if (options.fallbackEnabled && shouldFallbackToMock(error)) {
        console.warn(`Se activo fallback mock para ${options.context}.`, error);
        return fallback();
      }

      return throwError(() => mapApiError(error, options.context, options.permissionMessage));
    }),
  );
}

export function withFlatMasterEndpointFallback<T>(
  operation: (baseUrl: string) => Observable<T>,
  urls: MasterEndpointUrls,
  fallbackEnabled: boolean,
): Observable<T> {
  return operation(urls.contractedUrl).pipe(
    catchError((error: unknown) => {
      if (fallbackEnabled && shouldFallbackToFlatMasterEndpoint(error)) {
        console.warn(
          `Se activo compatibilidad temporal de endpoint plano para ${urls.contractedUrl}.`,
          error,
        );
        return operation(urls.flatFallbackUrl);
      }

      return throwError(() => error);
    }),
  );
}

export function shouldFallbackToMock(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return true;
  }

  return [0, 404, 405, 500, 501, 502, 503, 504].includes(error.status);
}

export function shouldFallbackToFlatMasterEndpoint(error: unknown): boolean {
  return error instanceof HttpErrorResponse && [404, 405].includes(error.status);
}

export function mapApiError(
  error: unknown,
  context: string,
  permissionMessage: string,
): Error {
  const uiError = mapBackendError(error);

  if (uiError.isPermissionError) {
    return new Error(permissionMessage);
  }

  if (uiError.isValidationError) {
    return new Error(
      getBackendErrorMessage(error) ||
        'El backend reporto errores de validacion para los datos enviados.',
    );
  }

  return new Error(
    getBackendErrorMessage(error) ||
      `No fue posible completar la operacion de ${context}.`,
  );
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
      rows?: unknown[];
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

    if (Array.isArray(candidate.rows)) {
      return candidate.rows as T[];
    }
  }

  return [];
}

export function resolveTotal(payload: unknown, fallback: number): number {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const candidate = payload as { total?: number; count?: number };
    return candidate.total ?? candidate.count ?? fallback;
  }

  return fallback;
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function resolveNullableText(
  ...values: Array<number | string | null | undefined>
): string | null {
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

export function resolveText(
  ...values: Array<number | string | null | undefined>
): string {
  return resolveNullableText(...values) ?? '';
}

export function resolveNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function resolveBoolean(
  value: boolean | number | string | null | undefined,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'si', 'sí', 'yes', 'activo', 'active'].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

export function resolveMasterStatus(
  ...values: Array<boolean | number | string | null | undefined>
): 'ACTIVO' | 'INACTIVO' {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 'ACTIVO' : 'INACTIVO';
    }

    if (typeof value === 'number') {
      return value !== 0 ? 'ACTIVO' : 'INACTIVO';
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (['activo', 'active', '1', 'true'].includes(normalized)) {
        return 'ACTIVO';
      }

      if (['inactivo', 'inactive', '0', 'false'].includes(normalized)) {
        return 'INACTIVO';
      }
    }
  }

  return 'ACTIVO';
}
