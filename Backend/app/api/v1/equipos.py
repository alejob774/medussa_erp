from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.equipos import EquipoCreate, EquipoResponse, EquipoUpdate
from app.services import equipo_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

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

# En equipos.py
@router.get("/{equipo_id}")
def obtener_equipo(equipo_id: int, db: Session = Depends(get_db)):
    return db.query(Equipo).filter(Equipo.id == equipo_id).first()

@router.delete("/{equipo_id}")
def eliminar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    db.query(Equipo).filter(Equipo.id == equipo_id).delete()
    db.commit()
    return {"status": "Equipo eliminado"}

# En proveedores.py
@router.get("/{proveedor_id}")
def obtener_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    return db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()