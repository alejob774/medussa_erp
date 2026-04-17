import { ProductDevelopmentBomItem } from './product-development-bom-item.model';
import {
  ProductDevelopmentRiskLevel,
  ProductDevelopmentRiskSummary,
  ProductDevelopmentViability,
} from './product-development-risk.model';
import { ProductDevelopmentKpis } from './product-development-kpi.model';

export type ProductDevelopmentStatus =
  | 'BORRADOR'
  | 'EN_EVALUACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'LANZADO';

export interface ProductDevelopmentProject {
  id: string;
  empresaId: string;
  empresaNombre: string;
  nombreProducto: string;
  categoria: string;
  skuPropuesto: string;
  mercadoObjetivo: string;
  proyeccionVentas: number | null;
  fechaLanzamiento: string;
  responsableProyecto: string;
  costoEstimado: number | null;
  margenEstimado: number | null;
  capacidadRequerida: number | null;
  capacidadDisponible: number | null;
  viabilidadGeneral: ProductDevelopmentViability | null;
  riesgoAbastecimiento: ProductDevelopmentRiskLevel | null;
  riesgoOperativo: ProductDevelopmentRiskLevel | null;
  riesgoLogistico: ProductDevelopmentRiskLevel | null;
  proveedoresCriticos: string[];
  materialesCriticos: string[];
  estadoProyecto: ProductDevelopmentStatus;
  fechaCreacion: string;
  fechaDecision: string | null;
  observaciones: string | null;
  productoMaestroCreado: boolean;
  productoMaestroId?: string | null;
}

export interface ProductDevelopmentProjectAggregate {
  project: ProductDevelopmentProject;
  bom: ProductDevelopmentBomItem[];
  risks: ProductDevelopmentRiskSummary;
}

export interface ProductDevelopmentCatalogOption {
  value: string;
  label: string;
}

export interface ProductDevelopmentCatalogs {
  categories: ProductDevelopmentCatalogOption[];
  targetMarkets: ProductDevelopmentCatalogOption[];
  responsables: ProductDevelopmentCatalogOption[];
  units: ProductDevelopmentCatalogOption[];
  suppliers: ProductDevelopmentCatalogOption[];
  statuses: ProductDevelopmentCatalogOption[];
  viabilities: ProductDevelopmentCatalogOption[];
  riskLevels: ProductDevelopmentCatalogOption[];
}

export interface ProductDevelopmentDashboard {
  filters: import('./product-development-filters.model').ProductDevelopmentFilters;
  catalogs: ProductDevelopmentCatalogs;
  kpis: ProductDevelopmentKpis;
  projects: ProductDevelopmentProjectAggregate[];
  selectedProject: ProductDevelopmentProjectAggregate | null;
}
