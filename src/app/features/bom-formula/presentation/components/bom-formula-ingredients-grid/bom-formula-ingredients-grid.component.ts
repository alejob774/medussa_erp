import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { BomFormulaDetail } from '../../../domain/models/bom-formula-detail.model';
import { BomFormulaIngredientCatalogItem } from '../../../domain/models/bom-formula-response.model';
import { MeasurementUnit } from '../../../domain/models/measurement-unit.model';

@Component({
  selector: 'app-bom-formula-ingredients-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="erp-section-eyebrow">Receta tecnica</p>
          <h4 class="erp-section-title">Grid de ingredientes</h4>
          <p class="erp-section-description">
            Define materia prima, empaque e insumos con cantidad, unidad, costo y trazabilidad por linea.
          </p>
        </div>

        @if (!locked) {
          <button type="button" mat-stroked-button (click)="addRow()">Agregar ingrediente</button>
        }
      </div>

      @if (items.length) {
        <div class="erp-table-shell overflow-x-auto">
          <table class="erp-data-table min-w-[82rem]">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Codigo</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Costo unitario</th>
                <th>Costo linea</th>
                <th>Origen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items; track item.id; let index = $index) {
                <tr>
                  <td>
                    @if (locked) {
                      {{ item.ingredienteNombre }}
                    } @else {
                      <select class="erp-field__control min-w-64" [ngModel]="item.ingredienteId" (ngModelChange)="selectIngredient(index, $event)">
                        <option value="">Selecciona ingrediente</option>
                        @for (option of ingredientOptions; track option.id) {
                          <option [value]="option.id">{{ option.code }} · {{ option.name }}</option>
                        }
                      </select>
                    }
                  </td>
                  <td>{{ item.ingredienteCodigo || '—' }}</td>
                  <td>
                    @if (locked) {
                      {{ item.cantidad }}
                    } @else {
                      <input class="erp-field__control w-28" type="number" min="0" step="0.01" [ngModel]="item.cantidad" (ngModelChange)="updateNumber(index, 'cantidad', $event)" />
                    }
                  </td>
                  <td>
                    @if (locked) {
                      {{ item.unidadMedida }}
                    } @else {
                      <select class="erp-field__control w-28" [ngModel]="item.unidadMedida" (ngModelChange)="updateUnit(index, $event)">
                        @for (unit of units; track unit) {
                          <option [value]="unit">{{ unit }}</option>
                        }
                      </select>
                    }
                  </td>
                  <td>
                    @if (locked) {
                      {{ formatCurrency(item.costoUnitario) }}
                    } @else {
                      <input class="erp-field__control w-32" type="number" min="0" step="0.01" [ngModel]="item.costoUnitario" (ngModelChange)="updateNumber(index, 'costoUnitario', $event)" />
                    }
                  </td>
                  <td>{{ formatCurrency(item.costoTotalLinea) }}</td>
                  <td>{{ ingredientSource(item.ingredienteId) }}</td>
                  <td>
                    @if (!locked) {
                      <button type="button" mat-stroked-button (click)="removeRow(index)">Quitar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="erp-empty-state min-h-[14rem]">
          <div>
            <p class="text-slate-600">Agrega al menos un ingrediente para construir la formula.</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class BomFormulaIngredientsGridComponent {
  @Input() items: BomFormulaDetail[] = [];
  @Input() ingredientOptions: BomFormulaIngredientCatalogItem[] = [];
  @Input() units: MeasurementUnit[] = [];
  @Input() locked = false;

  @Output() readonly itemsChange = new EventEmitter<BomFormulaDetail[]>();

  addRow(): void {
    const nextItems: BomFormulaDetail[] = [
      ...this.items.map((item) => ({ ...item })),
      createEmptyIngredientRow(this.items.length),
    ];

    this.itemsChange.emit(nextItems);
  }

  removeRow(index: number): void {
    this.itemsChange.emit(this.items.filter((_, itemIndex) => itemIndex !== index).map((item) => ({ ...item })));
  }

  selectIngredient(index: number, ingredientId: string): void {
    const selected = this.ingredientOptions.find((option) => option.id === ingredientId) ?? null;
    const nextItems: BomFormulaDetail[] = this.items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return { ...item };
      }

      return {
        ...item,
        ingredienteId: selected?.id ?? '',
        ingredienteCodigo: selected?.code ?? '',
        ingredienteNombre: selected?.name ?? '',
        unidadMedida: selected?.defaultUnit ?? item.unidadMedida,
        costoUnitario: selected?.defaultCost ?? item.costoUnitario,
        costoTotalLinea: round(item.cantidad * (selected?.defaultCost ?? item.costoUnitario)),
      };
    });

    this.itemsChange.emit(nextItems);
  }

  updateNumber(index: number, field: 'cantidad' | 'costoUnitario', value: number): void {
    const nextItems = this.items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return { ...item };
      }

      const nextItem = {
        ...item,
        [field]: Number(value),
      };

      return {
        ...nextItem,
        costoTotalLinea: round(nextItem.cantidad * nextItem.costoUnitario),
      };
    });

    this.itemsChange.emit(nextItems);
  }

  updateUnit(index: number, unit: MeasurementUnit): void {
    const nextItems = this.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, unidadMedida: unit as MeasurementUnit } : { ...item },
    );

    this.itemsChange.emit(nextItems);
  }

  ingredientSource(ingredientId: string): string {
    const option = this.ingredientOptions.find((item) => item.id === ingredientId);
    return option?.source === 'PRODUCTO' ? 'Maestro' : 'Catalogo local';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

function round(value: number): number {
  return Number(Number(value).toFixed(2));
}

function createEmptyIngredientRow(currentLength: number): BomFormulaDetail {
  return {
    id: `draft-${Date.now()}-${currentLength + 1}`,
    formulaId: 'draft',
    ingredienteId: '',
    ingredienteCodigo: '',
    ingredienteNombre: '',
    cantidad: 0,
    unidadMedida: 'UND',
    costoUnitario: 0,
    costoTotalLinea: 0,
  };
}
