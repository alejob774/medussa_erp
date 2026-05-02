from pydantic import BaseModel
from typing import Optional

class ProductoBase(BaseModel):
    producto_nom: str
    producto_sku: str
    producto_fam: str
    uom_base: str
    maneja_lote: bool = False
    maneja_venc: bool = False
    metodo_costo: str = "Promedio"

class ProductoCreate(ProductoBase):
    producto_descrip: str
    vida_util: Optional[int] = None

class ProductoUpdate(BaseModel):
    producto_nom: Optional[str] = None
    producto_descrip: Optional[str] = None
    producto_status: Optional[str] = None
    metodo_costo: Optional[str] = None

class ProductoResponse(ProductoBase):
    id: int
    empresa_id: str
    producto_status: str

    class Config:
        from_attributes = True