import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import {
  buildMasterListParams,
  buildMasterEndpointUrls,
  extractArrayPayload,
  normalizeText,
  resolveNullableText,
  resolveTotal,
  withApiFallback,
  withFlatMasterEndpointFallback,
  withTrailingSlash,
} from '../../../../core/http/master-api.utils';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendSupplierDto,
  mapBackendSupplierToSupplier,
  mapSupplierPayloadToBackend,
} from '../../application/mappers/supplier.mapper';
import { SupplierFilters, DEFAULT_SUPPLIER_FILTERS } from '../../domain/models/supplier-filters.model';
import { SaveSupplierPayload } from '../../domain/models/supplier-form.model';
import { Supplier, SupplierCatalogs, SupplierStatus } from '../../domain/models/supplier.model';
import {
  SupplierAuditDraft,
  SupplierListResponse,
  SupplierMutationAction,
  SupplierMutationResult,
} from '../../domain/models/supplier-response.model';
import { SuppliersRepository } from '../../domain/repositories/supplier.repository';
import { SupplierMockRepository } from './supplier-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class SupplierApiRepository implements SuppliersRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(SupplierMockRepository);
  private readonly endpointUrls = buildMasterEndpointUrls(environment.apiUrl, 'proveedores');

  getCatalogs(companyId: string): Observable<SupplierCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listSuppliers(companyId: string, filters: SupplierFilters): Observable<SupplierListResponse> {
    if (environment.useSuppliersAdministrationMock) {
      return this.mockRepository.listSuppliers(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<unknown>(withTrailingSlash(baseUrl), {
            params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
          }),
        ).pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listSuppliers(companyId, filters),
      'catalogo de proveedores',
    );
  }

  getSupplier(companyId: string, supplierId: string): Observable<Supplier> {
    if (environment.useSuppliersAdministrationMock) {
      return this.mockRepository.getSupplier(companyId, supplierId);
    }

    return this.withFallback(
      () => this.loadSupplier(companyId, supplierId),
      () => this.mockRepository.getSupplier(companyId, supplierId),
      'proveedor',
    );
  }

  saveSupplier(
    companyId: string,
    payload: SaveSupplierPayload,
    supplierId?: string,
  ): Observable<SupplierMutationResult> {
    if (environment.useSuppliersAdministrationMock) {
      return this.mockRepository.saveSupplier(companyId, payload, supplierId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapSupplierPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (supplierId) {
          return this.resolveSupplierRequestId(companyId, supplierId).pipe(
            switchMap((requestSupplierId) =>
              this.withEndpointCompatibility((baseUrl) =>
                this.http.patch<BackendSupplierDto | void>(
                  `${withTrailingSlash(baseUrl)}${requestSupplierId}`,
                  requestBody,
                ),
              )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedSupplier(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      supplierId,
                      requestSupplierId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.withEndpointCompatibility((baseUrl) =>
          this.http.post<BackendSupplierDto>(withTrailingSlash(baseUrl), requestBody),
        )
          .pipe(
            switchMap((response) =>
              this.resolveSavedSupplier(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveSupplier(companyId, payload, supplierId),
      supplierId ? 'actualizacion de proveedor' : 'creacion de proveedor',
    );
  }

  deleteSupplier(companyId: string, supplierId: string): Observable<SupplierMutationResult> {
    if (environment.useSuppliersAdministrationMock) {
      return this.mockRepository.deleteSupplier(companyId, supplierId);
    }

    return this.withFallback(
      () =>
        this.resolveSupplierRequestId(companyId, supplierId).pipe(
          switchMap((requestSupplierId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.delete<unknown>(`${withTrailingSlash(baseUrl)}${requestSupplierId}`),
            )
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, supplierId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, supplierId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteSupplier(companyId, supplierId),
      'eliminacion de proveedor',
    );
  }

  updateSupplierStatus(
    companyId: string,
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult> {
    if (environment.useSuppliersAdministrationMock) {
      return this.mockRepository.updateSupplierStatus(companyId, supplierId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, supplierId, status),
      () => this.mockRepository.updateSupplierStatus(companyId, supplierId, status),
      'estado de proveedor',
    );
  }

  private loadSupplier(companyId: string, supplierId: string): Observable<Supplier> {
    return this.resolveSupplierRequestId(companyId, supplierId).pipe(
      switchMap((requestSupplierId) =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<BackendSupplierDto>(`${withTrailingSlash(baseUrl)}${requestSupplierId}`),
        )
          .pipe(
            map((supplier) =>
              mapBackendSupplierToSupplier(supplier, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: SupplierFilters,
  ): SupplierListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const suppliers = extractArrayPayload<BackendSupplierDto>(payload)
      .map((supplier) =>
        mapBackendSupplierToSupplier(supplier, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((supplier) => this.matchesFilters(supplier, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: suppliers.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: resolveTotal(payload, suppliers.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedSupplier(
    companyId: string,
    response: BackendSupplierDto | void,
    action: Extract<SupplierMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<SupplierMutationResult> {
    if (response) {
      const supplier = mapBackendSupplierToSupplier(response, companyId, companyName);
      return of(this.buildMutationResult(action, supplier));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el proveedor guardado.'));
    }

    return this.loadSupplier(companyId, candidateId).pipe(
      map((supplier) => this.buildMutationResult(action, supplier)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    supplierId: string,
    status: SupplierStatus,
  ): Observable<SupplierMutationResult> {
    return this.loadSupplier(companyId, supplierId).pipe(
      switchMap((supplier) =>
        this.resolveSupplierRequestId(companyId, supplierId).pipe(
          switchMap((requestSupplierId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.patch<BackendSupplierDto | void>(
                `${withTrailingSlash(baseUrl)}${requestSupplierId}`,
                {
                  estado: status,
                  activo: status === 'ACTIVO',
                  isActive: status === 'ACTIVO',
                },
              ),
            )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedSupplier(
                    companyId,
                    response,
                    'updated',
                    supplier.empresaNombre ?? this.resolveCompanyName(companyId),
                    supplier.id,
                    requestSupplierId,
                  ),
                ),
                map((result): SupplierMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El proveedor ${result.supplier?.nombreProveedor ?? supplier.nombreProveedor} fue activado.`
                      : `El proveedor ${result.supplier?.nombreProveedor ?? supplier.nombreProveedor} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.supplier ?? { ...supplier, estado: status },
                    status === 'ACTIVO'
                      ? `Activacion del proveedor ${supplier.nombreProveedor}.`
                      : `Inactivacion del proveedor ${supplier.nombreProveedor}.`,
                    this.sanitizeAuditPayload(supplier),
                    this.sanitizeAuditPayload(result.supplier ?? { ...supplier, estado: status }),
                  ),
                })),
              ),
          ),
        ),
      ),
    );
  }

  private mapDeleteResponse(
    companyId: string,
    supplierId: string,
    response: unknown,
  ): SupplierMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const supplier = mapBackendSupplierToSupplier(
        response as BackendSupplierDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: SupplierMutationAction =
        supplier.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        supplier: action === 'deleted' ? null : supplier,
        message:
          action === 'inactivated'
            ? 'El backend reporto que el proveedor fue inactivado por dependencias operativas.'
            : `El proveedor ${supplier.nombreProveedor} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          supplier,
          action === 'inactivated'
            ? `Inactivacion del proveedor ${supplier.nombreProveedor} reportada por backend.`
            : `Eliminacion del proveedor ${supplier.nombreProveedor}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(supplier),
        ),
      };
    }

    const auditSupplier = this.buildDeletedSupplier(companyId, supplierId);

    return {
      action: 'deleted',
      supplier: null,
      message: 'El proveedor fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft('delete', auditSupplier, `Eliminacion del proveedor ${supplierId}.`, null, null),
    };
  }

  private resolveSupplierRequestId(companyId: string, supplierId: string): Observable<string> {
    return this.withEndpointCompatibility((baseUrl) =>
      this.http.get<unknown>(withTrailingSlash(baseUrl), {
        params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
      }),
    )
      .pipe(
        map((response) => {
          const supplier = extractArrayPayload<BackendSupplierDto>(response).find((candidate) =>
            this.matchesSupplierReference(candidate, supplierId),
          );

          return (
            resolveNullableText(supplier?.id, supplier?.proveedor_id, supplier?.supplierId, supplier?.nit) ??
            supplierId
          );
        }),
      );
  }

  private matchesSupplierReference(supplier: BackendSupplierDto, supplierId: string): boolean {
    const normalizedSupplierId = supplierId.trim();
    const candidates = [
      resolveNullableText(supplier.id),
      resolveNullableText(supplier.proveedor_id),
      resolveNullableText(supplier.supplierId),
      resolveNullableText(supplier.nit),
    ];

    return candidates.includes(normalizedSupplierId);
  }

  private normalizeFilters(filters: SupplierFilters, companyId: string): Required<SupplierFilters> {
    return {
      ...DEFAULT_SUPPLIER_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      search: filters.search?.trim() ?? '',
      ciudadId: filters.ciudadId ?? null,
      tipoAbastecimiento: filters.tipoAbastecimiento ?? null,
      productoPrincipal: filters.productoPrincipal ?? null,
      page: filters.page ?? DEFAULT_SUPPLIER_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_SUPPLIER_FILTERS.pageSize,
    };
  }

  private matchesFilters(supplier: Supplier, filters: Required<SupplierFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        supplier.nit,
        supplier.nombreProveedor,
        supplier.ciudadNombre ?? '',
        supplier.productoPrincipal,
        supplier.tipoAbastecimiento,
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || supplier.estado === filters.estado;
    const matchesCity = !filters.ciudadId || supplier.ciudadId === filters.ciudadId;
    const matchesSupplyType =
      !filters.tipoAbastecimiento || supplier.tipoAbastecimiento === filters.tipoAbastecimiento;
    const matchesProduct =
      !filters.productoPrincipal || supplier.productoPrincipal === filters.productoPrincipal;

    return matchesSearch && matchesStatus && matchesCity && matchesSupplyType && matchesProduct;
  }

  private resolveCompanyName(companyId: string): string {
    return (
      this.authSessionService
        .getSession()
        ?.companies?.find((company) => company.id === companyId || company.backendId === companyId)
        ?.name ?? 'Empresa activa'
    );
  }

  private resolveRequestCompanyId(companyId: string): string {
    const session = this.authSessionService.getSession();
    const company = session?.companies?.find((candidate) => candidate.id === companyId);

    return company?.backendId ?? (session?.activeCompanyId === companyId ? session.activeBackendCompanyId : null) ?? companyId;
  }

  private shouldInactivateInstead(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const detail = String(error.error?.detail ?? error.error?.message ?? '').toLowerCase();
    return error.status === 409 || detail.includes('depend') || detail.includes('inactiv');
  }

  private buildMutationResult(
    action: Extract<SupplierMutationAction, 'created' | 'updated'>,
    supplier: Supplier,
  ): SupplierMutationResult {
    return {
      action,
      supplier,
      message:
        action === 'created'
          ? `El proveedor ${supplier.nombreProveedor} fue creado correctamente.`
          : `El proveedor ${supplier.nombreProveedor} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        supplier,
        action === 'created'
          ? `Creacion del proveedor ${supplier.nombreProveedor}.`
          : `Actualizacion del proveedor ${supplier.nombreProveedor}.`,
        null,
        this.sanitizeAuditPayload(supplier),
      ),
    };
  }

  private buildAuditDraft(
    action: SupplierAuditDraft['action'],
    supplier: Supplier,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): SupplierAuditDraft {
    return {
      module: 'proveedores',
      action,
      companyId: supplier.empresaId,
      companyName: supplier.empresaNombre ?? 'Empresa activa',
      entityId: supplier.id,
      entityName: supplier.nombreProveedor,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(supplier: Supplier): Record<string, unknown> {
    return {
      id: supplier.id,
      empresaId: supplier.empresaId,
      nit: supplier.nit,
      nombreProveedor: supplier.nombreProveedor,
      ciudadId: supplier.ciudadId ?? null,
      ciudadNombre: supplier.ciudadNombre ?? null,
      direccion: supplier.direccion,
      telefono: supplier.telefono,
      email: supplier.email ?? null,
      tipoAbastecimiento: supplier.tipoAbastecimiento,
      productoPrincipal: supplier.productoPrincipal,
      leadTimeDias: supplier.leadTimeDias ?? null,
      moq: supplier.moq ?? null,
      condicionPago: supplier.condicionPago ?? null,
      estado: supplier.estado,
      dependenciasActivas: supplier.tieneDependenciasActivas,
    };
  }

  private buildDeletedSupplier(companyId: string, supplierId: string): Supplier {
    return {
      id: supplierId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      nit: supplierId,
      nombreProveedor: 'Proveedor eliminado',
      direccion: '',
      telefono: '',
      tipoAbastecimiento: 'MIR',
      productoPrincipal: '',
      estado: 'INACTIVO',
      tieneDependenciasActivas: false,
    };
  }

  private withFallback<T>(
    operation: () => Observable<T>,
    fallback: () => Observable<T>,
    context: string,
  ): Observable<T> {
    return withApiFallback(operation, fallback, {
      fallbackEnabled: environment.enableSuppliersAdministrationFallback,
      context,
      permissionMessage: 'No tienes permisos para operar proveedores en la empresa activa.',
    });
  }

  private withEndpointCompatibility<T>(
    operation: (baseUrl: string) => Observable<T>,
  ): Observable<T> {
    return withFlatMasterEndpointFallback(
      operation,
      this.endpointUrls,
      environment.useFlatMasterEndpointsFallback,
    );
  }
}
