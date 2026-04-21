import { QualityNonConformityStatus } from './quality-status.model';

export interface QualityNonConformity {
  id: string;
  empresaId: string;
  loteId: string;
  inspeccionId: string;
  motivo: string;
  accionCorrectiva: string;
  responsable: string;
  fechaRegistro: string;
  fechaCierre: string | null;
  estado: QualityNonConformityStatus;
}
