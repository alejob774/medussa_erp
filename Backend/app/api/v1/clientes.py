from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.encoders import jsonable_encoder
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.services import cliente_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ClienteResponse)
async def crear_cliente(
    request: Request,
    obj_in: ClienteCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Ahora la función existe en el service
    cliente = await crud.crear_cliente(db, obj_in)
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="CLIENTES", accion="CREAR",
        empresa_id=cliente.empresa_id,
        payload_despues=jsonable_encoder(cliente)
    )
    return cliente

@router.get("/", response_model=List[ClienteResponse])
async def listar_clientes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Se alinea el nombre de obtener_clientes
    return await crud.obtener_clientes(db)

@router.patch("/{id}", response_model=ClienteResponse)
async def actualizar_cliente(
    id: int,
    obj_in: ClienteUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    cliente_antes = await crud.obtener_cliente_por_id(db, id)
    antes_dict = jsonable_encoder(cliente_antes)
    
    actualizado = await crud.actualizar_cliente(db, id, obj_in)
    
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="CLIENTES",
        accion="ACTUALIZAR",
        empresa_id=actualizado.empresa_id,
        payload_antes=antes_dict,
        payload_despues=jsonable_encoder(actualizado)
    )
    return actualizado

@router.delete("/{id}")
async def dar_de_baja_cliente(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Se corrige llamada a eliminar_cliente_logico
    cliente = await crud.eliminar_cliente_logico(db, id)
    
    await registrar_log(
        db, request,
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="CLIENTES",
        accion="DELETE_LOGICO",
        empresa_id=cliente.empresa_id,
        payload_despues={"id": id, "estado": False}
    )
    return {"message": "Cliente desactivado exitosamente"}