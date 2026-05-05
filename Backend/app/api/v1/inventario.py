<<<<<<< HEAD
from fastapi import APIRouter, Depends, Request, HTTPException, status
=======
from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
>>>>>>> Back
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
<<<<<<< HEAD
from app.api.deps import get_current_user
from app.schemas.producto import ProductoResponse, ProductoUpdate, ProductoCreate
=======
# CORRECCIÓN: Se añade get_current_company a la importación
from app.api.deps import get_current_user, get_current_company 
from app.schemas.producto import ProductoCreate, ProductoResponse, ProductoUpdate
>>>>>>> Back
from app.services import inventario_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

<<<<<<< HEAD
### --- LISTAR PRODUCTOS (CONTEXTUAL) ---
@router.get("/", response_model=List[ProductoResponse])
async def listar_productos(
    skip: int = 0, 
    limit: int = 100,
=======
@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(
    request: Request,
    obj_in: ProductoCreate, 
>>>>>>> Back
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
<<<<<<< HEAD
    # El servicio ya filtra internamente por la empresa del contexto
    return await crud.obtener_productos_contextual(db, skip=skip, limit=limit)
=======
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
    total, items = await crud.obtener_productos_paginados(db, empresa_id, skip, limit, search)
    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

# ... (imports existentes)
>>>>>>> Back


### --- OBTENER POR ID ---
@router.get("/{producto_id}", response_model=ProductoResponse)
async def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    producto = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not producto:
<<<<<<< HEAD
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
=======
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto[cite: 14]

@router.put("/{producto_id}", response_model=ProductoResponse)
>>>>>>> Back
async def actualizar_producto(
    producto_id: int,
    obj_in: ProductoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    db_obj = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto_upd = await crud.actualizar_producto(db, db_obj, obj_in)
    
    await registrar_log(db, request, user_id=current_user.id, user_name=current_user.username,
                        modulo="INVENTARIO", accion="UPDATE", empresa_id=empresa_id)
    return producto_upd[cite: 14]


### --- ELIMINAR (BORRADO LÓGICO) ---
@router.delete("/{producto_id}", status_code=status.HTTP_200_OK)
async def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
<<<<<<< HEAD
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
=======
    db_obj = await crud.obtener_producto_por_id(db, producto_id, empresa_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    await crud.eliminar_producto_logico(db, db_obj)
    return {"message": "Producto desactivado correctamente"}[cite: 14]
>>>>>>> Back
