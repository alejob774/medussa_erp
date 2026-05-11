from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company
from app.services import tpm_service
from app.schemas.tpm import OTUpdate

router = APIRouter()

@router.post("/ordenes/{id}/cerrar")
async def finalizar_mantenimiento(
    id: int, 
    payload: OTUpdate, 
    db: Session = Depends(get_db), 
    empresa_id: str = Depends(get_current_company)
):
    ot = await tpm_service.cerrar_ot(db, id, payload, empresa_id)
    if not ot:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return {"success": True, "mensaje": "Orden cerrada y repuestos descontados"}