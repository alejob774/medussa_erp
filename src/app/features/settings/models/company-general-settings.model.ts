export interface CompanyGeneralSettings {
  companyId: string;
  nombre_empresa: string;
  nit: string;
  direccion: string;
  ciudad: string;
  pais: string;
  moneda: string;
  zona_horaria: string;
  telefono?: string | null;
  logo?: string | null;
  updatedAt?: string;
}

export type UpdateCompanySettingsPayload = Omit<
  CompanyGeneralSettings,
  'companyId' | 'updatedAt'
>;
