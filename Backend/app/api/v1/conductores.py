from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.conductor import ConductorCreate, ConductorResponse, ConductorUpdate
from app.services import conductor_service as crud
from app.models.conductores import Conductor
from app.models.logistica import Ruta
from app.api.v1.auth import get_current_user # Asumiendo nombre de función
from app.utils.auditoria import registrar_log # Función que creamos antes
from fastapi.encoders import jsonable_encoder

router = APIRouter()

@router.post("/", response_model=ConductorResponse)
async def crear_conductor(
    obj_in: ConductorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    conductor = await crud.crear_conductor(db, obj_in)
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        modulo="CONDUCTORES", accion="CREAR",
        payload_despues=jsonable_encoder(conductor)
    )
    return conductor

@router.patch("/{id}", response_model=ConductorResponse)
async def actualizar_conductor(
    id: int,
    obj_in: ConductorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Ahora 'Conductor' ya estará definido y no fallará aquí:
    conductor_antes = db.query(Conductor).filter(Conductor.id == id).first()
    if not conductor_antes:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
    antes_dict = jsonable_encoder(conductor_antes)
    
    actualizado = await crud.actualizar_conductor(db, id, obj_in)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="CONDUCTORES", 
        accion="ACTUALIZAR",
        payload_antes=antes_dict, 
        payload_despues=jsonable_encoder(actualizado)
    )
    return actualizado