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

### --- LISTAR PRODUCTOS (CONTEXTUAL) ---
@router.get("/", response_model=List[ProductoResponse])
async def listar_productos(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # El servicio ya filtra internamente por la empresa del contexto
    return await crud.obtener_productos_contextual(db, skip=skip, limit=limit)


### --- OBTENER POR ID ---
@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    producto = await crud.obtener_producto_por_id(db, producto_id)
    if not producto:
        raise HTTPException(
            status_code=404, 
            detail="Producto no encontrado o no pertenece a su empresa"
        )
    return producto


### --- CREAR ---
@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_nuevo_producto(
    obj_in: ProductoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
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


### --- ACTUALIZAR ---
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


### --- ELIMINAR (BORRADO LÓGICO) ---
@router.delete("/{producto_id}", status_code=status.HTTP_200_OK)
async def eliminar_producto(
    producto_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Verificar existencia y pertenencia
    producto = await crud.obtener_producto_por_id(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # 2. Ejecutar borrado lógico (Soft Delete)
    # Cambiamos el estatus según la definición de tu modelo (Inactivo)
    update_data = ProductoUpdate(producto_status="Inactivo")
    actualizado = await crud.actualizar_producto(db, producto_id, update_data)

    # 3. Registrar en auditoría
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="INVENTARIO",
        accion="ELIMINAR_LOGICO",
        empresa_id=actualizado.empresa_id,
        descripcion=f"Se marcó como inactivo el producto: {actualizado.producto_nom}"
    )

    return {"detail": "Producto eliminado correctamente (lógico)", "id": producto_id}