from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_presupuesto_schema import PresupuestoCreate, PresupuestoResumen
from app.core.context import get_company_context

router = APIRouter()

@router.post("/cargar")
def cargar_presupuesto(payload: PresupuestoCreate, db: Session = Depends(get_db)):
    empresa_id = get_company_context()
    # Lógica para insertar o actualizar presupuesto mensual usando empresa_id
    return {"message": f"Presupuesto cargado exitosamente para la empresa {empresa_id}"}

@router.get("/ejecucion/{presupuesto_id}", response_model=PresupuestoResumen)
def obtener_ejecucion(presupuesto_id: int, db: Session = Depends(get_db)):
    empresa_id = get_company_context()
    # Aquí se debe validar que el presupuesto_id pertenezca a la empresa_id del contexto
    return {
        "id": presupuesto_id,
        "valor_aprobado": 5000.0,
        "valor_ejecutado": 1200.0,
        "disponible": 3800.0,
        "porcentaje_ejecucion": 24.0,
        "empresa_id": empresa_id
    }