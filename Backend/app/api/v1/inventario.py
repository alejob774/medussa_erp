from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.producto import ProductoResponse, ProductoUpdate, ProductoCreate
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ProductoResponse)
async def crear_nuevo_producto(
    obj_in: ProductoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # La validación de empresa_id ocurre dentro del servicio mediante get_company_context
    nuevo_producto = await crud.crear_producto(db, obj_in)
    
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="CREAR",
        empresa_id=nuevo_producto.empresa_id,
        payload_despues=jsonable_encoder(nuevo_producto)
    )
    return nuevo_producto

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
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta empresa")
    
    # Snapshot antes de la actualización
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