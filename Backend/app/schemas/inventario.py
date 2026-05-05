from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MovimientoCreate(BaseModel):
    producto_id: int
    bodega_id: int
    cantidad: float
    tipo_movimiento: str # 'ENTRADA', 'SALIDA', 'RESERVA', 'BLOQUEO'
    documento_referencia: Optional[str] = None
    lote_id: Optional[str] = None
    observaciones: Optional[str] = None

    class Config:
        from_attributes = True

class SaldoResponse(BaseModel):
    producto_id: int
    bodega_id: int
    cantidad_fisica: float
    cantidad_disponible: float
    lote_id: Optional[str]

    class Config:
        from_attributes = True

class TransferenciaCreate(BaseModel):
    producto_id: int
    bodega_origen_id: int
    bodega_destino_id: int
    cantidad: float = Field(..., gt=0)
    lote_id: Optional[str] = None
    documento_referencia: Optional[str] = None