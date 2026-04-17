import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { EquipmentsFacadeService } from '../../../application/facade/equipments.facade';
import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from '../../../domain/models/equipment-filters.model';
import { EquipmentFormMode, SaveEquipmentPayload } from '../../../domain/models/equipment-form.model';
import {
  EMPTY_EQUIPMENT_CATALOGS,
  Equipment,
  EquipmentCatalogs,
  EquipmentStatus,
} from '../../../domain/models/equipment.model';
import {
  EMPTY_EQUIPMENT_LIST_RESPONSE,
  EquipmentListResponse,
} from '../../../domain/models/equipment-response.model';
import { EquipmentFormComponent } from '../../components/equipment-form/equipment-form.component';
import { EquipmentsListComponent } from '../../components/equipments-list/equipments-list.component';

@Component({
  selector: 'app-equipments-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    EquipmentFormComponent,
    EquipmentsListComponent,
  ],
  templateUrl: './equipments-page.component.html',
  styleUrl: './equipments-page.component.scss',
})
export class EquipmentsPageComponent {
  private readonly equipmentsFacade = inject(EquipmentsFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: EquipmentCatalogs = EMPTY_EQUIPMENT_CATALOGS;
  listResponse: EquipmentListResponse = EMPTY_EQUIPMENT_LIST_RESPONSE;
  validationEquipments: Equipment[] = [];
  selectedEquipment: Equipment | null = null;
  formMode: EquipmentFormMode = 'create';
  isFormVisible = false;
  filters: EquipmentFilters = { ...DEFAULT_EQUIPMENT_FILTERS };
  loadingCatalogs = true;
  loadingEquipments = true;
  loadingSelection = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.equipmentsFacade.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) return;

        this.activeCompanyId = company.id;
        this.activeCompanyName = company.name;
        this.filters = {
          ...DEFAULT_EQUIPMENT_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationEquipments();
        this.loadEquipments(this.filters);
      });
  }

  get totalEquipments(): number {
    return this.validationEquipments.length;
  }

  get activeEquipments(): number {
    return this.validationEquipments.filter((equipment) => equipment.estado === 'ACTIVO').length;
  }

  get inactiveEquipments(): number {
    return this.validationEquipments.filter((equipment) => equipment.estado === 'INACTIVO').length;
  }

  get distributionByType(): string {
    const activeTypes = this.validationEquipments
      .map((equipment) => equipment.tipoEquipo?.trim())
      .filter((type): type is string => !!type);
    const counts = new Map<string, number>();

    activeTypes.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}: ${count}`)
      .join(' · ');
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) return;
    this.resetSelection(true, true);
  }

  handleFiltersChange(filters: EquipmentFilters): void {
    this.loadEquipments({ ...this.filters, ...filters, empresaId: this.activeCompanyId });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadEquipments({ ...this.filters, page: event.page, pageSize: event.pageSize, empresaId: this.activeCompanyId });
  }

  handleSelectEquipment(equipment: Equipment): void {
    if (!this.confirmDiscard()) return;
    this.loadEquipment(equipment.id, 'view');
  }

  handleEditEquipment(equipment: Equipment): void {
    if (!this.confirmDiscard()) return;
    this.loadEquipment(equipment.id, 'edit');
  }

  enableEditMode(): void {
    if (this.selectedEquipment) this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedEquipment) {
      this.formMode = 'view';
      this.isFormVisible = true;
      return;
    }

    this.resetSelection();
  }

  closeForm(): void {
    if (!this.confirmDiscard()) return;
    this.resetSelection();
  }

  saveEquipment(payload: SaveEquipmentPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.equipmentsFacade
      .saveEquipment(payload, this.formMode === 'edit' ? this.selectedEquipment?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedEquipment = result.equipment;
          this.formMode = result.equipment ? 'view' : 'create';
          this.isFormVisible = false;
          this.loadValidationEquipments();
          this.loadEquipments(this.buildPostSaveFilters(result.equipment, result.action), false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el equipo.');
        },
      });
  }

  deleteEquipment(equipment: Equipment): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        equipment.tieneDependenciasActivas
          ? 'El equipo tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el equipo ${equipment.nombreEquipo}?`,
      );

      if (!confirmed) return;
    }

    this.deletingId = equipment.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.equipmentsFacade
      .deleteEquipment(equipment.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedEquipment?.id === equipment.id) {
            if (result.equipment) {
              this.selectedEquipment = result.equipment;
              this.formMode = 'view';
              this.isFormVisible = false;
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationEquipments();
          this.loadEquipments(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del equipo.');
        },
      });
  }

  toggleEquipmentStatus(equipment: Equipment): void {
    const nextStatus: EquipmentStatus = equipment.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = equipment.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.equipmentsFacade
      .updateEquipmentStatus(equipment.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          if (this.selectedEquipment?.id === equipment.id && result.equipment) {
            this.selectedEquipment = result.equipment;
          }
          this.loadValidationEquipments();
          this.loadEquipments(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del equipo.');
        },
      });
  }

  retryEquipments(): void {
    this.loadEquipments(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.equipmentsFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_EQUIPMENT_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los catálogos de equipos.');
        },
      });
  }

  private loadEquipments(filters: EquipmentFilters, clearMessages = true): void {
    this.loadingEquipments = true;
    this.filters = { ...DEFAULT_EQUIPMENT_FILTERS, ...filters, empresaId: this.activeCompanyId };

    if (clearMessages) this.errorMessage = '';

    this.equipmentsFacade
      .listEquipments(this.filters)
      .pipe(finalize(() => (this.loadingEquipments = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;
          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadEquipments({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = { ...EMPTY_EQUIPMENT_LIST_RESPONSE, filters: this.filters };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los equipos.');
        },
      });
  }

  private loadValidationEquipments(): void {
    this.equipmentsFacade
      .listEquipments({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        search: '',
        tipoEquipo: null,
        empresaFabricante: null,
        ubicacionOperativa: null,
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationEquipments = response.items;
        },
        error: () => {
          this.validationEquipments = this.listResponse.items;
        },
      });
  }

  private loadEquipment(equipmentId: string, mode: EquipmentFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.equipmentsFacade
      .getEquipment(equipmentId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (equipment) => {
          this.selectedEquipment = equipment;
          this.formMode = mode;
          this.isFormVisible = true;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el equipo seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true, keepFormVisible = false): void {
    this.selectedEquipment = null;
    this.formMode = 'create';
    this.loadingSelection = false;
    this.isFormVisible = keepFormVisible;
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private buildPostSaveFilters(
    equipment: Equipment | null,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'inactivated',
  ): EquipmentFilters {
    if (!equipment || action !== 'created') {
      return { ...this.filters, page: 0 };
    }

    return {
      ...DEFAULT_EQUIPMENT_FILTERS,
      empresaId: this.activeCompanyId,
      search: equipment.idEquipo,
      page: 0,
    };
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de equipos. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
