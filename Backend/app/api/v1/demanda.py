from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.context import get_company_context
from app.schemas.demanda import ForecastCreate, ForecastResponse, ForecastUpdate
from app.services import demanda_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

# HU-025: Listar todos los planes de la empresa (Endpoint 'list')
@router.get("/forecast", response_model=List[ForecastResponse])
async def listar_forecasts(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    empresa_id = get_company_context()
    return crud.obtener_todos_forecasts(db, empresa_id=empresa_id)

# HU-026: Dashboard de Analítica (Endpoint 'dashboard')
@router.get("/dashboard/kpis")
async def obtener_dashboard_demanda(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    empresa_id = get_company_context()
    # Aquí el service debe calcular promedios reales de la tabla scm_demanda_analisis
    stats = crud.calcular_kpis_demanda(db, empresa_id)
    return stats

# HU-029: Obtener estados válidos (Endpoint 'estados')
@router.get("/config/estados")
async def obtener_estados_demanda():
    return {
        "estados_forecast": ["Borrador", "En Revision", "Aprobado", "Cerrado"],
        "prioridades": ["Baja", "Media", "Alta", "Critica"]
    }

# HU-025: Actualización de estado o datos (Endpoint 'update')
@router.patch("/forecast/{forecast_id}", response_model=ForecastResponse)
async def actualizar_forecast(
    forecast_id: int,
    obj_in: ForecastUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    empresa_id = get_company_context()
    
    # Snapshot antes de actualizar para auditoría
    plan_antes = crud.obtener_forecast_por_id(db, forecast_id, empresa_id)
    if not plan_antes:
        raise HTTPException(status_code=404, detail="Forecast no encontrado")
    
    actualizado = crud.actualizar_forecast_db(db, forecast_id, obj_in, empresa_id)
    
    await registrar_log(
        db, request, 
        user_id=current_user.id,
        user_name=current_user.username,
        modulo="SCM_DEMANDA", 
        accion="UPDATE", 
        empresa_id=empresa_id,
        payload_antes={"estado": plan_antes.estado},
        payload_despues={"estado": actualizado.estado}
    )
    return actualizado