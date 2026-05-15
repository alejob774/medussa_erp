from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db
from app.schemas.conductor import ConductorCreate, ConductorResponse, ConductorUpdate
from app.services import conductor_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()


@router.post("/", response_model=ConductorResponse)
async def crear_conductor(
    obj_in: ConductorCreate,
    request: Request,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    conductor = await crud.crear_conductor(db, obj_in, empresa_id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="CONDUCTORES", accion="CREAR", empresa_id=empresa_id,
        payload_despues=jsonable_encoder(conductor)
    )
    return conductor


@router.get("/", response_model=List[ConductorResponse])
async def listar_conductores(
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500)
):
    return await crud.obtener_conductores(db, empresa_id, skip, limit)


@router.get("/{id}", response_model=ConductorResponse)
async def obtener_conductor(
    id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    return await crud.obtener_conductor_por_id(db, id, empresa_id)


@router.patch("/{id}", response_model=ConductorResponse)
async def actualizar_conductor(
    id: int,
    obj_in: ConductorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    conductor_antes = await crud.obtener_conductor_por_id(db, id, empresa_id)
    antes_dict = jsonable_encoder(conductor_antes)
    actualizado = await crud.actualizar_conductor(db, id, obj_in, empresa_id)

    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="CONDUCTORES", accion="ACTUALIZAR", empresa_id=empresa_id,
        payload_antes=antes_dict, payload_despues=jsonable_encoder(actualizado)
    )
    return actualizado


@router.delete("/{id}")
async def eliminar_conductor(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    conductor = await crud.eliminar_conductor_logico(db, id, empresa_id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="CONDUCTORES", accion="DELETE_LOGICO", empresa_id=empresa_id,
        payload_despues={"id": id, "estado": False}
    )
    return {"message": "Conductor desactivado correctamente", "id": conductor.id}
