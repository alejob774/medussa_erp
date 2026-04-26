import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { QualityNonConformity } from '../../../domain/models/quality-nonconformity.model';
import { QualityInspectionAggregate } from '../../../domain/models/quality-inspection.model';
import { SaveQualityNonConformityPayload } from '../../../domain/repositories/quality-control.repository';

@Component({
  selector: 'app-quality-nonconformity-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  host: { class: 'erp-grid-contents' },
  template: `
    <ng-container>
      <article class="erp-panel">
        <p class="erp-section-eyebrow">No conformidades</p>
        <h3 class="erp-section-title">Registro basico</h3>
        <p class="erp-section-description">
          Documenta el motivo, la accion correctiva y el responsable sobre la inspeccion seleccionada.
        </p>

        @if (!selectedInspection) {
          <div class="erp-empty-state mt-5 min-h-[14rem]">
            <div>
              <p class="text-slate-600">Selecciona una inspeccion para registrar una no conformidad.</p>
            </div>
          </div>
        } @else {
          <div class="erp-subpanel mt-5 grid gap-4">
            <label class="erp-field">
              <span class="erp-field__label">Motivo</span>
              <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.motivo"></textarea>
            </label>

            <label class="erp-field">
              <span class="erp-field__label">Accion correctiva</span>
              <textarea class="erp-field__control min-h-28" [(ngModel)]="draft.accionCorrectiva"></textarea>
            </label>

            <label class="erp-field">
              <span class="erp-field__label">Responsable</span>
              <select class="erp-field__control" [(ngModel)]="draft.responsable">
                <option value="">Selecciona responsable</option>
                @for (option of responsibleOptions; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>
          </div>

          <div class="mt-5">
            <button type="button" mat-flat-button color="primary" (click)="submitCreate()">
              Registrar no conformidad
            </button>
          </div>
        }
      </article>

      <article class="erp-panel">
        <p class="erp-section-eyebrow">Seguimiento</p>
        <h3 class="erp-section-title">No conformidades del lote</h3>
        <p class="erp-section-description">
          Consulta abiertas, en analisis y cerradas para el lote o la inspeccion seleccionada.
        </p>

        @if (items.length) {
          <div class="mt-5 space-y-3">
            @for (item of items; track item.id) {
              <article class="erp-detail-card">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ item.estado }}</p>
                    <p class="mt-1 text-sm text-slate-600">{{ item.responsable }}</p>
                  </div>
                  <p class="text-xs text-slate-500">{{ item.fechaRegistro | date: 'yyyy-MM-dd HH:mm' }}</p>
                </div>

                <p class="mt-3 text-sm text-slate-700"><strong>Motivo:</strong> {{ item.motivo }}</p>
                <p class="mt-2 text-sm text-slate-600">
                  <strong>Accion correctiva:</strong> {{ item.accionCorrectiva }}
                </p>

                @if (item.estado !== 'CERRADA') {
                  <div class="mt-4">
                    <button type="button" mat-stroked-button (click)="closeNc.emit(item.id)">
                      Cerrar no conformidad
                    </button>
                  </div>
                } @else {
                  <p class="mt-3 text-xs text-slate-500">
                    Cerrada el {{ item.fechaCierre | date: 'yyyy-MM-dd HH:mm' }}
                  </p>
                }
              </article>
            }
          </div>
        } @else {
          <div class="erp-empty-state mt-5 min-h-[14rem]">
            <div>
              <p class="text-slate-600">No hay no conformidades para el lote seleccionado.</p>
            </div>
          </div>
        }
      </article>
    </ng-container>
  `,
})
export class QualityNonConformityPanelComponent {
  @Input() selectedInspection: QualityInspectionAggregate | null = null;
  @Input() items: QualityNonConformity[] = [];
  @Input() responsibleOptions: string[] = [];

  @Output() readonly createNc = new EventEmitter<Omit<SaveQualityNonConformityPayload, 'usuario'>>();
  @Output() readonly closeNc = new EventEmitter<string>();

  draft = {
    motivo: '',
    accionCorrectiva: '',
    responsable: '',
  };

  submitCreate(): void {
    if (!this.selectedInspection || !this.draft.motivo.trim() || !this.draft.accionCorrectiva.trim() || !this.draft.responsable.trim()) {
      return;
    }

    this.createNc.emit({
      motivo: this.draft.motivo.trim(),
      accionCorrectiva: this.draft.accionCorrectiva.trim(),
      responsable: this.draft.responsable.trim(),
      estado: 'ABIERTA',
    });
    this.draft = {
      motivo: '',
      accionCorrectiva: '',
      responsable: '',
    };
  }
}
