import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { CompanyContextService } from '../../../../core/company/services/company-context.service';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import { CompanyLogoUploadComponent } from '../../components/company-logo-upload/company-logo-upload.component';
import {
  CompanyGeneralSettings,
  UpdateCompanySettingsPayload,
} from '../../models/company-general-settings.model';
import { CompanySettingsFacadeService } from '../../services/company-settings.facade';

@Component({
  selector: 'app-general-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    CompanyLogoUploadComponent,
  ],
  template: `
    @let activeCompany = (activeCompany$ | async);

    <section class="space-y-6">
      <header class="rounded-3xl bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
              <img src="assets/login/Logo1.png" alt="Medussa" class="h-10 w-auto object-contain" />
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
                Configuración
              </p>
              <h1 class="mt-2 text-3xl font-bold text-slate-900">Parámetros generales</h1>
              <p class="mt-2 max-w-2xl text-sm text-slate-500">
                Esta configuración siempre opera sobre la empresa activa y queda lista para
                conectarse a backend real.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Empresa activa
            </p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                [style.background]="activeCompany?.accentColor ?? '#0f172a'"
              ></span>
              <span class="font-semibold text-slate-800">{{ activeCompany?.name ?? 'Sin empresa seleccionada' }}</span>
            </div>
          </div>
        </div>
      </header>

      @if (loading) {
        <div class="flex min-h-[320px] items-center justify-center rounded-3xl bg-white shadow-sm">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="36"></mat-spinner>
            <p class="text-sm">Cargando parámetros de la empresa activa...</p>
          </div>
        </div>
      } @else {
        <form class="space-y-6" [formGroup]="form" (ngSubmit)="save()">
          @if (errorMessage) {
            <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ errorMessage }}
            </div>
          }

          @if (successMessage) {
            <div class="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {{ successMessage }}
            </div>
          }

          @if (form.dirty) {
            <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tienes cambios sin guardar. Si cambias de empresa o navegas fuera, se solicitará confirmación.
            </div>
          }

          <div class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section class="rounded-3xl bg-white p-6 shadow-sm">
              <div class="grid gap-4 md:grid-cols-2">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre empresa</mat-label>
                  <input matInput formControlName="nombre_empresa" />
                  @if (isInvalid('nombre_empresa')) {
                    <mat-error>{{ getErrorMessage('nombre_empresa') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>NIT</mat-label>
                  <input matInput formControlName="nit" />
                  @if (isInvalid('nit')) {
                    <mat-error>{{ getErrorMessage('nit') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="md:col-span-2">
                  <mat-label>Dirección</mat-label>
                  <textarea matInput rows="3" formControlName="direccion"></textarea>
                  @if (isInvalid('direccion')) {
                    <mat-error>{{ getErrorMessage('direccion') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Ciudad</mat-label>
                  <input matInput formControlName="ciudad" />
                  @if (isInvalid('ciudad')) {
                    <mat-error>{{ getErrorMessage('ciudad') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>País</mat-label>
                  <input matInput formControlName="pais" />
                  @if (isInvalid('pais')) {
                    <mat-error>{{ getErrorMessage('pais') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Moneda</mat-label>
                  <mat-select formControlName="moneda">
                    @for (currency of currencyOptions; track currency.value) {
                      <mat-option [value]="currency.value">{{ currency.label }}</mat-option>
                    }
                  </mat-select>
                  @if (isInvalid('moneda')) {
                    <mat-error>{{ getErrorMessage('moneda') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Zona horaria</mat-label>
                  <mat-select formControlName="zona_horaria">
                    @for (timezone of timezoneOptions; track timezone.value) {
                      <mat-option [value]="timezone.value">{{ timezone.label }}</mat-option>
                    }
                  </mat-select>
                  @if (isInvalid('zona_horaria')) {
                    <mat-error>{{ getErrorMessage('zona_horaria') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="md:col-span-2">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" />
                  <mat-hint>Opcional</mat-hint>
                  @if (isInvalid('telefono')) {
                    <mat-error>{{ getErrorMessage('telefono') }}</mat-error>
                  }
                </mat-form-field>
              </div>
            </section>

            <aside class="space-y-4">
              <section class="rounded-3xl bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-900">Logo y branding</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Placeholder preparado para preview local mientras se define el contrato de upload.
                </p>

                <div class="mt-4">
                  <app-company-logo-upload
                    [previewUrl]="form.controls.logo.value || null"
                    [companyName]="form.controls.nombre_empresa.value || activeCompany?.name || 'Empresa'"
                    (logoSelected)="onLogoSelected($event)"
                  ></app-company-logo-upload>
                </div>
              </section>

              <section class="rounded-3xl bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-slate-900">Estado</h2>
                <dl class="mt-4 space-y-3 text-sm text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <dt>Empresa activa</dt>
                    <dd class="font-medium text-slate-800">{{ activeCompany?.code ?? 'N/D' }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Modo</dt>
                    <dd class="font-medium text-slate-800">Edición directa</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt>Última carga</dt>
                    <dd class="font-medium text-slate-800">{{ lastLoadedAt || 'Ahora' }}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 rounded-3xl bg-white p-4 shadow-sm">
            <button mat-stroked-button type="button" (click)="cancel()" [disabled]="saving">
              Cancelar
            </button>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="saving || loading"
            >
              @if (!saving) {
                <span>Guardar</span>
              } @else {
                <span class="inline-flex items-center gap-2">
                  <mat-icon class="animate-spin">progress_activity</mat-icon>
                  Guardando...
                </span>
              }
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class GeneralSettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyContextService = inject(CompanyContextService);
  private readonly companySettingsFacade = inject(CompanySettingsFacadeService);
  private readonly pendingChangesService = inject(PendingChangesService);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  readonly currencyOptions = [
    { value: 'COP', label: 'COP · Peso colombiano' },
    { value: 'USD', label: 'USD · Dólar estadounidense' },
    { value: 'EUR', label: 'EUR · Euro' },
  ];

  readonly timezoneOptions = [
    { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
    { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
    { value: 'America/Lima', label: 'America/Lima (UTC-5)' },
  ];

  readonly form = this.fb.nonNullable.group({
    nombre_empresa: ['', [Validators.required, Validators.minLength(3)]],
    nit: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9.\-]{6,20}$/)]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    ciudad: ['', [Validators.required]],
    pais: ['', [Validators.required]],
    moneda: ['', [Validators.required]],
    zona_horaria: ['', [Validators.required]],
    telefono: ['', [Validators.pattern(/^[+0-9()\s-]{7,20}$/)]],
    logo: [''],
  });

  currentCompanyId: string | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  lastLoadedAt = '';

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en Parámetros generales. Si cambias de empresa o sales, se descartarán. ¿Deseas continuar?',
      );

      if (this.form.dirty) {
        this.successMessage = '';
      }
    });

    this.companyContextService.activeCompany$
      .pipe(takeUntilDestroyed())
      .subscribe((company) => {
        if (!company?.id) {
          return;
        }

        this.currentCompanyId = company.id;
        this.loadSettings(company.id);
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.currentCompanyId) {
      this.errorMessage = 'No hay una empresa activa disponible.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companySettingsFacade
      .updateCompanySettings(this.currentCompanyId, this.buildPayload())
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (settings) => {
          this.applySettingsToForm(settings);
          this.successMessage = 'Los parámetros generales se guardaron correctamente.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  cancel(): void {
    if (!this.currentCompanyId) {
      return;
    }

    if (!this.form.dirty) {
      this.loadSettings(this.currentCompanyId);
      return;
    }

    if (!this.pendingChangesService.confirmDiscard()) {
      return;
    }

    this.loadSettings(this.currentCompanyId);
  }

  onLogoSelected(logo: string | null): void {
    this.form.controls.logo.setValue(logo ?? '');
    this.form.controls.logo.markAsDirty();
    this.form.controls.logo.markAsTouched();
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'El valor es demasiado corto.';
    }

    if (control.hasError('pattern')) {
      if (controlName === 'telefono') {
        return 'Ingresa un teléfono válido.';
      }

      if (controlName === 'nit') {
        return 'Ingresa un NIT con formato válido.';
      }
    }

    return 'Revisa el valor ingresado.';
  }

  private loadSettings(companyId: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companySettingsFacade
      .getCompanySettings(companyId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (settings) => {
          this.applySettingsToForm(settings);
          this.lastLoadedAt = new Date().toLocaleTimeString();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private applySettingsToForm(settings: CompanyGeneralSettings): void {
    this.form.reset({
      nombre_empresa: settings.nombre_empresa ?? '',
      nit: settings.nit ?? '',
      direccion: settings.direccion ?? '',
      ciudad: settings.ciudad ?? '',
      pais: settings.pais ?? '',
      moneda: settings.moneda ?? '',
      zona_horaria: settings.zona_horaria ?? '',
      telefono: settings.telefono ?? '',
      logo: settings.logo ?? '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.pendingChangesService.clear();
  }

  private buildPayload(): UpdateCompanySettingsPayload {
    const value = this.form.getRawValue();

    return {
      nombre_empresa: value.nombre_empresa.trim(),
      nit: value.nit.trim(),
      direccion: value.direccion.trim(),
      ciudad: value.ciudad.trim(),
      pais: value.pais.trim(),
      moneda: value.moneda,
      zona_horaria: value.zona_horaria,
      telefono: value.telefono.trim(),
      logo: value.logo || null,
    };
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as { error?: { detail?: string }; message?: string };

    return (
      httpError?.error?.detail ??
      httpError?.message ??
      'No fue posible cargar o guardar la configuración.'
    );
  }
}
