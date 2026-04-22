from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional

class AnalisisBase(BaseModel):
    sku_id: int
    periodo: date
    ventas_reales: float
    forecast_planeado: float
    mape: float
    sesgo: float

class DashboardResumen(BaseModel):
    mape_global: float
    total_ventas: float
    total_forecast: float
    cumplimiento_pct: float
    alertas_criticas: int

class TopSKUAnalisis(BaseModel):
    sku_nom: str
    mape: float
    impacto_ventas: float