import { ProductDevelopmentRiskLevel, ProductDevelopmentViability } from './product-development-risk.model';
import { ProductDevelopmentStatus } from './product-development-project.model';

export interface ProductDevelopmentFilters {
  estado: ProductDevelopmentStatus | 'TODOS';
  categoria: string | null;
  responsable: string | null;
  fechaLanzamientoDesde: string | null;
  fechaLanzamientoHasta: string | null;
  viabilidad: ProductDevelopmentViability | 'TODAS';
  riesgoAbastecimiento: ProductDevelopmentRiskLevel | 'TODOS';
}

export const DEFAULT_PRODUCT_DEVELOPMENT_FILTERS: ProductDevelopmentFilters = {
  estado: 'TODOS',
  categoria: null,
  responsable: null,
  fechaLanzamientoDesde: null,
  fechaLanzamientoHasta: null,
  viabilidad: 'TODAS',
  riesgoAbastecimiento: 'TODOS',
};
