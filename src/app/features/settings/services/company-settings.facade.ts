import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MOCK_COMPANY_GENERAL_SETTINGS } from '../mocks/company-general-settings.mock';
import {
  CompanyGeneralSettings,
  UpdateCompanySettingsPayload,
} from '../models/company-general-settings.model';

@Injectable({
  providedIn: 'root',
})
export class CompanySettingsFacadeService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'medussa.erp.mock.company-settings';
  private readonly baseUrl = `${environment.apiUrl}/companies`;
  private readonly useMock = environment.useCompanySettingsMock ?? true;

  getCompanySettings(companyId: string): Observable<CompanyGeneralSettings> {
    if (!companyId) {
      return throwError(() => new Error('Company id is required.'));
    }

    if (this.useMock) {
      return of(this.readMockStore()[companyId] ?? this.buildDefaultSettings(companyId)).pipe(
        delay(350),
      );
    }

    return this.http.get<CompanyGeneralSettings>(
      `${this.baseUrl}/${companyId}/settings/general`,
    );
  }

  updateCompanySettings(
    companyId: string,
    payload: UpdateCompanySettingsPayload,
  ): Observable<CompanyGeneralSettings> {
    if (!companyId) {
      return throwError(() => new Error('Company id is required.'));
    }

    if (this.useMock) {
      const nextSettings: CompanyGeneralSettings = {
        ...this.readMockStore()[companyId],
        ...payload,
        companyId,
        updatedAt: new Date().toISOString(),
      };

      const nextStore = {
        ...this.readMockStore(),
        [companyId]: nextSettings,
      };

      this.writeMockStore(nextStore);

      return of(nextSettings).pipe(delay(500));
    }

    return this.http.put<CompanyGeneralSettings>(
      `${this.baseUrl}/${companyId}/settings/general`,
      payload,
    );
  }

  private readMockStore(): Record<string, CompanyGeneralSettings> {
    if (typeof window === 'undefined') {
      return { ...MOCK_COMPANY_GENERAL_SETTINGS };
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      this.writeMockStore(MOCK_COMPANY_GENERAL_SETTINGS);
      return { ...MOCK_COMPANY_GENERAL_SETTINGS };
    }

    try {
      return JSON.parse(raw) as Record<string, CompanyGeneralSettings>;
    } catch {
      this.writeMockStore(MOCK_COMPANY_GENERAL_SETTINGS);
      return { ...MOCK_COMPANY_GENERAL_SETTINGS };
    }
  }

  private writeMockStore(store: Record<string, CompanyGeneralSettings>): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private buildDefaultSettings(companyId: string): CompanyGeneralSettings {
    return {
      companyId,
      nombre_empresa: 'Nueva empresa',
      nit: '',
      direccion: '',
      ciudad: '',
      pais: 'Colombia',
      moneda: 'COP',
      zona_horaria: 'America/Bogota',
      telefono: '',
      logo: null,
    };
  }
}
