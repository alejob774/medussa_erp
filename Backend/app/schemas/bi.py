from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date

class DashboardResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

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

class ProduccionRTResponse(BaseModel):
    success: bool
    data: ProduccionRTData

class OEEConsolidadoData(BaseModel):
    oeePlanta: float
    disponibilidad: float
    rendimiento: float
    calidad: float
    detallePorLinea: List[Dict[str, Any]]
    evolucionHistorica: List[Dict[str, Any]]

class OEEConsolidadoResponse(BaseModel):
    success: bool
    data: OEEConsolidadoData

# app/schemas/bi.py (referenciado como bi_schemas_8.py)

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

class CalidadDashboardResponse(BaseModel):
    success: bool
    data: CalidadDashboardData

class InventarioEstrategicoData(BaseModel):
    valorTotalCartera: float
    skuEnQuiebre: int
    skuSobreStock: int
    rotacionGlobal: float
    topCriticos: List[Dict[str, Any]]  #[cite: 22]
    composicionPorBodega: List[Dict[str, Any]]
    analisisAntiguedad: Dict[str, int] # Lento movimiento[cite: 22]

class InventarioEstrategicoResponse(BaseModel):
    success: bool
    data: InventarioEstrategicoData

class ComprasEstrategicasData(BaseModel):
    ahorrosCompras: float
    proveedorMasCostoso: str
    leadTimePromedioDias: float
    comprasUrgentes: int
    variacionPreciosPct: float

class ComprasEstrategicasResponse(BaseModel):
    success: bool
    data: ComprasEstrategicasData

# Agregar a bi_schemas_11.py
class KpiLogisticosData(BaseModel):
    costoPromedioPorPedido: float
    utilizacionFlotaPct: float
    productividadPromedioConductor: float # Pedidos/Conductor
    nivelServicioPuntualidad: float
    rankingRutasCostosas: List[Dict[str, Any]]
    distanciaTotalKm: float

class KpiLogisticosResponse(BaseModel):
    success: bool
    data: KpiLogisticosData



