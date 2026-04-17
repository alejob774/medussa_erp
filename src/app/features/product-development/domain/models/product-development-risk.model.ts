export type ProductDevelopmentRiskLevel = 'ALTO' | 'MEDIO' | 'BAJO';
export type ProductDevelopmentViability = 'ALTA' | 'MEDIA' | 'BAJA';

export interface ProductDevelopmentRiskSummary {
  skuDuplicado: boolean;
  bomIncompleta: boolean;
  lanzamientoProximo: boolean;
  proveedorCriticoUnico: boolean;
  insumoNoCubierto: boolean;
}
