from pydantic import BaseModel
from typing import Optional

class PickingCreate(BaseModel):
    pedido_id: str
    operario_id: int
    bodega_id: int

class ConfirmarItemPicking(BaseModel):
    pedido_id: str
    producto_id: int
    bodega_id: int
    cantidad: float
    lote_id: Optional[str] = None
    operario_id: int

class PackingClose(BaseModel):
    pedido_id: str
    peso_total: float
    numero_bultos: int