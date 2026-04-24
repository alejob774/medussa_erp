from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_compras_schema import AnalisisCompraRequest
from app.services import scm_compras_service
from app.core.context import get_company_context

router = APIRouter()

@router.post("/procesar")
def ejecutar_analisis_estrategico(
    payload: AnalisisCompraRequest, 
    db: Session = Depends(get_db)
):
    empresa_id = get_company_context()
    try:
        # Se inyecta el empresa_id del contexto al diccionario de datos
        datos = payload.model_dump()
        datos["empresa_id"] = empresa_id
        
        resultado = scm_compras_service.procesar_analisis_compras(db, datos)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
def obtener_dashboard_compras(db: Session = Depends(get_db)):
    empresa_id = get_company_context()
    return {"mensaje": f"Dashboard para empresa {empresa_id} en construcción"}