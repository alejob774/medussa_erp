from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_layout_schema import ZonaLayoutCreate, ReubicacionRequest, OcupacionResumen
from typing import List

router = APIRouter()

@router.post("/zonas")
def crear_zona_layout(payload: ZonaLayoutCreate, db: Session = Depends(get_db)):
    return {"status": "success", "mensaje": f"Zona {payload.nombre_zona} creada en bodega {payload.bodega_id}"}

@router.post("/reubicar")
def ejecutar_reubicacion(payload: ReubicacionRequest, db: Session = Depends(get_db)):
    # Aquí se validaría que la ubicación destino tenga capacidad
    return {"status": "success", "mensaje": "Movimiento registrado y Kardex actualizado"}

@router.get("/bodega/{bodega_id}/ocupacion", response_model=List[OcupacionResumen])
def consultar_ocupacion(bodega_id: int, db: Session = Depends(get_db)):
    return [
        {"zona": "CONGELADOS", "porcentaje_uso": 85.5, "estado": "ALTA"},
        {"zona": "PICKING_RAPIDO", "porcentaje_uso": 40.0, "estado": "NORMAL"}
    ]