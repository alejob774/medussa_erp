from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_company, get_current_user
from app.services import calidad_service
from app.schemas.calidad import InspeccionCreate, InspeccionResponse

router = APIRouter()

@router.post("/inspecciones", response_model=InspeccionResponse)
async def crear_inspeccion(
    payload: InspeccionCreate, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    # Ahora enviamos datos validados y la empresa real del token
    return await calidad_service.registrar_inspeccion(db, payload, empresa_id)        
@router.get("/inspecciones/{id}", response_model=InspeccionResponse)
def consultar_inspeccion(id: int, db: Session = Depends(get_db)):
    inspeccion = db.query(CalidadInspeccion).filter(CalidadInspeccion.id == id).first()
    if not inspeccion:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    return inspeccion