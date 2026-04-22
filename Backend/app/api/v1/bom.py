from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.services import bom_service
from app.models.bom import ProduccionBOM
# ESTA ES LA LÍNEA QUE FALTA:
from app.schemas.bom import BOMCreate, BOMResponse

router = APIRouter()

@router.post("/")
def crear_receta(payload: dict, db: Session = Depends(get_db)):
    # Nota: empresa_id debería venir del JWT en producción
    empresa_id = payload.get("empresa_id", "EMP-DEFAULT")
    try:
        resultado = bom_service.crear_formula_bom(db, payload, empresa_id)
        return {
            "codigo": "OK",
            "formula_id": resultado["formula"].id,
            "version": resultado["formula"].version,
            "estado": resultado["formula"].estado,
            "costo_total": resultado["costo_estandar_lote"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/aprobar")
def aprobar_receta(id: int, db: Session = Depends(get_db)):
    formula = bom_service.aprobar_formula(db, id)
    if not formula:
        raise HTTPException(status_code=404, detail="Fórmula no encontrada")
    return {"codigo": "OK", "nuevo_estado": formula.estado}
    
@router.get("/", response_model=List[BOMResponse])
def listar_recetas(db: Session = Depends(get_db)):
    return db.query(ProduccionBOM).all()

@router.get("/{id}", response_model=BOMResponse)
def obtener_receta(id: int, db: Session = Depends(get_db)):
    receta = db.query(ProduccionBOM).filter(ProduccionBOM.id == id).first()
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return receta

@router.delete("/{id}")
def eliminar_receta(id: int, db: Session = Depends(get_db)):
    db.query(ProduccionBOM).filter(ProduccionBOM.id == id).delete()
    db.commit()
    return {"mensaje": "Receta eliminada"}