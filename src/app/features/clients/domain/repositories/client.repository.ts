import { Observable } from 'rxjs';
import { ClientFilters } from '../models/client-filters.model';
import { SaveClientPayload } from '../models/client-form.model';
import { Client, ClientCatalogs, ClientStatus } from '../models/client.model';
import { ClientListResponse, ClientMutationResult } from '../models/client-response.model';

export interface ClientsRepository {
  getCatalogs(companyId: string): Observable<ClientCatalogs>;
  listClients(companyId: string, filters: ClientFilters): Observable<ClientListResponse>;
  getClient(companyId: string, clientId: string): Observable<Client>;
  saveClient(
    companyId: string,
    payload: SaveClientPayload,
    clientId?: string,
  ): Observable<ClientMutationResult>;
  deleteClient(companyId: string, clientId: string): Observable<ClientMutationResult>;
  updateClientStatus(
    companyId: string,
    clientId: string,
    status: ClientStatus,
  ): Observable<ClientMutationResult>;
}