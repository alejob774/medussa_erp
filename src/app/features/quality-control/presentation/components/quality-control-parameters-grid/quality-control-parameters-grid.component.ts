import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { QualityParameterTemplate } from '../../../domain/models/quality-control-response.model';
import { QualityInspectionDetail } from '../../../domain/models/quality-inspection-detail.model';
import { QualityControlType } from '../../../domain/models/quality-status.model';
import { resolveParameterConformity } from '../../../domain/utils/quality-control-evaluation.utils';

@Component({
  selector: 'app-quality-control-parameters-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Laboratorio</p>
          <h4 class="erp-section-title">Grid de parametros</h4>
          <p class="erp-section-description">
            Captura resultados, rangos y criticidad. La conformidad se valida automaticamente por linea.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button type="button" mat-stroked-button (click)="applySuggestedTemplates()">
            Cargar parametros sugeridos
          </button>
          <button type="button" mat-stroked-button (click)="addRow()">Agregar parametro</button>
        </div>
      </div>

      @if (items.length) {
        <div class="erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[86rem]">
            <thead>
              <tr>
                <th>Parametro</th>
                <th>Resultado</th>
                <th>Unidad</th>
                <th>Rango min</th>
                <th>Rango max</th>
                <th>Critico</th>
                <th>Conforme</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items; track item.id; let index = $index) {
                <tr>
                  <td>
                    <select
                      class="erp-field__control min-w-64"
                      [ngModel]="item.templateId"
                      (ngModelChange)="selectTemplate(index, $event)"
                    >
                      <option [ngValue]="null">Parametro libre</option>
                      @for (option of filteredTemplates; track option.id) {
                        <option [ngValue]="option.id">{{ option.parametro }}</option>
                      }
                    </select>
                    <input
                      class="erp-field__control mt-2 min-w-64"
                      [ngModel]="item.parametro"
                      (ngModelChange)="updateText(index, 'parametro', $event)"
                      placeholder="Nombre del parametro"
                    />
                  </td>
                  <td>
                    <input
                      class="erp-field__control w-28"
                      type="number"
                      step="0.01"
                      [ngModel]="item.resultado"
                      (ngModelChange)="updateNumber(index, 'resultado', $event)"
                    />
                  </td>
                  <td>
                    <input
                      class="erp-field__control w-24"
                      [ngModel]="item.unidadMedida"
                      (ngModelChange)="updateText(index, 'unidadMedida', $event)"
                    />
                  </td>
                  <td>
                    <input
                      class="erp-field__control w-24"
                      type="number"
                      step="0.01"
                      [ngModel]="item.rangoMin"
                      (ngModelChange)="updateNumber(index, 'rangoMin', $event)"
                    />
                  </td>
                  <td>
                    <input
                      class="erp-field__control w-24"
                      type="number"
                      step="0.01"
                      [ngModel]="item.rangoMax"
                      (ngModelChange)="updateNumber(index, 'rangoMax', $event)"
                    />
                  </td>
                  <td>
                    <select
                      class="erp-field__control w-24"
                      [ngModel]="item.esCritico ? 'SI' : 'NO'"
                      (ngModelChange)="updateCritical(index, $event)"
                    >
                      <option value="SI">Si</option>
                      <option value="NO">No</option>
                    </select>
                  </td>
                  <td>
                    <span class="erp-status-chip" [class]="item.conforme ? 'erp-status-chip--success' : 'erp-status-chip--danger'">
                      {{ item.conforme ? 'Conforme' : 'Fuera de rango' }}
                    </span>
                  </td>
                  <td>
                    <button type="button" mat-stroked-button (click)="removeRow(index)">Quitar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state min-h-[14rem]">
          <div>
            <p class="text-slate-600">
              Carga parametros sugeridos o agrega filas manualmente para evaluar el lote.
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class QualityControlParametersGridComponent {
  @Input() items: QualityInspectionDetail[] = [];
  @Input() templates: QualityParameterTemplate[] = [];
  @Input() controlType: QualityControlType = 'RECEPCION';

  @Output() readonly itemsChange = new EventEmitter<QualityInspectionDetail[]>();

  get filteredTemplates(): QualityParameterTemplate[] {
    return this.templates.filter((item) => item.tiposControl.includes(this.controlType));
  }

  addRow(): void {
    const nextItems: QualityInspectionDetail[] = [
      ...this.items.map((item) => ({ ...item })),
      createEmptyParameterRow(this.items.length + 1),
    ];

    this.itemsChange.emit(nextItems);
  }

  removeRow(index: number): void {
    this.itemsChange.emit(this.items.filter((_, itemIndex) => itemIndex !== index).map((item) => ({ ...item })));
  }

  applySuggestedTemplates(): void {
    const nextItems: QualityInspectionDetail[] = this.filteredTemplates.map((item, index) => ({
      id: `draft-param-${index + 1}`,
      inspeccionId: 'draft',
      templateId: item.id,
      parametro: item.parametro,
      resultado: item.rangoMin,
      unidadMedida: item.unidadMedida,
      rangoMin: item.rangoMin,
      rangoMax: item.rangoMax,
      conforme: resolveParameterConformity(item.rangoMin, item.rangoMin, item.rangoMax),
      esCritico: item.esCritico,
    }));

    this.itemsChange.emit(nextItems);
  }

  selectTemplate(index: number, templateId: string | null): void {
    const template = this.filteredTemplates.find((item) => item.id === templateId) ?? null;
    const nextItems: QualityInspectionDetail[] = this.items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return { ...item };
      }

      if (!template) {
        return { ...item, templateId: null };
      }

      return {
        ...item,
        templateId: template.id,
        parametro: template.parametro,
        unidadMedida: template.unidadMedida,
        rangoMin: template.rangoMin,
        rangoMax: template.rangoMax,
        esCritico: template.esCritico,
        conforme: resolveParameterConformity(item.resultado, template.rangoMin, template.rangoMax),
      };
    });

    this.itemsChange.emit(nextItems);
  }

  updateText(index: number, field: 'parametro' | 'unidadMedida', value: string): void {
    const nextItems: QualityInspectionDetail[] = this.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : { ...item },
    );

    this.itemsChange.emit(nextItems);
  }

  updateNumber(
    index: number,
    field: 'resultado' | 'rangoMin' | 'rangoMax',
    value: number,
  ): void {
    const nextItems: QualityInspectionDetail[] = this.items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return { ...item };
      }

      const nextItem = {
        ...item,
        [field]: Number(value),
      };

      return {
        ...nextItem,
        conforme: resolveParameterConformity(nextItem.resultado, nextItem.rangoMin, nextItem.rangoMax),
      };
    });

    this.itemsChange.emit(nextItems);
  }

  updateCritical(index: number, value: 'SI' | 'NO'): void {
    const nextItems: QualityInspectionDetail[] = this.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, esCritico: value === 'SI' } : { ...item },
    );

    this.itemsChange.emit(nextItems);
  }
}

function createEmptyParameterRow(order: number): QualityInspectionDetail {
  return {
    id: `draft-param-${Date.now()}-${order}`,
    inspeccionId: 'draft',
    templateId: null,
    parametro: '',
    resultado: 0,
    unidadMedida: '',
    rangoMin: 0,
    rangoMax: 0,
    conforme: true,
    esCritico: false,
  };
}
