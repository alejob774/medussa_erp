import { DowntimeCause } from '../../domain/models/downtime-cause.model';
import { OeeShift } from '../../domain/models/oee-shift.model';

export const OEE_TARGET = 0.85;

export const DEFAULT_PLANTS = [
  'Planta principal El Arbolito',
  'Planta lacteos frios',
  'Planta UHT',
] as const;

export const DEFAULT_LINES = [
  {
    planta: 'Planta principal El Arbolito',
    nombre: 'Linea Empaque',
  },
  {
    planta: 'Planta lacteos frios',
    nombre: 'Linea Yogurt',
  },
  {
    planta: 'Planta lacteos frios',
    nombre: 'Linea Quesos',
  },
  {
    planta: 'Planta UHT',
    nombre: 'Linea UHT',
  },
] as const;

export const DEFAULT_SHIFTS: OeeShift[] = [
  { code: 'MANANA', label: 'Manana', startHour: '06:00', endHour: '14:00' },
  { code: 'TARDE', label: 'Tarde', startHour: '14:00', endHour: '22:00' },
  { code: 'NOCHE', label: 'Noche', startHour: '22:00', endHour: '06:00' },
];

export const DEFAULT_DOWNTIME_CAUSES: DowntimeCause[] = [
  { code: 'FALTA_MATERIAL', label: 'Falta material', critical: true, suggestedSeverity: 'ALTA' },
  { code: 'LIMPIEZA', label: 'Limpieza', critical: false, suggestedSeverity: 'BAJA' },
  { code: 'CAMBIO_FORMATO', label: 'Cambio formato', critical: false, suggestedSeverity: 'MEDIA' },
  { code: 'FALLA_MECANICA', label: 'Falla mecanica', critical: true, suggestedSeverity: 'ALTA' },
  { code: 'AJUSTE_CALIDAD', label: 'Ajuste calidad', critical: false, suggestedSeverity: 'MEDIA' },
  { code: 'ESPERA_OPERARIO', label: 'Espera operario', critical: false, suggestedSeverity: 'MEDIA' },
  {
    code: 'MANTENIMIENTO_NO_PROGRAMADO',
    label: 'Mantenimiento no programado',
    critical: true,
    suggestedSeverity: 'ALTA',
  },
];

export const DEFAULT_OPERATORS = [
  'Maria Alejandra Ruiz',
  'Carlos Benitez',
  'Diana Contreras',
  'Jose Salgado',
  'Luisa Fernandez',
];

export const DEFAULT_SUPERVISORS = [
  'Jefe Planta Lacteos',
  'Supervisor UHT',
  'Supervisor Empaque',
  'Coordinador Produccion',
];
