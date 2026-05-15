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
  BackendVendorDto,
  mapBackendVendorToVendor,
  mapVendorPayloadToBackend,
} from '../../application/mappers/vendor.mapper';
import { DEFAULT_VENDOR_FILTERS, VendorFilters } from '../../domain/models/vendor-filters.model';
import { SaveVendorPayload } from '../../domain/models/vendor-form.model';
import {
  Vendor,
  VendorAssignableClient,
  VendorCatalogs,
  VendorStatus,
} from '../../domain/models/vendor.model';
import {
  VendorAuditDraft,
  VendorListResponse,
  VendorMutationAction,
  VendorMutationResult,
} from '../../domain/models/vendor-response.model';
import { VendorsRepository } from '../../domain/repositories/vendor.repository';
import { VendorMockRepository } from './vendor-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class VendorApiRepository implements VendorsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(VendorMockRepository);
  private readonly endpointUrls = buildMasterEndpointUrls(environment.apiUrl, 'vendedores');

  getCatalogs(companyId: string): Observable<VendorCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listVendors(companyId: string, filters: VendorFilters): Observable<VendorListResponse> {
    if (environment.useVendorsAdministrationMock) {
      return this.mockRepository.listVendors(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<unknown>(withTrailingSlash(baseUrl), {
            params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
          }),
        ).pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listVendors(companyId, filters),
      'catalogo de vendedores',
    );
  }

  listAssignableClients(companyId: string, zone: string | null): Observable<VendorAssignableClient[]> {
    return this.mockRepository.listAssignableClients(companyId, zone);
  }

  getVendor(companyId: string, vendorId: string): Observable<Vendor> {
    if (environment.useVendorsAdministrationMock) {
      return this.mockRepository.getVendor(companyId, vendorId);
    }

    return this.withFallback(
      () => this.loadVendor(companyId, vendorId),
      () => this.mockRepository.getVendor(companyId, vendorId),
      'vendedor',
    );
  }

  saveVendor(
    companyId: string,
    payload: SaveVendorPayload,
    vendorId?: string,
  ): Observable<VendorMutationResult> {
    if (environment.useVendorsAdministrationMock) {
      return this.mockRepository.saveVendor(companyId, payload, vendorId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapVendorPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (vendorId) {
          return this.resolveVendorRequestId(companyId, vendorId).pipe(
            switchMap((requestVendorId) =>
              this.withEndpointCompatibility((baseUrl) =>
                this.http.patch<BackendVendorDto | void>(
                  `${withTrailingSlash(baseUrl)}${requestVendorId}`,
                  requestBody,
                ),
              )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedVendor(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      vendorId,
                      requestVendorId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.withEndpointCompatibility((baseUrl) =>
          this.http.post<BackendVendorDto>(withTrailingSlash(baseUrl), requestBody),
        )
          .pipe(
            switchMap((response) =>
              this.resolveSavedVendor(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveVendor(companyId, payload, vendorId),
      vendorId ? 'actualizacion de vendedor' : 'creacion de vendedor',
    );
  }

  deleteVendor(companyId: string, vendorId: string): Observable<VendorMutationResult> {
    if (environment.useVendorsAdministrationMock) {
      return this.mockRepository.deleteVendor(companyId, vendorId);
    }

    return this.withFallback(
      () =>
        this.resolveVendorRequestId(companyId, vendorId).pipe(
          switchMap((requestVendorId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.delete<unknown>(`${withTrailingSlash(baseUrl)}${requestVendorId}`),
            )
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, vendorId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, vendorId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteVendor(companyId, vendorId),
      'eliminacion de vendedor',
    );
  }

  updateVendorStatus(
    companyId: string,
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult> {
    if (environment.useVendorsAdministrationMock) {
      return this.mockRepository.updateVendorStatus(companyId, vendorId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, vendorId, status),
      () => this.mockRepository.updateVendorStatus(companyId, vendorId, status),
      'estado de vendedor',
    );
  }

  private loadVendor(companyId: string, vendorId: string): Observable<Vendor> {
    return this.resolveVendorRequestId(companyId, vendorId).pipe(
      switchMap((requestVendorId) =>
        this.withEndpointCompatibility((baseUrl) =>
          this.http.get<BackendVendorDto>(`${withTrailingSlash(baseUrl)}${requestVendorId}`),
        )
          .pipe(
            map((vendor) =>
              mapBackendVendorToVendor(vendor, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: VendorFilters,
  ): VendorListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const vendors = extractArrayPayload<BackendVendorDto>(payload)
      .map((vendor) =>
        mapBackendVendorToVendor(vendor, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((vendor) => this.matchesFilters(vendor, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: vendors.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: resolveTotal(payload, vendors.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedVendor(
    companyId: string,
    response: BackendVendorDto | void,
    action: Extract<VendorMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<VendorMutationResult> {
    if (response) {
      const vendor = mapBackendVendorToVendor(response, companyId, companyName);
      return of(this.buildMutationResult(action, vendor));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el vendedor guardado.'));
    }

    return this.loadVendor(companyId, candidateId).pipe(
      map((vendor) => this.buildMutationResult(action, vendor)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    vendorId: string,
    status: VendorStatus,
  ): Observable<VendorMutationResult> {
    return this.loadVendor(companyId, vendorId).pipe(
      switchMap((vendor) =>
        this.resolveVendorRequestId(companyId, vendorId).pipe(
          switchMap((requestVendorId) =>
            this.withEndpointCompatibility((baseUrl) =>
              this.http.patch<BackendVendorDto | void>(
                `${withTrailingSlash(baseUrl)}${requestVendorId}`,
                {
                  estado: status,
                  activo: status === 'ACTIVO',
                  isActive: status === 'ACTIVO',
                },
              ),
            )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedVendor(
                    companyId,
                    response,
                    'updated',
                    vendor.empresaNombre,
                    vendor.id,
                    requestVendorId,
                  ),
                ),
                map((result): VendorMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El vendedor ${result.vendor?.nombreVendedor ?? vendor.nombreVendedor} fue activado.`
                      : `El vendedor ${result.vendor?.nombreVendedor ?? vendor.nombreVendedor} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.vendor ?? { ...vendor, estado: status },
                    status === 'ACTIVO'
                      ? `Activacion del vendedor ${vendor.nombreVendedor}.`
                      : `Inactivacion del vendedor ${vendor.nombreVendedor}.`,
                    this.sanitizeAuditPayload(vendor),
                    this.sanitizeAuditPayload(result.vendor ?? { ...vendor, estado: status }),
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
    vendorId: string,
    response: unknown,
  ): VendorMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const vendor = mapBackendVendorToVendor(
        response as BackendVendorDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: VendorMutationAction =
        vendor.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        vendor: action === 'deleted' ? null : vendor,
        message:
          action === 'inactivated'
            ? 'El backend reporto que el vendedor fue inactivado por dependencias operativas.'
            : `El vendedor ${vendor.nombreVendedor} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          vendor,
          action === 'inactivated'
            ? `Inactivacion del vendedor ${vendor.nombreVendedor} reportada por backend.`
            : `Eliminacion del vendedor ${vendor.nombreVendedor}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(vendor),
        ),
      };
    }

    const auditVendor = this.buildDeletedVendor(companyId, vendorId);

    return {
      action: 'deleted',
      vendor: null,
      message: 'El vendedor fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft('delete', auditVendor, `Eliminacion del vendedor ${vendorId}.`, null, null),
    };
  }

  private resolveVendorRequestId(companyId: string, vendorId: string): Observable<string> {
    return this.withEndpointCompatibility((baseUrl) =>
      this.http.get<unknown>(withTrailingSlash(baseUrl), {
        params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
      }),
    )
      .pipe(
        map((response) => {
          const vendor = extractArrayPayload<BackendVendorDto>(response).find((candidate) =>
            this.matchesVendorReference(candidate, vendorId),
          );

          return (
            resolveNullableText(vendor?.id, vendor?.vendedor_id, vendor?.vendedorId, vendor?.id_vendedor, vendor?.idVendedor) ??
            vendorId
          );
        }),
      );
  }

  private matchesVendorReference(vendor: BackendVendorDto, vendorId: string): boolean {
    const normalizedVendorId = vendorId.trim();
    const candidates = [
      resolveNullableText(vendor.id),
      resolveNullableText(vendor.vendedor_id),
      resolveNullableText(vendor.vendedorId),
      resolveNullableText(vendor.id_vendedor),
      resolveNullableText(vendor.idVendedor),
    ];

    return candidates.includes(normalizedVendorId);
  }

  private normalizeFilters(filters: VendorFilters, companyId: string): Required<VendorFilters> {
    return {
      ...DEFAULT_VENDOR_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      zona: filters.zona ?? null,
      canal: filters.canal ?? null,
      search: filters.search?.trim() ?? '',
      page: filters.page ?? DEFAULT_VENDOR_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_VENDOR_FILTERS.pageSize,
    };
  }

  private matchesFilters(vendor: Vendor, filters: Required<VendorFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [vendor.idVendedor, vendor.nombreVendedor, vendor.tipoVendedor, vendor.zona, vendor.canal].some((value) =>
        normalizeText(value).includes(normalizedSearch),
      );
    const matchesStatus = filters.estado === 'TODOS' || vendor.estado === filters.estado;
    const matchesZone = !filters.zona || vendor.zona === filters.zona;
    const matchesChannel = !filters.canal || vendor.canal === filters.canal;

    return matchesSearch && matchesStatus && matchesZone && matchesChannel;
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
    action: Extract<VendorMutationAction, 'created' | 'updated'>,
    vendor: Vendor,
  ): VendorMutationResult {
    return {
      action,
      vendor,
      message:
        action === 'created'
          ? `El vendedor ${vendor.nombreVendedor} fue creado correctamente.`
          : `El vendedor ${vendor.nombreVendedor} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        vendor,
        action === 'created'
          ? `Creacion del vendedor ${vendor.nombreVendedor}.`
          : `Actualizacion del vendedor ${vendor.nombreVendedor}.`,
        null,
        this.sanitizeAuditPayload(vendor),
      ),
    };
  }

  private buildAuditDraft(
    action: VendorAuditDraft['action'],
    vendor: Vendor,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): VendorAuditDraft {
    return {
      module: 'vendedores',
      action,
      companyId: vendor.empresaId,
      companyName: vendor.empresaNombre ?? 'Empresa activa',
      entityId: vendor.id,
      entityName: vendor.nombreVendedor,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(vendor: Vendor): Record<string, unknown> {
    return {
      id: vendor.id,
      empresaId: vendor.empresaId,
      idVendedor: vendor.idVendedor,
      nombreVendedor: vendor.nombreVendedor,
      tipoVendedor: vendor.tipoVendedor,
      zona: vendor.zona,
      canal: vendor.canal,
      cuotaMensual: vendor.cuotaMensual ?? null,
      ciudadId: vendor.ciudadId ?? null,
      ciudadNombre: vendor.ciudadNombre ?? null,
      direccion: vendor.direccion ?? null,
      celular: vendor.celular ?? null,
      email: vendor.email ?? null,
      estado: vendor.estado,
      clientesAsignados: vendor.clientesAsignados,
      cantidadClientesAsignados: vendor.cantidadClientesAsignados,
      dependenciasActivas: vendor.tieneDependenciasActivas,
    };
  }

  private buildDeletedVendor(companyId: string, vendorId: string): Vendor {
    return {
      id: vendorId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      idVendedor: vendorId,
      nombreVendedor: 'Vendedor eliminado',
      tipoVendedor: '',
      zona: '',
      canal: '',
      clientesAsignados: [],
      cantidadClientesAsignados: 0,
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
      fallbackEnabled: environment.enableVendorsAdministrationFallback,
      context,
      permissionMessage: 'No tienes permisos para operar vendedores en la empresa activa.',
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
