from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.producto import ProductoCreate, ProductoResponse, ProductoUpdate
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.get("/", response_model=List[ProductoResponse])
async def listar_productos(
    empresa_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await crud.obtener_productos(db, empresa_id, skip, limit)

@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    producto = await crud.obtener_producto_por_id(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.patch("/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: int,
    obj_in: ProductoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    producto_actual = await crud.obtener_producto_por_id(db, producto_id)
    if not producto_actual:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    antes = jsonable_encoder(producto_actual)
    actualizado = await crud.actualizar_producto(db, producto_id, obj_in)
    
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="ACTUALIZAR",
        empresa_id=actualizado.empresa_id,
        payload_antes=antes,
        payload_despues=jsonable_encoder(actualizado)
    )
    return actualizado

@router.delete("/{producto_id}")
async def eliminar_producto(
    producto_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    producto = await crud.eliminar_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="ELIMINAR_LOGICO",
        empresa_id=producto.empresa_id,
        descripcion=f"Producto {producto.producto_sku} marcado como Inactivo"
    )
    return {"status": "success", "message": "Producto desactivado"}