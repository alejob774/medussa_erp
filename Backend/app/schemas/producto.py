from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal

class ProductoBase(BaseModel):
    producto_nom: Optional[str] = None
    producto_sku: Optional[str] = None
    producto_fam: Optional[str] = None
    producto_descrip: Optional[str] = None
    uom_base: Optional[str] = None
    producto_ref: Optional[str] = None
    maneja_lote: Optional[bool] = False
    maneja_venc: Optional[bool] = False
    vida_util: Optional[int] = None
    producto_status: Optional[str] = "Activo"
    fact_convers: Optional[Decimal] = None
    empresa_id: Optional[str] = None

class ProductoCreate(ProductoBase):
    producto_nom: str
    producto_sku: str
    uom_base: str
    empresa_id: str

class ProductoUpdate(ProductoBase):
    # Al heredar de ProductoBase, todos los campos ya son opcionales
    pass

class ProductoResponse(ProductoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)