from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_compras_schema import AnalisisCompraRequest
from app.services import scm_compras_service

router = APIRouter()

@router.post("/procesar")
def ejecutar_analisis_estrategico(
    payload: AnalisisCompraRequest, 
    db: Session = Depends(get_db)
):
    try:
        resultado = scm_compras_service.procesar_analisis_compras(
            db, payload.model_dump()
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
def obtener_dashboard_compras(empresa_id: str, db: Session = Depends(get_db)):
    # Aquí llamarías a la lógica de lectura que ya tenías
    return {"mensaje": f"Dashboard para {empresa_id} en construcción"}