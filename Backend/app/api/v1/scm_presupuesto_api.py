from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_presupuesto_schema import PresupuestoCreate, PresupuestoResumen

router = APIRouter()

@router.post("/cargar")
def cargar_presupuesto(payload: PresupuestoCreate, db: Session = Depends(get_db)):
    # Lógica para insertar o actualizar presupuesto mensual
    return {"message": "Presupuesto cargado exitosamente"}

@router.get("/ejecucion/{id}", response_model=PresupuestoResumen)
def obtener_ejecucion(id: int, db: Session = Depends(get_db)):
    # Lógica para calcular disponible y % de ejecución
    return {
        "id": id,
        "valor_aprobado": 5000.0,
        "valor_ejecutado": 1200.0,
        "disponible": 3800.0,
        "porcentaje_ejecucion": 24.0
    }