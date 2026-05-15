from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional, Dict, Any

from app.db.session import get_bi_db
from app.api.deps import get_current_user, get_current_company
from app.services import bi_service
from app.schemas.bi import (
    ProduccionRTData, OEEConsolidadoData, CalidadDashboardData, 
    InventarioEstrategicoData, ComprasEstrategicasData, KpiLogisticosData, 
    GrafanaDashboardMeta
)
from app.core.config import settings

router = APIRouter()


def _resolver_rango_fechas(
    fecha_desde: Optional[date],
    fecha_hasta: Optional[date],
    fechaDesde: Optional[date],
    fechaHasta: Optional[date],
):
    desde = fecha_desde or fechaDesde
    hasta = fecha_hasta or fechaHasta
    if not desde or not hasta:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="fecha_desde/fecha_hasta o fechaDesde/fechaHasta son obligatorios"
        )
    return desde, hasta

# --- 1. ENDPOINTS DE GRAFANA ---

@router.get("/grafana/dashboards", response_model=List[GrafanaDashboardMeta])
async def get_grafana_dashboards(
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Devuelve las URLs embebibles de Grafana pre-filtradas por el Tenant (X-Company-ID)."""
    # URL Base de tu servidor Grafana (idealmente desde variables de entorno)
    GRAFANA_BASE_URL = getattr(settings, 'GRAFANA_URL', "http://localhost:3000")
    
    # Parámetros para embeber sin menú lateral y filtrando por empresa
    params = f"?orgId=1&kiosk=tv&var-empresa_id={empresa_id}"
    
    dashboards = [
        {"modulo": "ejecutivo", "titulo": "Dashboard Ejecutivo 360", "grafana_url": f"{GRAFANA_BASE_URL}/d/ejecutivo-360{params}"},
        {"modulo": "produccion", "titulo": "OEE Consolidado", "grafana_url": f"{GRAFANA_BASE_URL}/d/oee-planta{params}"},
        {"modulo": "inventario", "titulo": "Inventario Estratégico", "grafana_url": f"{GRAFANA_BASE_URL}/d/inventario-estrategico{params}"},
        {"modulo": "compras", "titulo": "Compras y Abastecimiento", "grafana_url": f"{GRAFANA_BASE_URL}/d/compras-kpi{params}"},
        {"modulo": "logistica", "titulo": "Rutas y Última Milla", "grafana_url": f"{GRAFANA_BASE_URL}/d/logistica-ultima-milla{params}"}
    ]
    return dashboards

# --- 2. ENDPOINTS DE DATOS NATIVOS (Sin Wrappers) ---

@router.get("/dashboard-ejecutivo", response_model=Dict[str, Any])
async def get_dashboard(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_kpis_ejecutivos(db, empresa_id, fecha_desde, fecha_hasta)

@router.get("/rentabilidad-producto-linea", response_model=Dict[str, Any])
async def get_rentabilidad(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, top: int = 10, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.calcular_rentabilidad(db, empresa_id, fecha_desde, fecha_hasta, top)

@router.get("/alertas-gerenciales")
async def get_alertas(estado: str = "ABIERTA", db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    return await bi_service.obtener_alertas_gerenciales(db, empresa_id, estado)

@router.get("/ventas-cumplimiento-comercial")
async def get_ventas(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, zona_id: Optional[int] = None, vendedor_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_cumplimiento_comercial(db, empresa_id, fecha_desde, fecha_hasta, zona_id, vendedor_id)

@router.get("/clientes-estrategicos")
async def get_clientes(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, vendedor_id: Optional[int] = None, zona_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_clientes_estrategicos(db, empresa_id, desde=fecha_desde, hasta=fecha_hasta, vendedor_id=vendedor_id, zona_id=zona_id)

@router.get("/demanda-vs-forecast")
async def get_forecast(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_demanda_vs_forecast(db, empresa_id, {"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta})

@router.get("/produccion-tiempo-real", response_model=ProduccionRTData)
async def get_produccion_rt(planta_id: Optional[int] = None, linea_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    return await bi_service.obtener_produccion_tiempo_real(db, empresa_id, planta_id, linea_id)

@router.get("/oee-consolidado-planta", response_model=OEEConsolidadoData)
async def get_oee_consolidado(db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    # Asumiendo existencia en bi_service
    return await bi_service.obtener_oee_consolidado(db, empresa_id)

@router.get("/calidad-no-conformidades", response_model=CalidadDashboardData)
async def get_calidad_dashboard(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, producto_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    filtros = {"desde": fecha_desde, "hasta": fecha_hasta, "productoId": producto_id}
    return await bi_service.obtener_dashboard_calidad(db, empresa_id, filtros)

@router.get("/inventario-estrategico", response_model=InventarioEstrategicoData)
async def get_inventario_estrategico(bodega_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    return await bi_service.obtener_inventario_estrategico(db, empresa_id, bodega_id)

@router.get("/compras-estrategicas", response_model=ComprasEstrategicasData)
async def get_compras_estrategicas(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, proveedor_id: Optional[int] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_compras_estrategicas(db, empresa_id, {"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta, "proveedorId": proveedor_id})

@router.get("/kpi-logisticos", response_model=KpiLogisticosData)
async def get_kpi_logisticos(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, fechaDesde: Optional[date] = None, fechaHasta: Optional[date] = None, db: Session = Depends(get_bi_db), empresa_id: str = Depends(get_current_company)):
    fecha_desde, fecha_hasta = _resolver_rango_fechas(fecha_desde, fecha_hasta, fechaDesde, fechaHasta)
    return await bi_service.obtener_kpis_logisticos(db, empresa_id, fecha_desde, fecha_hasta)
