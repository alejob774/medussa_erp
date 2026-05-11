from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date

class DashboardFiltros(BaseModel):
    empresaId: str
    fechaDesde: date
    fechaHasta: date
    sedeId: Optional[int] = None

class AlertaResponse(BaseModel):
    id: int
    tipo: str
    severidad: str
    mensaje: str
    estado: str
    
    class Config:
        from_attributes = True

class ProduccionRTData(BaseModel):
    produccionHoy: float
    ordenesAbiertas: int
    cumplimientoPlanPct: float
    unidadesPorLinea: List[Dict[str, Any]]
    paradasActivas: List[Dict[str, Any]]
    tiempoDetenidoMin: int

class OEEConsolidadoData(BaseModel):
    oeePlanta: float
    disponibilidad: float
    rendimiento: float
    calidad: float
    detallePorLinea: List[Dict[str, Any]]
    evolucionHistorica: List[Dict[str, Any]]

class CalidadDashboardData(BaseModel):
    lotesRechazados: int
    reclamosCliente: int
    scrapKg: float
    retrabajos: int
    costoMalaCalidad: float
    tasaRechazo: float
    scrapPct: float
    causasTop: List[Dict[str, Any]]
    tendenciaMensual: List[Dict[str, Any]]

class InventarioEstrategicoData(BaseModel):
    valorTotalCartera: float
    skuEnQuiebre: int
    skuSobreStock: int
    rotacionGlobal: float
    topCriticos: List[Dict[str, Any]]
    composicionPorBodega: List[Dict[str, Any]]
    analisisAntiguedad: Dict[str, int] 

class ComprasEstrategicasData(BaseModel):
    ahorrosCompras: float
    proveedorMasCostoso: str
    leadTimePromedioDias: float
    comprasUrgentes: int
    variacionPreciosPct: float

class KpiLogisticosData(BaseModel):
    costoPromedioPorPedido: float
    utilizacionFlotaPct: float
    productividadPromedioConductor: float 
    nivelServicioPuntualidad: float
    rankingRutasCostosas: List[Dict[str, Any]]
    distanciaTotalKm: float

class GrafanaDashboardMeta(BaseModel):
    modulo: str
    titulo: str
    grafana_url: str