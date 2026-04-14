# app/api/v1/rutas.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.logistica import Ruta
from app.schemas.logistica import RutaCreate, RutaUpdate, RutaResponse
from app.api.deps import get_current_user
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=RutaResponse, status_code=status.HTTP_201_CREATED)
async def crear_ruta(ruta_in: RutaCreate, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Validación de ID único [cite: 227]
    if db.query(Ruta).filter(Ruta.id_rut == ruta_in.id_rut).first():
        raise HTTPException(status_code=400, detail="ID_RUT ya existe")
    
    nueva_ruta = Ruta(**ruta_in.model_dump())
    db.add(nueva_ruta)
    db.commit()
    db.refresh(nueva_ruta)
    
    await registrar_log(db, request, modulo="LOGISTICA", accion="CREAR_RUTA")
    return nueva_ruta

@router.get("/", response_model=List[RutaResponse])
async def listar_rutas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Ruta).filter(Ruta.estado == True).offset(skip).limit(limit).all()

@router.put("/{ruta_id}", response_model=RutaResponse)
async def actualizar_ruta(ruta_id: int, ruta_in: RutaUpdate, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_ruta = db.query(Ruta).filter(Ruta.id == ruta_id).first()
    if not db_ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    for key, value in ruta_in.model_dump(exclude_unset=True).items():
        setattr(db_ruta, key, value)
    
    db.commit()
    await registrar_log(db, request, modulo="LOGISTICA", accion="ACTUALIZAR_RUTA", objeto_id=ruta_id)
    return db_ruta

@router.delete("/{ruta_id}")
async def eliminar_ruta(ruta_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_ruta = db.query(Ruta).filter(Ruta.id == ruta_id).first()
    if not db_ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    # Eliminación lógica [cite: 253]
    db_ruta.estado = False
    db.commit()
    
    await registrar_log(db, request, modulo="LOGISTICA", accion="ELIMINAR_RUTA", objeto_id=ruta_id)
    return {"message": "Ruta eliminada correctamente"}