from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import mps_service

router = APIRouter()

@router.post("/generar")
def generar_mps(payload: dict, db: Session = Depends(get_db)):
    empresa_id = payload.get("empresa_id", "EMP-001")
    try:
        plan, total_items = mps_service.generar_plan_maestro(db, payload, empresa_id)
        return {
            "codigo": "OK",
            "planId": plan.id,
            "items_procesados": total_items,
            "estado": plan.estado
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))