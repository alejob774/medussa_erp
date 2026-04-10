import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { environment } from '../../../../../environments/environment';
import { ClientFilters } from '../../domain/models/client-filters.model';
import { SaveClientPayload } from '../../domain/models/client-form.model';
import { Client, ClientCatalogs, ClientStatus } from '../../domain/models/client.model';
import { ClientListResponse, ClientMutationResult } from '../../domain/models/client-response.model';
import { ClientsRepository } from '../../domain/repositories/client.repository';
import { ClientApiRepository } from '../../infrastructure/repositories/client-api.repository';
import { ClientMockRepository } from '../../infrastructure/repositories/client-mock.repository';

@Injectable({
  providedIn: 'root',
})
export class ClientsFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(ClientMockRepository);
  private readonly apiRepository = inject(ClientApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  getCatalogs(): Observable<ClientCatalogs> {
    return this.withActiveCompany((companyId) => this.repository.getCatalogs(companyId));
  }

  listClients(filters: ClientFilters): Observable<ClientListResponse> {
    return this.withActiveCompany((companyId) => this.repository.listClients(companyId, filters));
  }

  getClient(clientId: string): Observable<Client> {
    return this.withActiveCompany((companyId) => this.repository.getClient(companyId, clientId));
  }

  saveClient(payload: SaveClientPayload, clientId?: string): Observable<ClientMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.saveClient(companyId, payload, clientId));
  }

  deleteClient(clientId: string): Observable<ClientMutationResult> {
    return this.withActiveCompany((companyId) => this.repository.deleteClient(companyId, clientId));
  }

  updateClientStatus(
    clientId: string,
    status: ClientStatus,
  ): Observable<ClientMutationResult> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateClientStatus(companyId, clientId, status),
    );
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  getActiveCompanyName(): string {
    return this.companyContextService.getActiveCompany()?.name ?? 'Empresa activa';
  }

  private withActiveCompany<T>(
    operation: (companyId: string) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): ClientsRepository {
    return environment.useClientsAdministrationMock
      ? this.mockRepository
      : this.apiRepository;
  }
}