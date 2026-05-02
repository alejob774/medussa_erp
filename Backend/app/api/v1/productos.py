from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.producto import ProductoResponse, ProductoUpdate, ProductoCreate
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.get("/", response_model=List[ProductoResponse])
async def listar_productos(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return await crud.obtener_productos_contextual(db)

@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_nuevo_producto(obj_in: ProductoCreate, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    nuevo = await crud.crear_producto(db, obj_in)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="INVENTARIO", accion="CREAR", empresa_id=nuevo.empresa_id,
        payload_despues=jsonable_encoder(nuevo)
    )
    return nuevo

@router.delete("/{producto_id}")
async def eliminar_logico(producto_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    update_data = ProductoUpdate(producto_status="Inactivo")
    actualizado = await crud.actualizar_producto(db, producto_id, update_data)
    
    if not actualizado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="INVENTARIO", accion="ELIMINAR_LOGICO", empresa_id=actualizado.empresa_id,
        descripcion=f"Soft delete de SKU: {actualizado.producto_sku}"
    )
    return {"detail": "Producto desactivado correctamente"}