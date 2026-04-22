# app/api/v1/analisis_demanda.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import analisis_service
from datetime import date

router = APIRouter()

# ELIMINA LAS BARRAS INVERTIDAS "\" AQUÍ:
@router.post("/procesar")
def ejecutar_analisis(empresa_id: str, periodo: date, db: Session = Depends(get_db)):
    return analisis_service.procesar_analisis_demanda(db, empresa_id, periodo)

@router.get("/dashboard")
def get_dashboard(empresa_id: str, db: Session = Depends(get_db)):
    return analisis_service.obtener_dashboard_analitico(db, empresa_id)