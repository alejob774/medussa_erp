import { Observable } from 'rxjs';
import { EquipmentFilters } from '../models/equipment-filters.model';
import { SaveEquipmentPayload } from '../models/equipment-form.model';
import { Equipment, EquipmentCatalogs, EquipmentStatus } from '../models/equipment.model';
import { EquipmentListResponse, EquipmentMutationResult } from '../models/equipment-response.model';

export interface EquipmentsRepository {
  getCatalogs(companyId: string): Observable<EquipmentCatalogs>;
  listEquipments(companyId: string, filters: EquipmentFilters): Observable<EquipmentListResponse>;
  getEquipment(companyId: string, equipmentId: string): Observable<Equipment>;
  saveEquipment(
    companyId: string,
    payload: SaveEquipmentPayload,
    equipmentId?: string,
  ): Observable<EquipmentMutationResult>;
  deleteEquipment(companyId: string, equipmentId: string): Observable<EquipmentMutationResult>;
  updateEquipmentStatus(
    companyId: string,
    equipmentId: string,
    status: EquipmentStatus,
  ): Observable<EquipmentMutationResult>;
}
