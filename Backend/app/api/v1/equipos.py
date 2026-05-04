from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db

from app.api.deps import get_current_company, get_current_user

from app.schemas.equipos import EquipoCreate, EquipoResponse, EquipoUpdate
from app.services import equipo_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.get("/{equipo_id}", response_model=EquipoResponse)
def obtener_equipo(
    equipo_id: int, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company) # Tenant[cite: 21]
):
    # Filtrado por empresa activa[cite: 21]
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id, Equipo.empresa_id == empresa_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo

@router.delete("/{equipo_id}")
async def eliminar_equipo(
    request: Request,
    equipo_id: int, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id, Equipo.empresa_id == empresa_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # Cambio a SOFT DELETE[cite: 17]
    equipo.estado = False
    db.commit()
    
    await registrar_log(db, request, user_id=current_user.id, user_name=current_user.username,
                        modulo="EQUIPOS", accion="SOFT_DELETE", empresa_id=empresa_id)
    return {"status": "Equipo desactivado correctamente"}

@router.post("/", response_model=EquipoResponse)
async def crear_equipo(request: Request, equipo_in: EquipoCreate, db: Session = Depends(get_db)):
    if crud.get_equipo_by_id_maq(db, equipo_in.id_maq):
        raise HTTPException(status_code=400, detail="El ID de máquina ya existe")
    
    nuevo_equipo = crud.create_equipo(db, equipo_in)
    await registrar_log(db, request, modulo="EQUIPOS", accion="CREAR", objeto_id=nuevo_equipo.id)
    return nuevo_equipo

@router.get("/", response_model=list[EquipoResponse])
async def listar_equipos(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return crud.get_equipos(db, skip=skip, limit=limit)

@router.put("/{equipo_id}", response_model=EquipoResponse)
async def actualizar_equipo(request: Request, equipo_id: int, equipo_in: EquipoUpdate, db: Session = Depends(get_db)):
    equipo = crud.update_equipo(db, equipo_id, equipo_in)
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    await registrar_log(db, request, modulo="EQUIPOS", accion="ACTUALIZAR", objeto_id=equipo_id)
    return equipo