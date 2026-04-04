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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PendingChangesService } from '../../../../core/forms/services/pending-changes.service';
import {
  RoleFormValue,
  RoleRowVm,
} from '../../models/security-administration.model';

@Component({
  selector: 'app-role-form-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" (click)="close()"></div>

    <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              Seguridad
            </p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900">
              {{ initialValue ? 'Editar rol' : 'Nuevo rol' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              Define la categoria funcional para la empresa activa.
            </p>

            @if (activeCompanyName) {
              <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <mat-icon class="!h-4 !w-4 !text-base">apartment</mat-icon>
                {{ activeCompanyName }}
              </div>
            }
          </div>

          <button mat-icon-button type="button" aria-label="Cerrar panel" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </header>

      <form class="flex min-h-0 flex-1 flex-col" [formGroup]="form" (ngSubmit)="submit()">
        <div class="flex-1 space-y-5 overflow-auto px-6 py-6">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre del rol</mat-label>
            <input matInput formControlName="name" />
            @if (isInvalid('name')) {
              <mat-error>{{ getErrorMessage('name') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="4" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Activo</mat-option>
              <mat-option value="inactive">Inactivo</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <footer class="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <button mat-stroked-button type="button" (click)="close()" [disabled]="saving">
            Cancelar
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="saving">
            {{ saving ? 'Guardando...' : initialValue ? 'Guardar cambios' : 'Crear rol' }}
          </button>
        </footer>
      </form>
    </aside>
  `,
})
export class RoleFormPanelComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pendingChangesService = inject(PendingChangesService);

  @Input() initialValue: RoleRowVm | null = null;
  @Input() activeCompanyName = '';
  @Input() saving = false;

  @Output() saveRole = new EventEmitter<RoleFormValue>();
  @Output() closePanel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status: this.fb.nonNullable.control<'active' | 'inactive'>('active'),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.pendingChangesService.setDirty(
        this.form.dirty,
        'Hay cambios sin guardar en el rol. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      );
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.resetForm(this.initialValue);
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
    this.saveRole.emit({
      name: value.name.trim(),
      description: value.description.trim(),
      status: value.status,
    });
  }

  close(): void {
    if (
      !this.pendingChangesService.confirmDiscard(
        'Hay cambios sin guardar en el rol. Si cierras el panel, se descartarán. ¿Deseas continuar?',
      )
    ) {
      return;
    }

    this.closePanel.emit();
  }

  isInvalid(controlName: 'name'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: 'name'): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return 'El nombre es demasiado corto.';
    }

    return 'Revisa el valor ingresado.';
  }

  private resetForm(role: RoleRowVm | null): void {
    this.form.reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      status: role?.status ?? 'active',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.pendingChangesService.clear();
  }
}