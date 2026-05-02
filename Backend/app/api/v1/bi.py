from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_company
from app.services import bi_service

router = APIRouter()

@router.get("/dashboard-ejecutivo")
async def get_dashboard(
    fecha_desde: str,
    fecha_hasta: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    data = await bi_service.obtener_kpis_ejecutivos(db, fecha_desde, fecha_hasta)
    return {"success": True, "data": data}

@router.get("/rentabilidad-producto-linea")
async def get_rentabilidad(
    empresaId: str, 
    fechaDesde: str, 
    fechaHasta: str, 
    top: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    data = bi_service.calcular_rentabilidad(db, empresaId, fechaDesde, fechaHasta, top)
    return {"success": True, "data": data}

@router.get("/alertas-gerenciales")
async def get_alertas_gerenciales(
    estado: str = "ABIERTA",
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    alertas = await bi_service.obtener_alertas_gerenciales(db, empresa_id, estado)
    return {"success": True, "data": alertas}

@router.get("/ventas-cumplimiento-comercial")
async def get_ventas_cumplimiento(
    fechaDesde: date,
    fechaHasta: date,
    zonaId: int = None,
    vendedorId: int = None,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    # Verificación básica de rol (HU-036 Escenario tres)
    # Asumiendo que el modelo Usuario tiene un atributo 'rol'
    if not any(r in ["GERENTE_COMERCIAL", "DIRECTOR_VENTAS", "ADMIN"] for r in [current_user.rol]):
         raise HTTPException(status_code=403, detail="No autorizado para BI Comercial")

    data = await bi_service.obtener_cumplimiento_comercial(
        db, empresa_id, fechaDesde, fechaHasta, zonaId, vendedorId
    )
    return {"success": True, "data": data}

@router.get("/clientes-estrategicos")
async def get_clientes_estrategicos(
    fechaDesde: date,
    fechaHasta: date,
    vendedorId: int = None,
    zonaId: int = None,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    # Verificación de permisos (Escenario tres)
    roles_autorizados = ["GERENTE_COMERCIAL", "DIRECTOR_VENTAS", "KAM", "ADMIN"]
    if not any(r in roles_autorizados for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para BI Comercial")

    data = await bi_service.obtener_clientes_estrategicos(
        db, empresa_id, fechaDesde, fechaHasta, vendedorId, zonaId
    )
    return {"success": True, "data": data}

@router.get("/demanda-vs-forecast")
async def get_demanda_forecast(
    fechaDesde: date, fechaHasta: date,
    productoId: int = None, zonaId: int = None,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    roles_ok = ["GERENTE_COMERCIAL", "DIRECTOR_PLANEACION", "SUPPLY_CHAIN_MANAGER", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para Forecast")

    params = {"fechaDesde": fechaDesde, "fechaHasta": fechaHasta, "productoId": productoId, "zonaId": zonaId}
    return {"success": True, "data": await bi_service.obtener_demanda_vs_forecast(db, empresa_id, params)}