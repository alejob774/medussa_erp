from pydantic import BaseModel
from typing import List

class PedidoDetalleCreate(BaseModel):
    producto_id: int
    bodega_id: int
    cantidad: float
    precio_unitario: float

class PedidoCreate(BaseModel):
    uuid_movil: str
    cliente_id: int
    vendedor_id: int
    detalles: List[PedidoDetalleCreate]