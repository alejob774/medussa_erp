import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { ProductDevelopmentFacadeService } from '../../../application/facade/product-development.facade';
import {
  DEFAULT_PRODUCT_DEVELOPMENT_FILTERS,
  ProductDevelopmentFilters,
} from '../../../domain/models/product-development-filters.model';
import {
  EMPTY_PRODUCT_DEVELOPMENT_DASHBOARD,
  ProductDevelopmentMutationResult,
} from '../../../domain/models/product-development-response.model';
import { ProductDevelopmentProjectAggregate } from '../../../domain/models/product-development-project.model';
import { ProductDevelopmentBomPayload, ProductDevelopmentDecisionPayload, ProductDevelopmentSavePayload } from '../../../domain/repositories/product-development.repository';
import { ProductDevelopmentFiltersComponent } from '../../components/product-development-filters/product-development-filters.component';
import { ProductDevelopmentKpisComponent } from '../../components/product-development-kpis/product-development-kpis.component';
import { ProductDevelopmentBoardComponent } from '../../components/product-development-board/product-development-board.component';
import { ProductDevelopmentFormComponent } from '../../components/product-development-form/product-development-form.component';
import { ProductDevelopmentBomComponent } from '../../components/product-development-bom/product-development-bom.component';
import { ProductDevelopmentRisksComponent } from '../../components/product-development-risks/product-development-risks.component';

@Component({
  selector: 'app-product-development-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    ProductDevelopmentFiltersComponent,
    ProductDevelopmentKpisComponent,
    ProductDevelopmentBoardComponent,
    ProductDevelopmentFormComponent,
    ProductDevelopmentBomComponent,
    ProductDevelopmentRisksComponent,
  ],
  template: `
    <div class="space-y-6">
      <section class="erp-page-header erp-page-header--dark">
        <div class="erp-page-header__content flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <p class="erp-page-eyebrow">SCM · HU-027</p>
            <h1 class="erp-page-title">Diseno y Desarrollo de Productos</h1>
            <p class="erp-page-description">
              Portafolio de innovacion para {{ activeCompanyName }}, con BOM preliminar, viabilidad, riesgos supply chain
              y creacion de producto maestro local cuando el proyecto queda aprobado.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Empresa activa</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ activeCompanyName }}</p>
              <p class="erp-meta-card__hint">Caso principal de innovacion sobre Industrias Alimenticias El Arbolito.</p>
            </article>
            <article class="erp-meta-card">
              <p class="erp-meta-card__label">Proyecto seleccionado</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ selectedProject?.project?.nombreProducto || 'Sin seleccion' }}</p>
              <p class="erp-meta-card__hint">Desde aqui evaluamos, aprobamos y lanzamos al maestro.</p>
            </article>
          </div>
        </div>
      </section>

      @if (errorMessage) { <div class="erp-alert erp-alert--error">{{ errorMessage }}</div> }
      @if (successMessage) { <div class="erp-alert erp-alert--success">{{ successMessage }}</div> }

      <div class="erp-action-strip">
        <button type="button" mat-flat-button color="primary" (click)="createMode()">Nuevo proyecto</button>
        @if (selectedProject) {
          <button type="button" mat-stroked-button (click)="evaluateSelected()">Evaluar viabilidad</button>
          <button type="button" mat-stroked-button (click)="approveSelected()">Aprobar</button>
          <button type="button" mat-stroked-button (click)="rejectSelected()">Rechazar</button>
          <button type="button" mat-stroked-button (click)="launchSelected()">Crear producto maestro</button>
        }
      </div>

      <app-product-development-filters [catalogs]="dashboard.catalogs" [filters]="filters" (apply)="handleFilters($event)" (reset)="resetFilters()" />
      <app-product-development-kpis [kpis]="dashboard.kpis" />

      <section class="erp-balanced-grid erp-balanced-grid--main">
        <app-product-development-board [projects]="dashboard.projects" [selectedProjectId]="selectedProject?.project?.id ?? null" (select)="selectProject($event)" />
        <app-product-development-risks [project]="selectedProject" />
      </section>

      <section class="erp-balanced-grid erp-balanced-grid--split">
        <app-product-development-form [project]="formProject" [catalogs]="dashboard.catalogs" (submit)="saveProject($event)" />
        <app-product-development-bom [projectId]="selectedProject?.project?.id ?? null" [bom]="selectedProject?.bom ?? []" [catalogs]="dashboard.catalogs" (save)="saveBomItem($event)" (remove)="removeBomItem($event)" />
      </section>
    </div>
  `,
})
export class ProductDevelopmentPageComponent {
  private readonly facade = inject(ProductDevelopmentFacadeService);

