import { DriverAssignedRoute, DriverStatus } from './driver.model';

export type DriverFormMode = 'create' | 'edit' | 'view';

export interface SaveDriverPayload {
  empresaId: string;
  empresaNombre: string;
  idConductor: string;
  nombreConductor: string;
  tipoDocumento: string;
  numeroDocumento?: string | null;
  ciudadId?: string | null;
  ciudadNombre?: string | null;
  direccion?: string | null;
  celular?: string | null;
  email?: string | null;
  numeroLicencia?: string | null;
  categoriaLicencia?: string | null;
  vencimientoLicencia?: string | null;
  rutasAsignadas: DriverAssignedRoute[];
  estado: DriverStatus;
}