import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import { CompanyLogoUploadComponent } from '../../../settings/components/company-logo-upload/company-logo-upload.component';
import {
  CompanyAssociatedUserVm,
  CompanyDetailVm,
  CompanyFormCatalogs,
  CompanyRowVm,
  EMPTY_COMPANY_FORM_CATALOGS,
  SaveCompanyPayload,
} from '../../domain/models/company-administration.model';

@Component({
  selector: 'app-company-form-panel',
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
    <div class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" (click)="close()"></div>

    <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-[1180px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="erp-section-eyebrow">
              Administración global
            </p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">
              {{ initialValue ? 'Editar empresa' : 'Crear empresa' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Administra el catálogo multiempresa sin depender de la empresa activa.
            </p>
          </div>

          <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        @if (initialValue) {
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <mat-icon class="!h-4 !w-4 !text-base">apartment</mat-icon>
              {{ initialValue.code }}
            </span>

            <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              [class.bg-emerald-100]="initialValue.status === 'active'"
              [class.text-emerald-700]="initialValue.status === 'active'"
              [class.bg-slate-200]="initialValue.status === 'inactive'"
              [class.text-slate-600]="initialValue.status === 'inactive'"
            >
              {{ initialValue.status === 'active' ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
        }
      </header>

      @if (loading) {
        <div class="flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-6">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <mat-spinner diameter="34"></mat-spinner>
            <p class="text-sm">Cargando empresa...</p>
          </div>
        </div>
      } @else {
        <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="submit()">
          <div class="flex-1 overflow-auto px-6 py-6">
            <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div class="space-y-6">
                <section class="erp-form-section">
                  <div class="mb-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Identificación
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Datos base de la empresa</h3>
                  </div>

                  <div class="grid gap-4 md:grid-cols-2">
                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Nombre empresa</mat-label>
                      <input matInput formControlName="companyName" />
                      @if (isInvalid('companyName')) {
                        <mat-error>{{ getErrorMessage('companyName') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>NIT</mat-label>
                      <input matInput formControlName="nit" />
                      @if (isInvalid('nit')) {
                        <mat-error>{{ getErrorMessage('nit') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Sector</mat-label>
                      <mat-select formControlName="sector">
                        @for (sector of catalogs.sectors; track sector.value) {
                          <mat-option [value]="sector.value">{{ sector.label }}</mat-option>
                        }
                      </mat-select>
                      @if (isInvalid('sector')) {
                        <mat-error>{{ getErrorMessage('sector') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Estado</mat-label>
                      <mat-select formControlName="status">
                        <mat-option value="active">Activa</mat-option>
                        <mat-option value="inactive">Inactiva</mat-option>
                      </mat-select>
                      @if (isInvalid('status')) {
                        <mat-error>{{ getErrorMessage('status') }}</mat-error>
                      }
                    </mat-form-field>
                  </div>
                </section>

                <section class="erp-form-section">
                  <div class="mb-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Contacto
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Canales y ubicación</h3>
                  </div>

                  <div class="grid gap-4 md:grid-cols-2">
                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Dirección</mat-label>
                      <textarea matInput rows="3" formControlName="address"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Ciudad</mat-label>
                      <input matInput formControlName="city" />
                      <mat-hint>Opcional</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Teléfono</mat-label>
                      <input matInput formControlName="phone" />
                      <mat-hint>Opcional</mat-hint>
                      @if (isInvalid('phone')) {
                        <mat-error>{{ getErrorMessage('phone') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Email</mat-label>
                      <input matInput type="email" formControlName="email" />
                      <mat-hint>Opcional</mat-hint>
                      @if (isInvalid('email')) {
                        <mat-error>{{ getErrorMessage('email') }}</mat-error>
                      }
                    </mat-form-field>
                  </div>
                </section>

                <section class="erp-form-section">
                  <div class="mb-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Operación y configuración
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Parámetros base</h3>
                  </div>

                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-2">
                      <label class="text-sm font-medium text-slate-700">Fecha inicio operación</label>
                      <input
                        type="date"
                        class="erp-date-input"
                        formControlName="operationStartDate"
                      />
                    </div>

                    <mat-form-field appearance="outline">
                      <mat-label>País</mat-label>
                      <mat-select formControlName="country">
                        @for (country of catalogs.countries; track country.value) {
                          <mat-option [value]="country.value">{{ country.label }}</mat-option>
                        }
                      </mat-select>
                      @if (isInvalid('country')) {
                        <mat-error>{{ getErrorMessage('country') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Moneda base</mat-label>
                      <mat-select formControlName="baseCurrency">
                        @for (currency of catalogs.currencies; track currency.value) {
                          <mat-option [value]="currency.value">{{ currency.label }}</mat-option>
                        }
                      </mat-select>
                      @if (isInvalid('baseCurrency')) {
                        <mat-error>{{ getErrorMessage('baseCurrency') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Zona horaria</mat-label>
                      <mat-select formControlName="timezone">
                        @for (timezone of catalogs.timezones; track timezone.value) {
                          <mat-option [value]="timezone.value">{{ timezone.label }}</mat-option>
                        }
                      </mat-select>
                      @if (isInvalid('timezone')) {
                        <mat-error>{{ getErrorMessage('timezone') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Idioma</mat-label>
                      <mat-select formControlName="language">
                        @for (language of catalogs.languages; track language.value) {
                          <mat-option [value]="language.value">{{ language.label }}</mat-option>
                        }
                      </mat-select>
                      @if (isInvalid('language')) {
                        <mat-error>{{ getErrorMessage('language') }}</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Impuestos</mat-label>
                      <textarea matInput rows="3" formControlName="taxConfiguration"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="md:col-span-2">
                      <mat-label>Configuraciones iniciales</mat-label>
                      <textarea matInput rows="3" formControlName="initialConfiguration"></textarea>
                    </mat-form-field>
                  </div>
                </section>
              </div>

              <div class="space-y-6">
                <section class="erp-form-section">
                  <div class="mb-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Identidad visual
                    </p>
                    <h3 class="mt-2 text-lg font-semibold text-slate-900">Logo y preview</h3>
                    <p class="mt-1 text-sm text-slate-500">
                      El logo es opcional y queda preparado para upload real en backend.
                    </p>
                  </div>

                  <app-company-logo-upload
                    [previewUrl]="form.controls.logoUrl.value"
                    [companyName]="form.controls.companyName.value || 'Empresa'"
                    (logoSelected)="onLogoSelected($event)"
                  ></app-company-logo-upload>
                </section>

                <section class="erp-form-section">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Resumen operativo
                  </p>
                  <h3 class="mt-2 text-lg font-semibold text-slate-900">Contexto del registro</h3>

                  <dl class="mt-4 space-y-3 text-sm text-slate-600">
                    <div class="flex items-center justify-between gap-3">
                      <dt>Usuarios asociados</dt>
                      <dd class="font-semibold text-slate-900">{{ associatedUsers().length }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>Creada</dt>
                      <dd class="text-right font-semibold text-slate-900">{{ createdAtLabel() }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>ID backend</dt>
                      <dd class="text-right font-semibold text-slate-900">{{ initialValue?.backendId || 'Pendiente' }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <dt>Modo</dt>
                      <dd class="font-semibold text-slate-900">CRUD global</dd>
                    </div>
                  </dl>

                  @if (associatedUsers().length) {
                    <div class="mt-5 space-y-3">
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Usuarios relacionados
                      </p>

                      @for (user of associatedUsers(); track user.userId) {
                        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-slate-900">{{ user.fullName }}</p>
                              <p class="truncate text-xs text-slate-500">{{ user.email }}</p>
                            </div>

                            <span class="rounded-full px-3 py-1 text-xs font-semibold"
                              [class.bg-emerald-100]="user.status === 'active'"
                              [class.text-emerald-700]="user.status === 'active'"
                              [class.bg-slate-200]="user.status === 'inactive'"
                              [class.text-slate-600]="user.status === 'inactive'"
                            >
                              {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                            </span>
                          </div>

                          <p class="mt-2 text-xs font-medium text-slate-600">{{ user.roleLabel || 'Sin rol informado' }}</p>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Esta HU solo muestra el resumen de usuarios asociados. La gestión detallada permanece en seguridad.
                    </div>
                  }
                </section>
              </div>
            </div>
          </div>

          <footer class="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
            <button mat-stroked-button type="button" (click)="close()" [disabled]="saving">
              Cancelar
            </button>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving || loading">
              {{ saving ? 'Guardando...' : initialValue ? 'Guardar cambios' : 'Crear empresa' }}
            </button>
          </footer>
        </form>
      }
    </aside>
  `,
})
export class CompanyFormPanelComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() catalogs: CompanyFormCatalogs = EMPTY_COMPANY_FORM_CATALOGS;
  @Input() existingCompanies: CompanyRowVm[] = [];
  @Input() initialValue: CompanyDetailVm | null = null;
  @Input() loading = false;
  @Input() saving = false;

  @Output() saveCompany = new EventEmitter<SaveCompanyPayload>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(3)]],
    nit: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9.\-]{6,20}$/)]],
    sector: ['', [Validators.required]],
    status: this.fb.nonNullable.control<'active' | 'inactive'>('active', Validators.required),
    address: [''],
    city: [''],
    phone: ['', [Validators.pattern(/^[+0-9()\s-]{7,20}$/)]],
    email: ['', [Validators.email]],
    operationStartDate: this.fb.control<string | null>(null),
    country: ['Colombia', [Validators.required]],
    baseCurrency: ['COP', [Validators.required]],
    timezone: ['America/Bogota', [Validators.required]],
    language: ['es-CO', [Validators.required]],
    taxConfiguration: [''],
    initialConfiguration: [''],
    logoUrl: this.fb.control<string | null>(null),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en la empresa. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      );
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingCompanies']) {
      this.applyDynamicValidators();
    }

    if (changes['initialValue'] || changes['catalogs']) {
      this.resetForm();
    }
  }

  ngOnDestroy(): void {
    this.pendingChangesService.clear();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.pendingChangesService.clear();
    this.saveCompany.emit({
      companyName: value.companyName.trim(),
      nit: value.nit.trim(),
      sector: value.sector,
      address: value.address.trim(),
      city: value.city.trim(),
      country: value.country,
      phone: value.phone.trim(),
      email: value.email.trim(),
      status: value.status,
      operationStartDate: value.operationStartDate,
      baseCurrency: value.baseCurrency,
      timezone: value.timezone,
      language: value.language,
      taxConfiguration: value.taxConfiguration.trim(),
      initialConfiguration: value.initialConfiguration.trim(),
      logoUrl: value.logoUrl,
    });
  }

  close(): void {
    if (
      !this.loading &&
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en la empresa. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.closePanel.emit();
  }

  onLogoSelected(logoUrl: string | null): void {
    this.form.controls.logoUrl.setValue(logoUrl);
    this.form.controls.logoUrl.markAsDirty();
  }

  isInvalid(controlName: keyof CompanyFormPanelComponent['form']['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: keyof CompanyFormPanelComponent['form']['controls']): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'Debe contener al menos 3 caracteres.';
    }

    if (control.hasError('pattern')) {
      return controlName === 'phone'
        ? 'Ingresa un teléfono válido.'
        : 'Ingresa un NIT válido.';
    }

    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('duplicateCompanyName')) {
      return 'Ya existe una empresa con ese nombre.';
    }

    if (control.hasError('duplicateNit')) {
      return 'Ya existe una empresa con ese NIT.';
    }

    return 'Revisa el valor ingresado.';
  }

  associatedUsers(): CompanyAssociatedUserVm[] {
    return this.initialValue?.associatedUsers ?? [];
  }

  createdAtLabel(): string {
    if (!this.initialValue?.createdAt) {
      return 'Se asignará al guardar';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
    }).format(new Date(this.initialValue.createdAt));
  }

  private resetForm(): void {
    this.applyDynamicValidators();

    this.form.reset({
      companyName: this.initialValue?.companyName ?? '',
      nit: this.initialValue?.nit ?? '',
      sector:
        this.initialValue?.sector ?? this.catalogs.sectors[0]?.value ?? '',
      status: this.initialValue?.status ?? 'active',
      address: this.initialValue?.address ?? '',
      city: this.initialValue?.city ?? '',
      phone: this.initialValue?.phone ?? '',
      email: this.initialValue?.email ?? '',
      operationStartDate: this.initialValue?.operationStartDate ?? null,
      country: this.initialValue?.country ?? this.catalogs.countries[0]?.value ?? 'Colombia',
      baseCurrency:
        this.initialValue?.baseCurrency ?? this.catalogs.currencies[0]?.value ?? 'COP',
      timezone:
        this.initialValue?.timezone ?? this.catalogs.timezones[0]?.value ?? 'America/Bogota',
      language: this.initialValue?.language ?? this.catalogs.languages[0]?.value ?? 'es-CO',
      taxConfiguration: this.initialValue?.taxConfiguration ?? '',
      initialConfiguration: this.initialValue?.initialConfiguration ?? '',
      logoUrl: this.initialValue?.logoUrl ?? null,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.pendingChangesService.clear();
  }

  private applyDynamicValidators(): void {
    this.form.controls.companyName.setValidators([
      Validators.required,
      Validators.minLength(3),
      this.uniqueCompanyFieldValidator('companyName', 'duplicateCompanyName'),
    ]);
    this.form.controls.companyName.updateValueAndValidity({ emitEvent: false });

    this.form.controls.nit.setValidators([
      Validators.required,
      Validators.pattern(/^[A-Za-z0-9.\-]{6,20}$/),
      this.uniqueCompanyFieldValidator('nit', 'duplicateNit'),
    ]);
    this.form.controls.nit.updateValueAndValidity({ emitEvent: false });
  }

  private uniqueCompanyFieldValidator(
    field: 'companyName' | 'nit',
    errorKey: 'duplicateCompanyName' | 'duplicateNit',
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const normalizedValue = normalizeFieldValue(control.value);

      if (!normalizedValue) {
        return null;
      }

      const duplicated = this.existingCompanies.some((company) => {
        if (company.id === this.initialValue?.id) {
          return false;
        }

        const comparableValue =
          field === 'companyName' ? company.companyName : company.nit;

        return normalizeFieldValue(comparableValue) === normalizedValue;
      });

      return duplicated ? { [errorKey]: true } : null;
    };
  }
}

function normalizeFieldValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
