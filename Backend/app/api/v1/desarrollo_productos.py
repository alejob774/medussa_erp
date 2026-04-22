# app/api/v1/desarrollo_productos.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import desarrollo_service
from app.schemas.desarrollo_schemas import ProyectoCreate, ProyectoResponse

router = APIRouter() # <--- ESTO DEBE ESTAR AQUÍ

@router.post("/", response_model=ProyectoResponse)
def crear_proyecto(data: ProyectoCreate, db: Session = Depends(get_db)):
    return desarrollo_service.crear_proyecto_desarrollo(db, data.dict())