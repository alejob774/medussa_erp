import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import {
  buildMasterListParams,
  extractArrayPayload,
  normalizeText,
  resolveNullableText,
  resolveTotal,
  withApiFallback,
  withTrailingSlash,
} from '../../../../core/http/master-api.utils';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import {
  BackendEquipmentDto,
  mapBackendEquipmentToEquipment,
  mapEquipmentPayloadToBackend,
} from '../../application/mappers/equipment.mapper';
import { EquipmentFilters, DEFAULT_EQUIPMENT_FILTERS } from '../../domain/models/equipment-filters.model';
import { SaveEquipmentPayload } from '../../domain/models/equipment-form.model';
import { Equipment, EquipmentCatalogs, EquipmentStatus } from '../../domain/models/equipment.model';
import {
  EquipmentAuditDraft,
  EquipmentListResponse,
  EquipmentMutationAction,
  EquipmentMutationResult,
} from '../../domain/models/equipment-response.model';
import { EquipmentsRepository } from '../../domain/repositories/equipment.repository';
import { EquipmentMockRepository } from './equipment-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class EquipmentApiRepository implements EquipmentsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(EquipmentMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/maestros/equipos`;

  getCatalogs(companyId: string): Observable<EquipmentCatalogs> {
    return this.mockRepository.getCatalogs(companyId);
  }

  listEquipments(companyId: string, filters: EquipmentFilters): Observable<EquipmentListResponse> {
    if (environment.useEquipmentsAdministrationMock) {
      return this.mockRepository.listEquipments(companyId, filters);
    }

    return this.withFallback(
      () =>
        this.http
          .get<unknown>(withTrailingSlash(this.baseUrl), {
            params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
          })
          .pipe(map((response) => this.mapListResponse(response, companyId, filters))),
      () => this.mockRepository.listEquipments(companyId, filters),
      'catalogo de equipos',
    );
  }

  getEquipment(companyId: string, equipmentId: string): Observable<Equipment> {
    if (environment.useEquipmentsAdministrationMock) {
      return this.mockRepository.getEquipment(companyId, equipmentId);
    }

    return this.withFallback(
      () => this.loadEquipment(companyId, equipmentId),
      () => this.mockRepository.getEquipment(companyId, equipmentId),
      'equipo',
    );
  }

  saveEquipment(
    companyId: string,
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): Observable<EquipmentMutationResult> {
    if (environment.useEquipmentsAdministrationMock) {
      return this.mockRepository.saveEquipment(companyId, payload, equipmentId);
    }

    return this.withFallback(
      () => {
        const requestBody = mapEquipmentPayloadToBackend(
          payload,
          this.resolveRequestCompanyId(payload.empresaId || companyId),
        );

        if (equipmentId) {
          return this.resolveEquipmentRequestId(companyId, equipmentId).pipe(
            switchMap((requestEquipmentId) =>
              this.http
                .patch<BackendEquipmentDto | void>(
                  `${withTrailingSlash(this.baseUrl)}${requestEquipmentId}`,
                  requestBody,
                )
                .pipe(
                  switchMap((response) =>
                    this.resolveSavedEquipment(
                      companyId,
                      response,
                      'updated',
                      payload.empresaNombre,
                      equipmentId,
                      requestEquipmentId,
                    ),
                  ),
                ),
            ),
          );
        }

        return this.http
          .post<BackendEquipmentDto>(withTrailingSlash(this.baseUrl), requestBody)
          .pipe(
            switchMap((response) =>
              this.resolveSavedEquipment(companyId, response, 'created', payload.empresaNombre),
            ),
          );
      },
      () => this.mockRepository.saveEquipment(companyId, payload, equipmentId),
      equipmentId ? 'actualizacion de equipo' : 'creacion de equipo',
    );
  }

  deleteEquipment(companyId: string, equipmentId: string): Observable<EquipmentMutationResult> {
    if (environment.useEquipmentsAdministrationMock) {
      return this.mockRepository.deleteEquipment(companyId, equipmentId);
    }

    return this.withFallback(
      () =>
        this.resolveEquipmentRequestId(companyId, equipmentId).pipe(
          switchMap((requestEquipmentId) =>
            this.http
              .delete<unknown>(`${withTrailingSlash(this.baseUrl)}${requestEquipmentId}`)
              .pipe(
                map((response) => this.mapDeleteResponse(companyId, equipmentId, response)),
                catchError((error: unknown) =>
                  this.shouldInactivateInstead(error)
                    ? this.updateStatusThroughApi(companyId, equipmentId, 'INACTIVO')
                    : throwError(() => error),
                ),
              ),
          ),
        ),
      () => this.mockRepository.deleteEquipment(companyId, equipmentId),
      'eliminacion de equipo',
    );
  }

  updateEquipmentStatus(
    companyId: string,
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult> {
    if (environment.useEquipmentsAdministrationMock) {
      return this.mockRepository.updateEquipmentStatus(companyId, equipmentId, status);
    }

    return this.withFallback(
      () => this.updateStatusThroughApi(companyId, equipmentId, status),
      () => this.mockRepository.updateEquipmentStatus(companyId, equipmentId, status),
      'estado de equipo',
    );
  }

  private loadEquipment(companyId: string, equipmentId: string): Observable<Equipment> {
    return this.resolveEquipmentRequestId(companyId, equipmentId).pipe(
      switchMap((requestEquipmentId) =>
        this.http
          .get<BackendEquipmentDto>(`${withTrailingSlash(this.baseUrl)}${requestEquipmentId}`)
          .pipe(
            map((equipment) =>
              mapBackendEquipmentToEquipment(equipment, companyId, this.resolveCompanyName(companyId)),
            ),
          ),
      ),
    );
  }

  private mapListResponse(
    payload: unknown,
    companyId: string,
    filters: EquipmentFilters,
  ): EquipmentListResponse {
    const normalizedFilters = this.normalizeFilters(filters, companyId);
    const equipments = extractArrayPayload<BackendEquipmentDto>(payload)
      .map((equipment) =>
        mapBackendEquipmentToEquipment(equipment, companyId, this.resolveCompanyName(companyId)),
      )
      .filter((equipment) => this.matchesFilters(equipment, normalizedFilters));
    const startIndex = normalizedFilters.page * normalizedFilters.pageSize;

    return {
      items: equipments.slice(startIndex, startIndex + normalizedFilters.pageSize),
      total: resolveTotal(payload, equipments.length),
      page: normalizedFilters.page,
      pageSize: normalizedFilters.pageSize,
      filters: normalizedFilters,
    };
  }

  private resolveSavedEquipment(
    companyId: string,
    response: BackendEquipmentDto | void,
    action: Extract<EquipmentMutationAction, 'created' | 'updated'>,
    companyName: string,
    fallbackFrontendId?: string,
    fallbackRequestId?: string,
  ): Observable<EquipmentMutationResult> {
    if (response) {
      const equipment = mapBackendEquipmentToEquipment(response, companyId, companyName);
      return of(this.buildMutationResult(action, equipment));
    }

    const candidateId = fallbackFrontendId ?? fallbackRequestId;

    if (!candidateId) {
      return throwError(() => new Error('No fue posible recuperar el equipo guardado.'));
    }

    return this.loadEquipment(companyId, candidateId).pipe(
      map((equipment) => this.buildMutationResult(action, equipment)),
    );
  }

  private updateStatusThroughApi(
    companyId: string,
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult> {
    return this.loadEquipment(companyId, equipmentId).pipe(
      switchMap((equipment) =>
        this.resolveEquipmentRequestId(companyId, equipmentId).pipe(
          switchMap((requestEquipmentId) =>
            this.http
              .patch<BackendEquipmentDto | void>(
                `${withTrailingSlash(this.baseUrl)}${requestEquipmentId}`,
                {
                  estado: status,
                  activo: status === 'ACTIVO',
                  isActive: status === 'ACTIVO',
                },
              )
              .pipe(
                switchMap((response) =>
                  this.resolveSavedEquipment(
                    companyId,
                    response,
                    'updated',
                    equipment.empresaNombre ?? this.resolveCompanyName(companyId),
                    equipment.id,
                    requestEquipmentId,
                  ),
                ),
                map((result): EquipmentMutationResult => ({
                  ...result,
                  action: status === 'ACTIVO' ? 'activated' : 'inactivated',
                  message:
                    status === 'ACTIVO'
                      ? `El equipo ${result.equipment?.nombreEquipo ?? equipment.nombreEquipo} fue activado.`
                      : `El equipo ${result.equipment?.nombreEquipo ?? equipment.nombreEquipo} fue inactivado.`,
                  auditDraft: this.buildAuditDraft(
                    status === 'ACTIVO' ? 'activate' : 'deactivate',
                    result.equipment ?? { ...equipment, estado: status },
                    status === 'ACTIVO'
                      ? `Activacion del equipo ${equipment.nombreEquipo}.`
                      : `Inactivacion del equipo ${equipment.nombreEquipo}.`,
                    this.sanitizeAuditPayload(equipment),
                    this.sanitizeAuditPayload(result.equipment ?? { ...equipment, estado: status }),
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
    equipmentId: string,
    response: unknown,
  ): EquipmentMutationResult {
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const equipment = mapBackendEquipmentToEquipment(
        response as BackendEquipmentDto,
        companyId,
        this.resolveCompanyName(companyId),
      );
      const action: EquipmentMutationAction =
        equipment.estado === 'INACTIVO' ? 'inactivated' : 'deleted';

      return {
        action,
        equipment: action === 'deleted' ? null : equipment,
        message:
          action === 'inactivated'
            ? 'El backend reporto que el equipo fue inactivado por dependencias operativas.'
            : `El equipo ${equipment.nombreEquipo} fue eliminado correctamente.`,
        auditDraft: this.buildAuditDraft(
          action === 'inactivated' ? 'deactivate' : 'delete',
          equipment,
          action === 'inactivated'
            ? `Inactivacion del equipo ${equipment.nombreEquipo} reportada por backend.`
            : `Eliminacion del equipo ${equipment.nombreEquipo}.`,
          null,
          action === 'deleted' ? null : this.sanitizeAuditPayload(equipment),
        ),
      };
    }

    const auditEquipment = this.buildDeletedEquipment(companyId, equipmentId);

    return {
      action: 'deleted',
      equipment: null,
      message: 'El equipo fue eliminado correctamente.',
      auditDraft: this.buildAuditDraft('delete', auditEquipment, `Eliminacion del equipo ${equipmentId}.`, null, null),
    };
  }

  private resolveEquipmentRequestId(companyId: string, equipmentId: string): Observable<string> {
    return this.http
      .get<unknown>(withTrailingSlash(this.baseUrl), {
        params: buildMasterListParams(this.resolveRequestCompanyId(companyId)),
      })
      .pipe(
        map((response) => {
          const equipment = extractArrayPayload<BackendEquipmentDto>(response).find((candidate) =>
            this.matchesEquipmentReference(candidate, equipmentId),
          );

          return (
            resolveNullableText(equipment?.id, equipment?.equipo_id, equipment?.equipmentId, equipment?.id_equipo, equipment?.idEquipo) ??
            equipmentId
          );
        }),
      );
  }

  private matchesEquipmentReference(equipment: BackendEquipmentDto, equipmentId: string): boolean {
    const normalizedEquipmentId = equipmentId.trim();
    const candidates = [
      resolveNullableText(equipment.id),
      resolveNullableText(equipment.equipo_id),
      resolveNullableText(equipment.equipmentId),
      resolveNullableText(equipment.id_equipo),
      resolveNullableText(equipment.idEquipo),
    ];

    return candidates.includes(normalizedEquipmentId);
  }

  private normalizeFilters(filters: EquipmentFilters, companyId: string): Required<EquipmentFilters> {
    return {
      ...DEFAULT_EQUIPMENT_FILTERS,
      ...filters,
      empresaId: filters.empresaId ?? companyId,
      estado: filters.estado ?? 'TODOS',
      search: filters.search?.trim() ?? '',
      tipoEquipo: filters.tipoEquipo ?? null,
      empresaFabricante: filters.empresaFabricante ?? null,
      ubicacionOperativa: filters.ubicacionOperativa ?? null,
      page: filters.page ?? DEFAULT_EQUIPMENT_FILTERS.page,
      pageSize: filters.pageSize ?? DEFAULT_EQUIPMENT_FILTERS.pageSize,
    };
  }

  private matchesFilters(equipment: Equipment, filters: Required<EquipmentFilters>): boolean {
    const normalizedSearch = normalizeText(filters.search);
    const matchesSearch =
      !normalizedSearch ||
      [
        equipment.idEquipo,
        equipment.nombreEquipo,
        equipment.tipoEquipo ?? '',
        equipment.empresaFabricante,
        equipment.ubicacionOperativa ?? '',
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    const matchesStatus = filters.estado === 'TODOS' || equipment.estado === filters.estado;
    const matchesType = !filters.tipoEquipo || equipment.tipoEquipo === filters.tipoEquipo;
    const matchesManufacturer =
      !filters.empresaFabricante || equipment.empresaFabricante === filters.empresaFabricante;
    const matchesLocation =
      !filters.ubicacionOperativa || equipment.ubicacionOperativa === filters.ubicacionOperativa;

    return matchesSearch && matchesStatus && matchesType && matchesManufacturer && matchesLocation;
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
    action: Extract<EquipmentMutationAction, 'created' | 'updated'>,
    equipment: Equipment,
  ): EquipmentMutationResult {
    return {
      action,
      equipment,
      message:
        action === 'created'
          ? `El equipo ${equipment.nombreEquipo} fue creado correctamente.`
          : `El equipo ${equipment.nombreEquipo} fue actualizado correctamente.`,
      auditDraft: this.buildAuditDraft(
        action === 'created' ? 'create' : 'edit',
        equipment,
        action === 'created'
          ? `Creacion del equipo ${equipment.nombreEquipo}.`
          : `Actualizacion del equipo ${equipment.nombreEquipo}.`,
        null,
        this.sanitizeAuditPayload(equipment),
      ),
    };
  }

  private buildAuditDraft(
    action: EquipmentAuditDraft['action'],
    equipment: Equipment,
    summary: string,
    beforePayload: Record<string, unknown> | null,
    afterPayload: Record<string, unknown> | null,
  ): EquipmentAuditDraft {
    return {
      module: 'equipos',
      action,
      companyId: equipment.empresaId,
      companyName: equipment.empresaNombre ?? 'Empresa activa',
      entityId: equipment.id,
      entityName: equipment.nombreEquipo,
      summary,
      occurredAt: new Date().toISOString(),
      beforePayload,
      afterPayload,
    };
  }

  private sanitizeAuditPayload(equipment: Equipment): Record<string, unknown> {
    return {
      id: equipment.id,
      empresaId: equipment.empresaId,
      idEquipo: equipment.idEquipo,
      nombreEquipo: equipment.nombreEquipo,
      capacidad: equipment.capacidad,
      unidadCapacidad: equipment.unidadCapacidad,
      diametro: equipment.diametro ?? null,
      altura: equipment.altura ?? null,
      empresaFabricante: equipment.empresaFabricante,
      direccionFabricante: equipment.direccionFabricante ?? null,
      correoFabricante: equipment.correoFabricante ?? null,
      tipoEquipo: equipment.tipoEquipo ?? null,
      ubicacionOperativa: equipment.ubicacionOperativa ?? null,
      estado: equipment.estado,
      dependenciasActivas: equipment.tieneDependenciasActivas,
    };
  }

  private buildDeletedEquipment(companyId: string, equipmentId: string): Equipment {
    return {
      id: equipmentId,
      empresaId: companyId,
      empresaNombre: this.resolveCompanyName(companyId),
      idEquipo: equipmentId,
      nombreEquipo: 'Equipo eliminado',
      capacidad: 0,
      unidadCapacidad: '',
      empresaFabricante: '',
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
      fallbackEnabled: environment.enableEquipmentsAdministrationFallback,
      context,
      permissionMessage: 'No tienes permisos para operar equipos en la empresa activa.',
    });
  }
}
