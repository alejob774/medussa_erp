import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthSessionService } from '../../../auth/services/auth-session.service';
import { EquipmentFilters } from '../../domain/models/equipment-filters.model';
import { SaveEquipmentPayload } from '../../domain/models/equipment-form.model';
import { Equipment, EquipmentCatalogs, EquipmentStatus } from '../../domain/models/equipment.model';
import { EquipmentListResponse, EquipmentMutationResult } from '../../domain/models/equipment-response.model';
import { EquipmentsRepository } from '../../domain/repositories/equipment.repository';
import { EquipmentMockRepository } from './equipment-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class EquipmentApiRepository implements EquipmentsRepository {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(EquipmentMockRepository);
  private readonly baseUrl = `${environment.apiUrl}/equipos`;

  getCatalogs(companyId: string): Observable<EquipmentCatalogs> {
    void this.http;
    void this.authSessionService;
    void this.baseUrl;
    return this.mockRepository.getCatalogs(companyId);
  }

  listEquipments(companyId: string, filters: EquipmentFilters): Observable<EquipmentListResponse> {
    return this.mockRepository.listEquipments(companyId, filters);
  }

  getEquipment(companyId: string, equipmentId: string): Observable<Equipment> {
    return this.mockRepository.getEquipment(companyId, equipmentId);
  }

  saveEquipment(
    companyId: string,
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): Observable<EquipmentMutationResult> {
    return this.mockRepository.saveEquipment(companyId, payload, equipmentId);
  }

  deleteEquipment(companyId: string, equipmentId: string): Observable<EquipmentMutationResult> {
    return this.mockRepository.deleteEquipment(companyId, equipmentId);
  }

  updateEquipmentStatus(
    companyId: string,
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult> {
    return this.mockRepository.updateEquipmentStatus(companyId, equipmentId, status);
  }
}
