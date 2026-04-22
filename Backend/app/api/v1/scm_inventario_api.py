from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.scm_inventario_schema import ConteoCreate, RegistroFisico, VarianzaResumen
from typing import List

router = APIRouter()

@router.post("/conteo/iniciar")
def iniciar_conteo_ciclico(payload: ConteoCreate, db: Session = Depends(get_db)):
    # Lógica para abrir una sesión de conteo
    return {"id": 1, "status": "ABIERTO", "mensaje": "Sesión de conteo iniciada"}

@router.post("/conteo/registrar-linea")
def registrar_hallazgo(payload: RegistroFisico, db: Session = Depends(get_db)):
    # Aquí se registra lo que el operario ve en la bodega
    return {"status": "success", "mensaje": "Hallazgo registrado"}

@router.get("/conteo/{conteo_id}/diferencias", response_model=List[VarianzaResumen])
def consultar_diferencias(conteo_id: int, db: Session = Depends(get_db)):
    # Mock de respuesta para prueba de endpoint
    return [
        {
            "sku": "MAT-001",
            "stock_sistema": 100.0,
            "conteo_fisico": 95.0,
            "diferencia": -5.0,
            "impacto_financiero": -50.0
        }
    ]