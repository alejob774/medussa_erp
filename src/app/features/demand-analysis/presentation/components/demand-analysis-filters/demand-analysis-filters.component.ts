import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_DEMAND_ANALYSIS_FILTERS, DemandAnalysisFilters } from '../../../domain/models/demand-analysis-filters.model';
import { DemandAnalysisCatalogs } from '../../../domain/models/demand-analysis.model';

@Component({
  selector: 'app-demand-analysis-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <section class="erp-filter-panel">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="erp-section-eyebrow">Filtros avanzados</p>
          <h3 class="erp-section-title">Analisis de demanda</h3>
          <p class="erp-section-description">Cruza forecast aprobado con venta real mock y enfoca por zona, canal o SKU.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" mat-stroked-button (click)="reset.emit()">Limpiar</button>
          <button type="button" mat-flat-button color="primary" (click)="refresh.emit(value)">Actualizar analisis</button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Fecha desde</mat-label>
          <input matInput type="date" formControlName="fechaDesde" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha hasta</mat-label>
          <input matInput type="date" formControlName="fechaHasta" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Forecast base</mat-label>
          <mat-select formControlName="selectedForecastId">
            <mat-option [value]="null">Forecast oficial</mat-option>
            @for (item of catalogs.forecasts; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Severidad</mat-label>
          <mat-select formControlName="alertSeverity">
            @for (item of catalogs.severities; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="xl:col-span-2">
          <mat-label>SKU</mat-label>
          <mat-select formControlName="skuIds" multiple>
            @for (item of catalogs.products; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Canal</mat-label>
          <mat-select formControlName="canal">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.channels; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Zona</mat-label>
          <mat-select formControlName="zona">
            <mat-option [value]="null">Todas</mat-option>
            @for (item of catalogs.zones; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Segmento</mat-label>
          <mat-select formControlName="segmento">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.segments; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cliente</mat-label>
          <mat-select formControlName="clienteId">
            <mat-option [value]="null">Todos</mat-option>
            @for (item of catalogs.clients; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
          <mat-checkbox formControlName="approvedOnly">Usar solo forecast aprobado</mat-checkbox>
          <mat-checkbox formControlName="onlyActiveProducts">Usar solo productos activos</mat-checkbox>
        </div>
      </form>

      <div class="mt-4 flex gap-2">
        <button type="button" mat-stroked-button (click)="apply.emit(value)">Aplicar filtros</button>
      </div>
    </section>
  `,
})
export class DemandAnalysisFiltersComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) catalogs: DemandAnalysisCatalogs = {
    channels: [],
    zones: [],
    segments: [],
    products: [],
    clients: [],
    forecasts: [],
    severities: [],
  };
  @Input({ required: true }) filters: DemandAnalysisFilters = { ...DEFAULT_DEMAND_ANALYSIS_FILTERS };

  @Output() readonly apply = new EventEmitter<DemandAnalysisFilters>();
  @Output() readonly refresh = new EventEmitter<DemandAnalysisFilters>();
  @Output() readonly reset = new EventEmitter<void>();

  readonly form = this.fb.group({
    fechaDesde: this.fb.control(DEFAULT_DEMAND_ANALYSIS_FILTERS.fechaDesde, { nonNullable: true }),
    fechaHasta: this.fb.control(DEFAULT_DEMAND_ANALYSIS_FILTERS.fechaHasta, { nonNullable: true }),
    skuIds: this.fb.control<string[]>([], { nonNullable: true }),
    canal: this.fb.control<string | null>(null),
    zona: this.fb.control<string | null>(null),
    segmento: this.fb.control<string | null>(null),
    clienteId: this.fb.control<string | null>(null),
    approvedOnly: this.fb.control(true, { nonNullable: true }),
    onlyActiveProducts: this.fb.control(true, { nonNullable: true }),
    selectedForecastId: this.fb.control<string | null>(null),
    alertSeverity: this.fb.control<'ALTA' | 'MEDIA' | 'BAJA' | 'TODAS'>('TODAS', { nonNullable: true }),
  });

  get value(): DemandAnalysisFilters {
    const value = this.form.getRawValue();
    return {
      fechaDesde: value.fechaDesde,
      fechaHasta: value.fechaHasta,
      skuIds: value.skuIds,
      canal: value.canal,
      zona: value.zona,
      segmento: value.segmento,
      clienteId: value.clienteId,
      approvedOnly: value.approvedOnly,
      onlyActiveProducts: value.onlyActiveProducts,
      selectedForecastId: value.selectedForecastId,
      alertSeverity: value.alertSeverity,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(this.filters, { emitEvent: false });
    }
  }
}
