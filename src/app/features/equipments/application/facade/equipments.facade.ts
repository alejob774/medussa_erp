import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { EquipmentFilters } from '../../domain/models/equipment-filters.model';
import { SaveEquipmentPayload } from '../../domain/models/equipment-form.model';
import { Equipment, EquipmentCatalogs, EquipmentStatus } from '../../domain/models/equipment.model';
import { EquipmentListResponse, EquipmentMutationResult } from '../../domain/models/equipment-response.model';
import { EquipmentsRepository } from '../../domain/repositories/equipment.repository';
import { EquipmentApiRepository } from '../../infrastructure/repositories/equipment-api.repository';
import { EquipmentMockRepository } from '../../infrastructure/repositories/equipment-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class EquipmentsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(EquipmentMockRepository);
  private readonly apiRepository = inject(EquipmentApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<EquipmentCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listEquipments(filters: EquipmentFilters): Observable<EquipmentListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listEquipments(companyId, filters));
  }

  getEquipment(equipmentId: string): Observable<Equipment> {
    return this.withActiveCompany((companyId) => this.repository.getEquipment(companyId, equipmentId));
  }

  saveEquipment(
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): Observable<EquipmentMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveEquipment(companyId, payload, equipmentId),
    );
  }

  deleteEquipment(equipmentId: string): Observable<EquipmentMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteEquipment(companyId, equipmentId));
  }

  updateEquipmentStatus(
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateEquipmentStatus(companyId, equipmentId, status),
    );
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(operation: (companyId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): EquipmentsRepository {
    return environment.useEquipmentsAdministrationMock ? this.mockRepository : this.apiRepository;
  }
}
