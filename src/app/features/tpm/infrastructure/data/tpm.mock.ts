import { TpmMaintenanceType } from '../../domain/models/tpm-plan.model';
import { TpmSparePartCatalogItem } from '../../domain/models/tpm-spare-part.model';

export const TPM_TECHNICIANS = [
  'Tecnico Mantenimiento 1',
  'Tecnico Mantenimiento 2',
  'Supervisor TPM',
  'Calidad / Sanitario',
];

export const TPM_SPARE_PARTS: TpmSparePartCatalogItem[] = [
  { codigo: 'REP-01', descripcion: 'Rodamiento', costoUnitario: 180000, stockDisponible: 6, stockMinimo: 2 },
  { codigo: 'REP-02', descripcion: 'Banda', costoUnitario: 240000, stockDisponible: 4, stockMinimo: 1 },
  { codigo: 'REP-03', descripcion: 'Sensor temperatura', costoUnitario: 320000, stockDisponible: 2, stockMinimo: 2 },
  { codigo: 'REP-04', descripcion: 'Sello mecanico', costoUnitario: 410000, stockDisponible: 3, stockMinimo: 1 },
  { codigo: 'REP-05', descripcion: 'Lubricante grado alimenticio', costoUnitario: 90000, stockDisponible: 5, stockMinimo: 2 },
];

export const TPM_TYPE_LABELS: Record<TpmMaintenanceType, string> = {
  PREVENTIVO: 'Preventivo',
  CORRECTIVO: 'Correctivo',
  PREDICTIVO: 'Predictivo',
  SANITARIO: 'Sanitario',
  CALIBRACION: 'Calibracion',
};
