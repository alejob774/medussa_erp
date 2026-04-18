import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_DEMAND_FORECAST_FILTERS, DemandForecastFilters } from '../../../domain/models/demand-forecast-filters.model';
import {
  DemandForecastCatalogs,
  GenerateDemandForecastPayload,
} from '../../../domain/models/demand-forecast.model';

@Component({
  selector: 'app-forecast-filters-panel',
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
          <p class="erp-section-eyebrow">Generacion</p>
          <h3 class="erp-section-title">Planeacion de la demanda</h3>
          <p class="erp-section-description">
            Filtra por SKU, canal, zona, cliente o segmento y genera versiones nuevas del forecast.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" mat-stroked-button (click)="emitReset()">Limpiar filtros</button>
          <button type="button" mat-flat-button color="primary" (click)="emitGenerate()">Generar forecast</button>
        </div>
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" [formGroup]="form">
        <mat-form-field appearance="outline">
          <mat-label>Horizonte</mat-label>
          <mat-select formControlName="horizonte">
            @for (item of catalogs.horizons; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha inicio</mat-label>
          <input matInput type="date" formControlName="fechaInicio" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha fin</mat-label>
          <input matInput type="date" formControlName="fechaFin" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Version seleccionada</mat-label>
          <mat-select formControlName="selectedForecastId">
            <mat-option [value]="null">Ultima disponible</mat-option>
            @for (item of forecastOptions; track item.value) {
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

        <mat-form-field appearance="outline">
          <mat-label>Severidad alerta</mat-label>
          <mat-select formControlName="alertSeverity">
            @for (item of catalogs.severities; track item.value) {
              <mat-option [value]="item.value">{{ item.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="xl:col-span-2">
          <mat-label>Nombre del forecast</mat-label>
          <input matInput formControlName="nombreForecast" placeholder="Forecast comercial Medussa Holding" />
        </mat-form-field>

        <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
          <mat-checkbox formControlName="onlyActiveProducts">Solo productos activos</mat-checkbox>
          <mat-checkbox formControlName="approvedOnly">Ver solo aprobados</mat-checkbox>
          <mat-checkbox formControlName="includeOnlyActiveProducts">Generar solo con activos</mat-checkbox>
        </div>
      </form>

      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" mat-stroked-button (click)="emitApply()">Aplicar filtros</button>
        <span class="erp-chip erp-chip--neutral">{{ catalogs.products.length }} SKU disponibles</span>
        <span class="erp-chip erp-chip--neutral">{{ catalogs.clients.length }} clientes base</span>
        <span class="erp-chip erp-chip--neutral">{{ catalogs.zones.length }} zonas operativas</span>
      </div>
    </section>
  `,
})
export class ForecastFiltersPanelComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) catalogs: DemandForecastCatalogs = {
    horizons: [],
    channels: [],
    zones: [],
    segments: [],
    products: [],
    clients: [],
    severities: [],
  };

  @Input({ required: true }) filters: DemandForecastFilters = { ...DEFAULT_DEMAND_FORECAST_FILTERS };
  @Input() forecastOptions: Array<{ value: string; label: string }> = [];

  @Output() readonly applyFilters = new EventEmitter<DemandForecastFilters>();
  @Output() readonly generateForecast = new EventEmitter<GenerateDemandForecastPayload>();
  @Output() readonly resetFilters = new EventEmitter<void>();

  readonly form = this.formBuilder.group({
    horizonte: this.formBuilder.control(DEFAULT_DEMAND_FORECAST_FILTERS.horizonte, { nonNullable: true }),
    fechaInicio: this.formBuilder.control(DEFAULT_DEMAND_FORECAST_FILTERS.fechaInicio, { nonNullable: true }),
    fechaFin: this.formBuilder.control(DEFAULT_DEMAND_FORECAST_FILTERS.fechaFin, { nonNullable: true }),
    skuIds: this.formBuilder.control<string[]>([], { nonNullable: true }),
    canal: this.formBuilder.control<string | null>(null),
    zona: this.formBuilder.control<string | null>(null),
    segmento: this.formBuilder.control<string | null>(null),
    clienteId: this.formBuilder.control<string | null>(null),
    onlyActiveProducts: this.formBuilder.control(true, { nonNullable: true }),
    approvedOnly: this.formBuilder.control(false, { nonNullable: true }),
    selectedForecastId: this.formBuilder.control<string | null>(null),
    alertSeverity: this.formBuilder.control<'ALTA' | 'MEDIA' | 'BAJA' | 'TODAS'>('TODAS', { nonNullable: true }),
    nombreForecast: this.formBuilder.control(''),
    includeOnlyActiveProducts: this.formBuilder.control(true, { nonNullable: true }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.form.patchValue(
        {
          ...this.filters,
          nombreForecast: '',
          includeOnlyActiveProducts: this.filters.onlyActiveProducts,
        },
        { emitEvent: false },
      );
    }
  }

  emitApply(): void {
    const value = this.form.getRawValue();

    this.applyFilters.emit({
      horizonte: value.horizonte,
      fechaInicio: value.fechaInicio,
      fechaFin: value.fechaFin,
      skuIds: value.skuIds,
      canal: value.canal,
      zona: value.zona,
      segmento: value.segmento,
      clienteId: value.clienteId,
      onlyActiveProducts: value.onlyActiveProducts,
      approvedOnly: value.approvedOnly,
      selectedForecastId: value.selectedForecastId,
      alertSeverity: value.alertSeverity,
    });
  }

  emitGenerate(): void {
    const value = this.form.getRawValue();

    this.generateForecast.emit({
      nombreForecast: value.nombreForecast?.trim() || null,
      horizonte: value.horizonte,
      fechaInicio: value.fechaInicio,
      fechaFin: value.fechaFin,
      skuIds: value.skuIds,
      canal: value.canal,
      zona: value.zona,
      segmento: value.segmento,
      clienteId: value.clienteId,
      includeOnlyActiveProducts: value.includeOnlyActiveProducts,
      usuario: 'demo.el-arbolito',
      observaciones: 'Forecast generado desde la consola SCM local.',
    });
  }

  emitReset(): void {
    this.resetFilters.emit();
  }
}
