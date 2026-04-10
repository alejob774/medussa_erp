import { ClientStatus } from './client.model';

export type ClientFormMode = 'create' | 'edit' | 'view';

export interface SaveClientPayload {
  empresaId: string;
  empresaNombre: string;
  idCliente: string;
  tipoIdentificacion: string;
  nombre: string;
  nombreComercial?: string | null;
  ciudadId: string;
  ciudadNombre?: string;
  direccion: string;
  telefono?: string | null;
  email?: string | null;
  estado: ClientStatus;
}