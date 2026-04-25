from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.encoders import jsonable_encoder
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.vendedor import VendedorCreate, VendedorResponse, VendedorUpdate
from app.services import vendedor_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=VendedorResponse, status_code=status.HTTP_201_CREATED)
async def crear_vendedor(
    request: Request,
    obj_in: VendedorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    vendedor = await crud.crear_vendedor(db, obj_in)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="VENDEDORES", accion="CREAR",
        empresa_id=vendedor.empresa_id,
        payload_despues=jsonable_encoder(vendedor)
    )
    return vendedor

@router.get("/", response_model=List[VendedorResponse])
async def listar_vendedores(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return await crud.obtener_vendedores(db)

@router.get("/{id}", response_model=VendedorResponse)
async def obtener_detalle_vendedor(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # El service ya lanza el 404 si no existe
    return await crud.obtener_vendedor_por_id(db, id)

@router.patch("/{id}", response_model=VendedorResponse)
async def actualizar_vendedor(
    id: int,
    obj_in: VendedorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    vendedor_antes = await crud.obtener_vendedor_por_id(db, id)
    antes_dict = jsonable_encoder(vendedor_antes)
    
    actualizado = await crud.actualizar_vendedor(db, id, obj_in)
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="VENDEDORES", accion="ACTUALIZAR",
        empresa_id=actualizado.empresa_id,
        payload_antes=antes_dict,
        payload_despues=jsonable_encoder(actualizado)
    )
    return actualizado

@router.delete("/{id}")
async def eliminar_vendedor(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    vendedor = await crud.eliminar_vendedor_logico(db, id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="VENDEDORES", accion="DELETE_LOGICO",
        empresa_id=vendedor.empresa_id,
        payload_despues={"id": id, "estado": False}
    )
    return {"message": "Vendedor desactivado correctamente"}