  dashboard = EMPTY_PRODUCT_DEVELOPMENT_DASHBOARD;
  filters: ProductDevelopmentFilters = { ...DEFAULT_PRODUCT_DEVELOPMENT_FILTERS };
  selectedProject: ProductDevelopmentProjectAggregate | null = null;
  formProject: ProductDevelopmentProjectAggregate | null = null;
  activeCompanyName = this.facade.getActiveCompanyName();
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor() {
    this.facade.activeCompany$.pipe(takeUntilDestroyed()).subscribe((company) => {
      if (!company) return;
      this.activeCompanyName = company.name;
      this.reload();
    });
  }

  createMode(): void {
    this.formProject = null;
  }

  handleFilters(filters: ProductDevelopmentFilters): void {
    this.filters = { ...filters };
    this.reload();
  }

  resetFilters(): void {
    this.filters = { ...DEFAULT_PRODUCT_DEVELOPMENT_FILTERS };
    this.reload();
  }

  selectProject(projectId: string): void {
    this.selectedProject = this.dashboard.projects.find((item) => item.project.id === projectId) ?? null;
    this.formProject = this.selectedProject;
  }

  saveProject(payload: ProductDevelopmentSavePayload): void {
    this.clearMessages();
    this.facade
      .saveProject(payload, this.formProject?.project.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => this.handleMutationResult(result),
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar el proyecto.';
        },
      });
  }

  saveBomItem(payload: ProductDevelopmentBomPayload): void {
    if (!this.selectedProject) return;
    this.clearMessages();
    this.facade.saveBomItem(this.selectedProject.project.id, payload).subscribe({
      next: (result) => this.handleMutationResult(result),
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible guardar el BOM.';
      },
    });
  }

  removeBomItem(bomItemId: string): void {
    if (!this.selectedProject) return;
    this.clearMessages();
    this.facade.deleteBomItem(this.selectedProject.project.id, bomItemId).subscribe({
      next: (result) => this.handleMutationResult(result),
      error: (error: unknown) => {
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible eliminar el item BOM.';
      },
    });
  }

  evaluateSelected(): void {
    if (!this.selectedProject) return;
    this.facade.evaluateProject(this.selectedProject.project.id).subscribe({
      next: (result) => this.handleMutationResult(result),
      error: (error: unknown) => (this.errorMessage = error instanceof Error ? error.message : 'No fue posible evaluar el proyecto.'),
    });
  }

  approveSelected(): void {
    if (!this.selectedProject) return;
    this.runDecision('approve', { usuario: 'demo.director-innovacion', observaciones: 'Proyecto aprobado para lanzamiento.' });
  }

  rejectSelected(): void {
    if (!this.selectedProject) return;
    this.runDecision('reject', { usuario: 'demo.director-innovacion', observaciones: 'Proyecto rechazado por ajuste de foco comercial.' });
  }

  launchSelected(): void {
    if (!this.selectedProject) return;
    this.runDecision('launch', { usuario: 'demo.pm-scm', observaciones: 'Producto maestro creado desde HU-027.' });
  }

  private runDecision(type: 'approve' | 'reject' | 'launch', payload: ProductDevelopmentDecisionPayload): void {
    const projectId = this.selectedProject?.project.id;
    if (!projectId) return;
    const request =
      type === 'approve'
        ? this.facade.approveProject(projectId, payload)
        : type === 'reject'
          ? this.facade.rejectProject(projectId, payload)
          : this.facade.launchProject(projectId, payload);

    request.subscribe({
      next: (result) => this.handleMutationResult(result),
      error: (error: unknown) => (this.errorMessage = error instanceof Error ? error.message : 'No fue posible procesar la accion.'),
    });
  }

  private reload(): void {
    this.facade.getDashboard(this.filters).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        if (this.selectedProject) {
          this.selectedProject = dashboard.projects.find((item) => item.project.id === this.selectedProject?.project.id) ?? dashboard.selectedProject;
          this.formProject = this.selectedProject;
        } else {
          this.selectedProject = dashboard.selectedProject;
        }
      },
      error: (error: unknown) => {
        this.dashboard = EMPTY_PRODUCT_DEVELOPMENT_DASHBOARD;
        this.selectedProject = null;
        this.errorMessage = error instanceof Error ? error.message : 'No fue posible cargar Desarrollo de Productos.';
      },
    });
  }

  private handleMutationResult(result: ProductDevelopmentMutationResult): void {
    this.successMessage = result.message;
    this.selectedProject = result.project;
    this.formProject = result.project;
    this.reload();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
