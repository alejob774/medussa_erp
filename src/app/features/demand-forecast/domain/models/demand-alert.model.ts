export type DemandAlertType =
  | 'RIESGO_FALTANTE'
  | 'RIESGO_SOBRESTOCK'
  | 'BAJA_CONFIANZA'
  | 'AJUSTE_RELEVANTE';

export type DemandAlertSeverity = 'ALTA' | 'MEDIA' | 'BAJA';

export interface DemandAlert {
  id: string;
  forecastId: string;
  detailId?: string | null;
  companyId: string;
  companyName: string;
  type: DemandAlertType;
  severity: DemandAlertSeverity;
  skuId?: string | null;
  sku?: string | null;
  productName?: string | null;
  zone?: string | null;
  channel?: string | null;
  segment?: string | null;
  period?: string | null;
  title: string;
  description: string;
  metricValue?: number | null;
}

export interface DemandAlertSummary {
  shortage: number;
  overstock: number;
  lowConfidence: number;
  relevantAdjustments: number;
}
