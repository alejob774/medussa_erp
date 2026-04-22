from pydantic import BaseModel, Field
from typing import Optional

class ProductoSimple(BaseModel):
    id: int
    producto_nom: str
    producto_sku: str
    
    class Config:
        from_attributes = True