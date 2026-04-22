from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import oee_service

router = APIRouter()

@router.post("/registrar")
def registrar_oee(payload: dict, db: Session = Depends(get_db)):
    resultado = oee_service.calcular_y_guardar_oee(db, payload)
    return {
        "codigo": "OK",
        "disponibilidad": resultado.disponibilidad,
        "rendimiento": resultado.rendimiento,
        "calidad": resultado.calidad,
        "oee": resultado.oee_total
    }