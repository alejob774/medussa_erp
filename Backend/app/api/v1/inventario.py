# app/api/v1/inventario.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.producto import ProductoCreate, ProductoResponse
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ProductoResponse)
async def crear_producto(
    request: Request,
    obj_in: ProductoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Creación del producto en base de datos
    producto = await crud.crear_producto(db, obj_in)
    
    # Auditoría corregida: Se usa 'descripcion' y 'payload_despues'
    await registrar_log(
        db, 
        request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="CREAR_PRODUCTO",
        empresa_id=obj_in.empresa_id,
        descripcion=f"Producto creado: {obj_in.producto_nom}",
        payload_despues=obj_in.model_dump() # O .dict() según versión de Pydantic
    )
    return producto