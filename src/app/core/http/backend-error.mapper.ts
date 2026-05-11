import { HttpErrorResponse } from '@angular/common/http';

export interface BackendUiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  isAuthError: boolean;
  isPermissionError: boolean;
  isNetworkError: boolean;
  isValidationError: boolean;
  isServerError: boolean;
}

const DEFAULT_ERROR_MESSAGE = 'No fue posible completar la operacion.';
const NETWORK_ERROR_MESSAGE = 'No fue posible conectar con el servidor.';

export function mapBackendError(error: unknown): BackendUiError {
  if (error instanceof HttpErrorResponse) {
    return mapHttpErrorResponse(error);
  }

  if (error instanceof Error) {
    return buildBackendUiError({
      status: 0,
      code: 'CLIENT_ERROR',
      message: error.message || DEFAULT_ERROR_MESSAGE,
      details: error,
    });
  }

  return buildBackendUiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: DEFAULT_ERROR_MESSAGE,
    details: error,
  });
}

export function getBackendErrorMessage(error: unknown): string {
  return mapBackendError(error).message;
}

function mapHttpErrorResponse(error: HttpErrorResponse): BackendUiError {
  const payload = asRecord(error.error);
  const status = error.status;
  const code = extractCode(payload, status);
  const details = extractDetails(error.error, payload);
  const message = extractMessage(error, payload);

  return buildBackendUiError({
    status,
    code,
    message,
    details,
  });
}

function buildBackendUiError(input: {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}): BackendUiError {
  const status = input.status;

  return {
    status,
    code: input.code,
    message: input.message,
    details: input.details,
    isAuthError: status === 401,
    isPermissionError: status === 403,
    isNetworkError: input.code === 'NETWORK_ERROR',
    isValidationError: [400, 409, 422].includes(status),
    isServerError: status >= 500,
  };
}

function extractCode(payload: Record<string, unknown> | null, status: number): string {
  const explicitCode =
    readString(payload, 'code') ??
    readString(payload, 'error_code') ??
    readString(payload, 'codigo') ??
    readString(payload, 'type');

  if (explicitCode) {
    return explicitCode;
  }

  if (status === 0) {
    return 'NETWORK_ERROR';
  }

  return `HTTP_${status || 'UNKNOWN'}`;
}

function extractMessage(
  error: HttpErrorResponse,
  payload: Record<string, unknown> | null,
): string {
  if (error.status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }

  const detail = payload?.['detail'];
  const explicitMessage =
    readString(payload, 'message') ??
    readString(payload, 'mensaje') ??
    readString(payload, 'error') ??
    readString(payload, 'title') ??
    (typeof detail === 'string' ? detail.trim() : null);

  if (explicitMessage) {
    return explicitMessage;
  }

  if (Array.isArray(detail) && detail.length) {
    return 'La solicitud contiene datos invalidos.';
  }

  return error.message || DEFAULT_ERROR_MESSAGE;
}

function extractDetails(
  rawPayload: unknown,
  payload: Record<string, unknown> | null,
): unknown {
  if (!payload) {
    return rawPayload;
  }

  return payload['details'] ?? payload['detail'] ?? payload['errors'] ?? rawPayload;
}

function readString(
  payload: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = payload?.[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
