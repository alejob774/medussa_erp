import { Observable } from 'rxjs';
import { ProductDevelopmentFilters } from '../models/product-development-filters.model';
import { ProductDevelopmentDashboard } from '../models/product-development-project.model';
import { ProductDevelopmentMutationResult } from '../models/product-development-response.model';

export interface ProductDevelopmentSavePayload {
  nombreProducto: string;
  categoria: string;
  skuPropuesto: string;
  mercadoObjetivo: string;
  proyeccionVentas: number | null;
  fechaLanzamiento: string;
  responsableProyecto: string;
  capacidadRequerida: number | null;
  capacidadDisponible: number | null;
  proveedoresCriticos: string[];
  materialesCriticos: string[];
  observaciones?: string | null;
}

export interface ProductDevelopmentBomPayload {
  itemCodigo: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  costoEstimado: number;
}

export interface ProductDevelopmentDecisionPayload {
  usuario: string;
  observaciones?: string | null;
}

export interface ProductDevelopmentRepository {
  getDashboard(companyId: string, filters: ProductDevelopmentFilters): Observable<ProductDevelopmentDashboard>;
  saveProject(
    companyId: string,
    payload: ProductDevelopmentSavePayload,
    projectId?: string,
  ): Observable<ProductDevelopmentMutationResult>;
  saveBomItem(
    companyId: string,
    projectId: string,
    payload: ProductDevelopmentBomPayload,
    bomItemId?: string,
  ): Observable<ProductDevelopmentMutationResult>;
  deleteBomItem(
    companyId: string,
    projectId: string,
    bomItemId: string,
  ): Observable<ProductDevelopmentMutationResult>;
  evaluateProject(companyId: string, projectId: string): Observable<ProductDevelopmentMutationResult>;
  approveProject(
    companyId: string,
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult>;
  rejectProject(
    companyId: string,
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult>;
  launchProject(
    companyId: string,
    projectId: string,
    payload: ProductDevelopmentDecisionPayload,
  ): Observable<ProductDevelopmentMutationResult>;
}
