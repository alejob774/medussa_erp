import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AuthSessionService } from '../../../../auth/services/auth-session.service';
import { OeeFacadeService } from '../../../application/facade/oee.facade';
import { DEFAULT_OEE_FILTERS, OeeFilters } from '../../../domain/models/oee-filters.model';
import { EMPTY_OEE_DASHBOARD, OeeDashboard, OeeRecordAggregate } from '../../../domain/models/oee-response.model';
import {
  OeeFormComponent,
  OeeFormMode,
  OeeFormSubmitEvent,
} from '../../components/oee-form/oee-form.component';
import { OeeAlertsComponent } from '../../components/oee-alerts/oee-alerts.component';
import { OeeFiltersComponent } from '../../components/oee-filters/oee-filters.component';
import { OeeHistoryComponent } from '../../components/oee-history/oee-history.component';
import { OeeListComponent } from '../../components/oee-list/oee-list.component';
import { OeeSummaryCardsComponent } from '../../components/oee-summary-cards/oee-summary-cards.component';

@Component({
  selector: 'app-oee-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    OeeSummaryCardsComponent,
    OeeFiltersComponent,
    OeeListComponent,
    OeeAlertsComponent,
    OeeFormComponent,
    OeeHistoryComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">PRODUCCION - HU-020</p>
            <h1 class="erp-page-title">OEE - Eficiencia real de equipos</h1>
            <p class="erp-page-description">
              Modulo operativo para {{ activeCompanyName }}, enfocado en captura por planta, linea, maquina y turno,
              con paradas no programadas, calculo automatico de disponibilidad, rendimiento, calidad y OEE.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal operativo para El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Registro seleccionado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ selectedRecord?.record?.maquinaCodigo || 'Sin seleccion' }}
              </p>
              <p class="erp-meta-card__hint">
                {{ selectedRecord?.record?.lineaProduccion || 'Selecciona una fila para revisar el detalle tecnico.' }}
              </p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) {
        <div class="erp-alert erp-alert--error">{{ errorMessage }}</div>
      }

      @if (successMessage) {
        <div class="erp-alert erp-alert--success">{{ successMessage }}</div>
      }

      <app-oee-summary-cards [kpis]="dashboard.kpis" />

      <div class="flex flex-wrap gap-3">
        <button type="button" mat-flat-button color="primary" (click)="createRecord()">Nuevo registro OEE</button>

        @if (selectedRecord) {
          <button type="button" mat-stroked-button (click)="editRecord(selectedRecord)">Editar registro</button>
          <button type="button" mat-stroked-button (click)="openDowntime(selectedRecord)">Registrar parada</button>
        }
      </div>

      <app-oee-filters [filters]="filters" [catalogs]="dashboard.catalogs" (apply)="handleFilters($event)" (reset)="resetFilters()" />

      <section class="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <app-oee-list
          [records]="dashboard.records"
          [selectedRecordId]="selectedRecord?.record?.id ?? null"
          (select)="selectRecord($event)"
        />

        <app-oee-alerts [alerts]="dashboard.alerts" (focusRecord)="focusRecord($event)" />
      </section>

      @if (showForm) {
        <app-oee-form
          [mode]="formMode"
          [record]="formRecord"
          [catalogs]="dashboard.catalogs"
          [saving]="saving"
          (submit)="handleFormSubmit($event)"
          (close)="closeForm()"
        />
      }

      <app-oee-history [record]="selectedRecord" [histories]="selectedRecord?.history ?? []" />
    </div>
  `,
})
export class OeePageComponent {
  private readonly facade = inject(OeeFacadeService);
  private readonly authSession = inject(AuthSessionService);

  dashboard: OeeDashboard = EMPTY_OEE_DASHBOARD;
  filters: OeeFilters = { ...DEFAULT_OEE_FILTERS };
  selectedRecord: OeeRecordAggregate | null = null;
  formRecord: OeeRecordAggregate | null = null;
  formMode: OeeFormMode = 'create';
  showForm = false;
  saving = false;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) {
        return;
      }

      this.activeCompanyName = company.name;
      this.selectedRecord = null;
      this.showForm = false;
      this.reload();
    });
  }

  handleFilters(filters: OeeFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_OEE_FILTERS };
    this.reload();
  }

  selectRecord(record: OeeRecordAggregate): void {
    this.selectedRecord = record;
  }

  focusRecord(recordId: string): void {
    const selected = this.dashboard.records.find((item) => item.record.id === recordId) ?? null;
    if (selected) {
      this.selectedRecord = selected;
    }
  }

  createRecord(): void {
    this.formMode = 'create';
    this.formRecord = null;
    this.showForm = true;
    this.clearMessages();
  }

  editRecord(record: OeeRecordAggregate): void {
    this.formMode = 'edit';
    this.formRecord = record;
    this.showForm = true;
    this.clearMessages();
  }

  openDowntime(record: OeeRecordAggregate): void {
    this.formMode = 'downtime';
    this.formRecord = record;
    this.showForm = true;
    this.clearMessages();
  }

  closeForm(): void {
    this.showForm = false;
    this.formRecord = null;
  }

  handleFormSubmit(event: OeeFormSubmitEvent): void {
    this.saving = true;
    this.clearMessages();

    if (event.mode === 'downtime') {
      const recordId = this.formRecord?.record.id;
      if (!recordId) {
        this.saving = false;
        this.errorMessage = 'No hay registro seleccionado para asociar la parada.';
        return;
      }

      this.facade
        .registerDowntime(recordId, {
          ...event.payload,
          usuario: this.getCurrentUsername(),
        })
        .subscribe({
          next: (result) => {
            this.saving = false;
            this.successMessage = result.message;
            this.showForm = false;
            this.reload(false, result.record.record.id);
          },
          error: (error: unknown) => {
            this.saving = false;
            this.errorMessage = error instanceof Error ? error.message : 'No fue posible registrar la parada.';
          },
        });

      return;
    }

    this.facade
      .saveRecord(
        {
          ...event.payload,
          usuarioCrea: this.getCurrentUsername(),
        },
        this.formMode === 'edit' ? this.formRecord?.record.id : undefined,
      )
      .subscribe({
        next: (result) => {
          this.saving = false;
          this.successMessage = result.message;
          this.showForm = false;
          this.reload(false, result.record.record.id);
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar el registro OEE.';
        },
      });
  }

  private reload(clearMessages = true, preferredRecordId?: string | null): void {
    if (clearMessages) {
      this.clearMessages();
    }

    const currentId = preferredRecordId ?? this.selectedRecord?.record.id ?? null;

    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.selectedRecord =
          dashboard.records.find((item) => item.record.id === currentId) ?? dashboard.selectedRecord;
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_OEE_DASHBOARD;
        this.selectedRecord = null;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar el modulo OEE.';
      },
    });
  }

  private getCurrentUsername(): string {
    return this.authSession.getSessionUser()?.username ?? 'demo.jefe-planta';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
