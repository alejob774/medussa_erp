import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { PendingChangesService } from '../../../../../core/forms/services/pending-changes.service';
import { ClientsFacadeService } from '../../../application/facade/clients.facade';
import { DEFAULT_CLIENT_FILTERS, ClientFilters } from '../../../domain/models/client-filters.model';
import { SaveClientPayload, ClientFormMode } from '../../../domain/models/client-form.model';
import { EMPTY_CLIENT_CATALOGS, Client, ClientCatalogs, ClientStatus } from '../../../domain/models/client.model';
import { EMPTY_CLIENT_LIST_RESPONSE, ClientListResponse } from '../../../domain/models/client-response.model';
import { ClientFormComponent } from '../../components/client-form/client-form.component';
import { ClientsListComponent } from '../../components/clients-list/clients-list.component';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ClientFormComponent,
    ClientsListComponent,
  ],
  templateUrl: './clients-page.component.html',
  styleUrl: './clients-page.component.scss',
})
export class ClientsPageComponent {
  private readonly clientsFacade = inject(ClientsFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  catalogs: ClientCatalogs = EMPTY_CLIENT_CATALOGS;
  listResponse: ClientListResponse = EMPTY_CLIENT_LIST_RESPONSE;
  validationClients: Client[] = [];
  selectedClient: Client | null = null;
  formMode: ClientFormMode = 'create';
  filters: ClientFilters = { ...DEFAULT_CLIENT_FILTERS };
  loadingCatalogs = true;
  loadingClients = true;
  loadingSelection = false;
  saving = false;
  deletingId: string | null = null;
  statusUpdatingId: string | null = null;
  errorMessage = '';
  successMessage = '';
  activeCompanyId = '';
  activeCompanyName = '';

  constructor() {
    this.clientsFacade.activeCompany$
      .pipe(
        map((company) => company ?? null),
        distinctUntilChanged((previous, current) => previous?.id === current?.id),
        takeUntilDestroyed(),
      )
      .subscribe((company) => {
        if (!company) {
          return;
        }

        this.activeCompanyId = company.id;
        this.activeCompanyName = company.name;
        this.filters = {
          ...DEFAULT_CLIENT_FILTERS,
          empresaId: company.id,
        };
        this.resetSelection(false);
        this.loadCatalogs();
        this.loadValidationClients();
        this.loadClients(this.filters);
      });
  }

  get totalClients(): number {
    return this.listResponse.total;
  }

  get activeClients(): number {
    return this.listResponse.items.filter((client) => client.estado === 'ACTIVO').length;
  }

  get inactiveClients(): number {
    return this.listResponse.items.filter((client) => client.estado === 'INACTIVO').length;
  }

  startCreateMode(): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.resetSelection();
  }

  handleFiltersChange(filters: ClientFilters): void {
    this.loadClients({
      ...this.filters,
      ...filters,
      empresaId: this.activeCompanyId,
    });
  }

  handlePageChange(event: { page: number; pageSize: number }): void {
    this.loadClients({
      ...this.filters,
      page: event.page,
      pageSize: event.pageSize,
      empresaId: this.activeCompanyId,
    });
  }

  handleSelectClient(client: Client): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadClient(client.id, 'view');
  }

  handleEditClient(client: Client): void {
    if (!this.confirmDiscard()) {
      return;
    }

    this.loadClient(client.id, 'edit');
  }

  enableEditMode(): void {
    if (!this.selectedClient) {
      return;
    }

    this.formMode = 'edit';
  }

  cancelEdit(): void {
    if (this.selectedClient) {
      this.formMode = 'view';
      return;
    }

    this.resetSelection();
  }

  saveClient(payload: SaveClientPayload): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.clientsFacade
      .saveClient(payload, this.formMode === 'edit' ? this.selectedClient?.id : undefined)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
          this.selectedClient = result.client;
          this.formMode = result.client ? 'view' : 'create';
          this.loadValidationClients();
          this.loadClients(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible guardar el cliente.');
        },
      });
  }

  deleteClient(client: Client): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        client.tieneDependenciasActivas
          ? 'El cliente tiene dependencias activas y se inactivará en lugar de eliminarse. ¿Deseas continuar?'
          : `¿Deseas eliminar el cliente ${client.nombre}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    this.deletingId = client.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.clientsFacade
      .deleteClient(client.id)
      .pipe(finalize(() => (this.deletingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedClient?.id === client.id) {
            if (result.client) {
              this.selectedClient = result.client;
              this.formMode = 'view';
            } else {
              this.resetSelection(false);
            }
          }

          this.loadValidationClients();
          this.loadClients(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible procesar la eliminación del cliente.');
        },
      });
  }

  toggleClientStatus(client: Client): void {
    const nextStatus: ClientStatus = client.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    this.statusUpdatingId = client.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.clientsFacade
      .updateClientStatus(client.id, nextStatus)
      .pipe(finalize(() => (this.statusUpdatingId = null)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;

          if (this.selectedClient?.id === client.id && result.client) {
            this.selectedClient = result.client;
          }

          this.loadValidationClients();
          this.loadClients(this.filters, false);
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible actualizar el estado del cliente.');
        },
      });
  }

  retryClients(): void {
    this.loadClients(this.filters);
  }

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.clientsFacade
      .getCatalogs()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (catalogs) => {
          this.catalogs = catalogs;
        },
        error: (error: unknown) => {
          this.catalogs = EMPTY_CLIENT_CATALOGS;
          this.errorMessage = this.resolveErrorMessage(
            error,
            'No fue posible cargar los catálogos de clientes.',
          );
        },
      });
  }

  private loadClients(filters: ClientFilters, clearMessages = true): void {
    this.loadingClients = true;
    this.filters = {
      ...DEFAULT_CLIENT_FILTERS,
      ...filters,
      empresaId: this.activeCompanyId,
    };

    if (clearMessages) {
      this.errorMessage = '';
    }

    this.clientsFacade
      .listClients(this.filters)
      .pipe(finalize(() => (this.loadingClients = false)))
      .subscribe({
        next: (response) => {
          this.listResponse = response;

          if (!response.items.length && (response.page ?? 0) > 0) {
            this.loadClients({ ...this.filters, page: 0 }, false);
          }
        },
        error: (error: unknown) => {
          this.listResponse = {
            ...EMPTY_CLIENT_LIST_RESPONSE,
            filters: this.filters,
          };
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar los clientes.');
        },
      });
  }

  private loadValidationClients(): void {
    this.clientsFacade
      .listClients({
        empresaId: this.activeCompanyId,
        estado: 'TODOS',
        ciudadId: null,
        search: '',
        page: 0,
        pageSize: 1000,
      })
      .subscribe({
        next: (response) => {
          this.validationClients = response.items;
        },
        error: () => {
          this.validationClients = this.listResponse.items;
        },
      });
  }

  private loadClient(clientId: string, mode: ClientFormMode): void {
    this.loadingSelection = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.clientsFacade
      .getClient(clientId)
      .pipe(finalize(() => (this.loadingSelection = false)))
      .subscribe({
        next: (client) => {
          this.selectedClient = client;
          this.formMode = mode;
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error, 'No fue posible cargar el cliente seleccionado.');
        },
      });
  }

  private resetSelection(clearMessages = true): void {
    this.selectedClient = null;
    this.formMode = 'create';
    this.loadingSelection = false;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private confirmDiscard(): boolean {
    return this.pendingChangesService.confirmDiscard(
      'Hay cambios sin guardar en el maestro de clientes. Si cambias de registro, se descartarán. ¿Deseas continuar?',
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}