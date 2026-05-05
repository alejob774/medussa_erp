from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional

from app.db.session import get_bi_db
from app.api.deps import get_current_user, get_current_company
from app.services import bi_service
from app.schemas.bi import DashboardResponse

router = APIRouter()

@router.get("/dashboard-ejecutivo", response_model=DashboardResponse)
async def get_dashboard(
    fecha_desde: date,
    fecha_hasta: date,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Métricas consolidadas de Ventas, OEE y Alertas[cite: 11, 12]."""
    data = await bi_service.obtener_kpis_ejecutivos(db, empresa_id, fecha_desde, fecha_hasta)
    return {"success": True, "data": data}

@router.get("/rentabilidad-producto-linea")
async def get_rentabilidad(
    fecha_desde: date, 
    fecha_hasta: date, 
    top: int = 10,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Análisis de rentabilidad basado en tablas de hechos[cite: 11, 12]."""
    data = bi_service.calcular_rentabilidad(db, empresa_id, fecha_desde, fecha_hasta, top)
    return {"success": True, "data": data}

@router.get("/alertas-gerenciales")
async def get_alertas_gerenciales(
    estado: str = "ABIERTA",
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Lista de alertas críticas para la gerencia[cite: 11, 12]."""
    alertas = await bi_service.obtener_alertas_gerenciales(db, empresa_id, estado)
    return {"success": True, "data": alertas}

@router.get("/ventas-cumplimiento-comercial")
async def get_ventas_cumplimiento(
    fecha_desde: date,
    fecha_hasta: date,
    zona_id: Optional[int] = None,
    vendedor_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """KPIs de ventas con validación de rol (HU-036)[cite: 11, 12]."""
    roles_autorizados = ["GERENTE_COMERCIAL", "DIRECTOR_VENTAS", "ADMIN"]
    if not any(r in roles_autorizados for r in [getattr(current_user, 'rol', None)]):
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN, 
             detail="No autorizado para BI Comercial"
         )

    data = await bi_service.obtener_cumplimiento_comercial(
        db, empresa_id, fecha_desde, fecha_hasta, zona_id, vendedor_id
    )
    return {"success": True, "data": data}

@router.get("/clientes-estrategicos")
async def get_clientes_estrategicos(
    fecha_desde: date,
    fecha_hasta: date,
    vendedor_id: Optional[int] = None,
    zona_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Identificación de clientes clave y concentración (HU-037)[cite: 11, 12]."""
    roles_autorizados = ["GERENTE_COMERCIAL", "DIRECTOR_VENTAS", "KAM", "ADMIN"]
    if not any(r in roles_autorizados for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para BI Comercial")

    data = await bi_service.obtener_clientes_estrategicos(
        db, empresa_id, fecha_desde, fecha_hasta, vendedor_id, zona_id
    )
    return {"success": True, "data": data}

@router.get("/demanda-vs-forecast")
async def get_demanda_forecast(
    fecha_desde: date, 
    fecha_hasta: date,
    producto_id: Optional[int] = None,
    zona_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Análisis de precisión del forecast (HU-038)[cite: 11, 12]."""
    roles_ok = ["GERENTE_COMERCIAL", "DIRECTOR_PLANEACION", "SUPPLY_CHAIN_MANAGER", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para Forecast")

    params = {
        "fechaDesde": fecha_desde, 
        "fechaHasta": fecha_hasta, 
        "productoId": producto_id, 
        "zonaId": zona_id
    }
    data = await bi_service.obtener_demanda_vs_forecast(db, empresa_id, params)
    return {"success": True, "data": data}