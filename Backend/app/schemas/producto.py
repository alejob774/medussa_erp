from pydantic import BaseModel, Field, validator
from typing import Optional
from decimal import Decimal

class ProductoBase(BaseModel):
    producto_nom: str = Field(..., max_length=50)
    producto_sku: str = Field(..., max_length=50)
    producto_fam: str = Field(..., max_length=50)
    producto_descrip: str = Field(..., max_length=200)
    uom_base: str = Field(..., max_length=10)
    producto_ref: Optional[str] = None
    maneja_lote: bool = False
    maneja_venc: bool = False
    vida_util: Optional[int] = None
    producto_status: str = "Activo"
    fact_convers: Optional[Decimal] = None
    empresa_id: str

    @validator('vida_util')
    def validar_vida_util(cls, v, values):
        if values.get('maneja_venc') is True and v is None:
            raise ValueError('La vida útil es obligatoria cuando el producto maneja vencimiento') [cite: 51]
        return v

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(ProductoBase):
    producto_nom: Optional[str] = None
    producto_sku: Optional[str] = None
    # Permitir actualizaciones parciales

class ProductoResponse(ProductoBase):
    id: int

    class Config:
        from_attributes = True