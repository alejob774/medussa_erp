from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from fastapi.encoders import jsonable_encoder
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.vendedor import VendedorCreate, VendedorResponse, VendedorUpdate
from app.services import vendedor_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=VendedorResponse)
async def crear_vendedor(
    request: Request,
    obj_in: VendedorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    vendedor = await crud.crear_vendedor(db, obj_in)
    
    # Ajustamos 'despues' por 'payload_despues' para que coincida con tu auditoria.py
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="VENDEDORES", 
        accion="CREAR",
        payload_despues=jsonable_encoder(vendedor) 
    )
    return vendedor

@router.get("/", response_model=List[VendedorResponse])
async def listar_vendedores(db: Session = Depends(get_db)):
    return await crud.obtener_vendedores(db)

@router.patch("/{id}", response_model=VendedorResponse)
async def actualizar_vendedor(
    id: int,
    obj_in: VendedorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Obtenemos el estado previo
    vendedor_antes = await crud.obtener_vendedor_por_id(db, id)
    antes_dict = jsonable_encoder(vendedor_antes)
    
    # Realizamos la actualización
    actualizado = await crud.actualizar_vendedor(db, id, obj_in)
    
    # CORRECCIÓN AQUÍ: Cambiamos 'antes' por 'payload_antes' 
    # y 'despues' por 'payload_despues'
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="VENDEDORES", 
        accion="ACTUALIZAR",
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
        modulo="VENDEDORES", accion="ELIMINAR_LOGICO",
        descripcion=f"Vendedor {vendedor.id_ven} desactivado"
    )
    return {"message": "Vendedor desactivado correctamente"}