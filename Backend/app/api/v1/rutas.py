from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db
from app.schemas.logistica import RutaCreate, RutaUpdate, RutaResponse, RutaPaginatedResponse
from app.services import ruta_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()


@router.get("/", response_model=RutaPaginatedResponse)
async def listar_rutas(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    total, data = await crud.obtener_rutas(db, empresa_id, skip, limit)
    return {"success": True, "data": data, "total": total, "skip": skip, "limit": limit}


@router.post("/", response_model=RutaResponse, status_code=status.HTTP_201_CREATED)
async def crear_ruta(
    request: Request,
    ruta_in: RutaCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    nueva_ruta = await crud.crear_ruta(db, ruta_in, empresa_id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="LOGISTICA", accion="CREAR_RUTA", empresa_id=empresa_id
    )
    return nueva_ruta


@router.get("/{ruta_id}", response_model=RutaResponse)
async def obtener_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    return await crud.obtener_ruta_por_id(db, ruta_id, empresa_id)


@router.put("/{ruta_id}", response_model=RutaResponse)
async def actualizar_ruta(
    request: Request,
    ruta_id: int,
    ruta_in: RutaUpdate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    ruta_antes = await crud.obtener_ruta_por_id(db, ruta_id, empresa_id)
    antes_dict = jsonable_encoder(ruta_antes)
    actualizada = await crud.actualizar_ruta(db, ruta_id, ruta_in, empresa_id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="LOGISTICA", accion="ACTUALIZAR_RUTA", empresa_id=empresa_id,
        payload_antes=antes_dict, payload_despues=jsonable_encoder(actualizada)
    )
    return actualizada


@router.patch("/{ruta_id}", response_model=RutaResponse)
async def actualizar_ruta_parcial(
    request: Request,
    ruta_id: int,
    ruta_in: RutaUpdate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    return await actualizar_ruta(request, ruta_id, ruta_in, db, empresa_id, current_user)


@router.delete("/{ruta_id}", status_code=status.HTTP_200_OK)
async def eliminar_ruta(
    request: Request,
    ruta_id: int,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    await crud.eliminar_ruta(db, ruta_id, empresa_id)
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="LOGISTICA", accion="ELIMINAR_RUTA", empresa_id=empresa_id
    )
    return {"success": True, "detail": "Ruta eliminada logicamente"}
