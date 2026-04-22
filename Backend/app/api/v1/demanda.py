from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.demanda import ForecastCreate, ForecastResponse
from app.services import demanda_service
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/forecast", response_model=ForecastResponse)
async def generar_forecast(request: Request, plan_in: ForecastCreate, db: Session = Depends(get_db)):
    nuevo_plan = demanda_service.crear_plan_demanda(db, plan_in)
    
    await registrar_log(
        db, request, 
        modulo="SCM_PLANEACION", 
        accion="GENERAR_FORECAST", 
        objeto_id=nuevo_plan.id,
        descripcion=f"Generación de forecast versión {nuevo_plan.version}"
    )
    return nuevo_plan

@router.get("/forecast/{forecast_id}", response_model=ForecastResponse)
async def consultar_forecast(forecast_id: int, db: Session = Depends(get_db)):
    plan = demanda_service.obtener_forecast_por_id(db, forecast_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan de demanda no encontrado")
    return plan