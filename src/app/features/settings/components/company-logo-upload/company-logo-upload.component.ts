import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-company-logo-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
          @if (previewUrl) {
            <img
              [src]="previewUrl"
              [alt]="companyName + ' logo'"
              class="h-full w-full object-cover"
            />
          } @else {
            <div class="flex flex-col items-center justify-center gap-2 px-3 text-center text-slate-400">
              <mat-icon>image</mat-icon>
              <span class="text-xs">Sin logo cargado</span>
            </div>
          }
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-slate-800">Logo de empresa</p>
          <p class="mt-1 text-sm text-slate-500">
            Prepara la UI para backend real. Por ahora se guarda preview mock por empresa.
          </p>

          <div class="mt-3 flex flex-wrap gap-2">
            <label
              class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              <mat-icon class="text-base">upload</mat-icon>
              Seleccionar imagen
              <input
                type="file"
                accept="image/*"
                class="hidden"
                (change)="onFileSelected($event)"
              />
            </label>

            <button
              mat-stroked-button
              type="button"
              (click)="clearLogo()"
              [disabled]="!previewUrl"
            >
              Quitar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CompanyLogoUploadComponent {
  @Input() previewUrl: string | null = null;
  @Input() companyName = 'Empresa';

  @Output() logoSelected = new EventEmitter<string | null>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.logoSelected.emit(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoSelected.emit(null);
  }
}
