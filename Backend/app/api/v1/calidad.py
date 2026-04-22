from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services import calidad_service
from app.schemas.calidad import InspeccionCreate, InspeccionResponse

router = APIRouter()

@router.post("/inspecciones")
def crear_inspeccion(payload: dict, db: Session = Depends(get_db)):
    empresa_id = payload.get("empresa_id", "EMP-001")
    try:
        resultado = calidad_service.registrar_inspeccion(db, payload, empresa_id)
        return {
            "codigo": "OK",
            "estadoLote": resultado.estado_lote,
            "liberacion": "SI" if resultado.liberado else "NO",
            "inspeccionId": resultado.id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
@router.get("/inspecciones/{id}", response_model=InspeccionResponse)
def consultar_inspeccion(id: int, db: Session = Depends(get_db)):
    inspeccion = db.query(CalidadInspeccion).filter(CalidadInspeccion.id == id).first()
    if not inspeccion:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    return inspeccion