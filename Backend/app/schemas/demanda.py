from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class ForecastDetalleBase(BaseModel):
    producto_id: int
    periodo: date
    demanda_historica: float
    forecast_sistema: float
    ajuste_manual: float
    stock_seguridad: float

class ForecastCreate(BaseModel):
    empresa_id: str
    version: str
    horizonte: str
    fecha_inicio: date
    fecha_fin: date
    detalles: List[ForecastDetalleBase]

class ForecastResponse(BaseModel):
    id: int
    version: str
    estado: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True