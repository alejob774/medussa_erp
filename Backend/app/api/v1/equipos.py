from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.encoders import jsonable_encoder

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.equipos import Equipo  # Importación corregida
from app.models.vendedores import Vendedor as Proveedor # O el modelo correspondiente a proveedores
from app.schemas.equipos import EquipoCreate, EquipoResponse, EquipoUpdate
from app.services import equipo_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
async def crear_equipo(
    request: Request, 
    equipo_in: EquipoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validar si el ID de máquina ya existe
    if crud.get_equipo_by_id_maq(db, equipo_in.id_maq):
        raise HTTPException(
            status_code=400, 
            detail=f"El ID de máquina '{equipo_in.id_maq}' ya existe"
        )
    
    nuevo_equipo = crud.create_equipo(db, equipo_in)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="EQUIPOS", 
        accion="CREAR", 
        empresa_id=nuevo_equipo.empresa_id,
        payload_despues=jsonable_encoder(nuevo_equipo)
    )
    return nuevo_equipo

@router.get("/", response_model=List[EquipoResponse])
async def listar_equipos(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user),
    skip: int = 0, 
    limit: int = 100
):
    return crud.get_equipos(db, skip=skip, limit=limit)

@router.get("/{equipo_id}", response_model=EquipoResponse)
async def obtener_equipo(
    equipo_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo

@router.put("/{equipo_id}", response_model=EquipoResponse)
async def actualizar_equipo(
    equipo_id: int, 
    equipo_in: EquipoUpdate, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    equipo_actual = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo_actual:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    antes_dict = jsonable_encoder(equipo_actual)
    equipo_actualizado = crud.update_equipo(db, equipo_id, equipo_in)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="EQUIPOS", 
        accion="ACTUALIZAR", 
        empresa_id=equipo_actualizado.empresa_id,
        payload_antes=antes_dict,
        payload_despues=jsonable_encoder(equipo_actualizado)
    )
    return equipo_actualizado

@router.delete("/{equipo_id}")
async def eliminar_equipo(
    equipo_id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    crud.delete_equipo(db, equipo_id)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id, 
        user_name=current_user.username,
        modulo="EQUIPOS", 
        accion="ELIMINAR",
        empresa_id=equipo.empresa_id,
        payload_despues={"id": equipo_id, "status": "deleted"}
    )
    return {"message": "Equipo eliminado exitosamente"}