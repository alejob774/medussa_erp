from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import tpm_service

router = APIRouter()

@router.post("/ordenes")
def registrar_falla(payload: dict, db: Session = Depends(get_db)):
    empresa_id = payload.get("empresa_id", "EMP-001")
    try:
        ot = tpm_service.crear_ot_correctiva(db, payload, empresa_id)
        return {"codigo": "OK", "ot_id": ot.id, "estado": ot.estado}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ordenes/{id}/cerrar")
def finalizar_mantenimiento(id: int, payload: dict, db: Session = Depends(get_db)):
    ot = tpm_service.cerrar_ot(db, id, payload)
    if not ot:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return {"codigo": "OK", "mensaje": "Orden cerrada exitosamente"}