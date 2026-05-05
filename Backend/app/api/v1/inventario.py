from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_company 
from app.schemas.producto import ProductoCreate, ProductoResponse, ProductoUpdate
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(
    request: Request,
    obj_in: ProductoCreate, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Crea un producto validando que el SKU sea único dentro de la empresa."""
    existe = await crud.validar_sku_empresa(db, obj_in.producto_sku, empresa_id)
    if existe:
        raise HTTPException(status_code=400, detail="El SKU ya existe en esta empresa")

    nuevo_producto = await crud.crear_producto(db, obj_in, empresa_id)
    
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="CREATE",
        empresa_id=empresa_id,
        payload_despues=jsonable_encoder(nuevo_producto)
    )
    return nuevo_producto

@router.get("/", response_model=dict)
async def listar_productos(
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = None
):
    """Lista productos con paginación y búsqueda, filtrados por la empresa actual."""
    total, items = await crud.obtener_productos_paginados(db, empresa_id, skip, limit, search)
    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    """Obtiene el detalle de un producto específico validando la pertenencia a la empresa."""
    producto = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado o no pertenece a su empresa")
    return producto

@router.put("/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: int,
    obj_in: ProductoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Actualiza la información de un producto."""
    db_obj = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto_upd = await crud.actualizar_producto(db, db_obj, obj_in)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="INVENTARIO", 
        accion="UPDATE", 
        empresa_id=empresa_id,
        payload_despues=jsonable_encoder(producto_upd)
    )
    return producto_upd

@router.delete("/{producto_id}", status_code=status.HTTP_200_OK)
async def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    """Realiza la desactivación lógica (Soft Delete) del producto."""
    db_obj = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    await crud.eliminar_producto_logico(db, db_obj)
    return {"message": "Producto desactivado correctamente"}