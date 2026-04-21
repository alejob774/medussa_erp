export type OeeShiftCode = 'MANANA' | 'TARDE' | 'NOCHE';

export interface OeeShift {
  code: OeeShiftCode;
  label: string;
  startHour: string;
  endHour: string;
}
