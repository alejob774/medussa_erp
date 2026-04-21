export type QualityControlType = 'RECEPCION' | 'PROCESO' | 'PRODUCTO_TERMINADO';

export type QualityLotStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CUARENTENA';

export type QualityNonConformityStatus = 'ABIERTA' | 'EN_ANALISIS' | 'CERRADA';

export type QualityDecisionAction = 'APROBAR' | 'RECHAZAR' | 'CUARENTENA' | 'REINSPECCION';
