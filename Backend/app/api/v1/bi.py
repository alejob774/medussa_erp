from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional

from app.db.session import get_bi_db
from app.api.deps import get_current_user, get_current_company
from app.services import bi_service
from app.schemas.bi import DashboardResponse, ProduccionRTResponse, OEEConsolidadoResponse, CalidadDashboardResponse, InventarioEstrategicoResponse, ComprasEstrategicasResponse, KpiLogisticosResponse

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

@router.get("/produccion-tiempo-real", response_model=ProduccionRTResponse)
async def get_produccion_rt(
    planta_id: Optional[int] = None,
    linea_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Dashboard operativo para planta (HU-039)[cite: 14]."""
    roles_ok = ["JEFE_PLANTA", "DIRECTOR_INDUSTRIAL", "SUPERVISOR_PRODUCCION", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para Operaciones")

    data = await bi_service.obtener_produccion_tiempo_real(db, empresa_id, planta_id, linea_id)
    return {"success": True, "data": data}

@router.get("/oee-consolidado-planta", response_model=OEEConsolidadoResponse)
async def get_oee_consolidado(
    fecha_desde: date,
    fecha_hasta: date,
    planta_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Métricas de OEE consolidado por planta y línea (HU-040)."""
    roles_ok = ["DIRECTOR_INDUSTRIAL", "JEFE_PLANTA", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para KPIs de OEE")

    data = await bi_service.obtener_oee_consolidado(db, empresa_id, fecha_desde, fecha_hasta, planta_id)
    return {"success": True, "data": data}
    
# app/api/v1/bi.py (referenciado como bi_11.py)

@router.get("/calidad-no-conformidades", response_model=CalidadDashboardResponse)
async def get_calidad_nc(
    fecha_desde: date,
    fecha_hasta: date,
    producto_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Métricas de Calidad y No Conformidades (HU-041)[cite: 19]."""
    roles_autorizados = ["GERENTE_CALIDAD", "DIRECTOR_OPERACIONES", "JEFE_PLANTA", "ADMIN"]
    if not any(r in roles_autorizados for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para Calidad")

    filtros = {"desde": fecha_desde, "hasta": fecha_hasta, "productoId": producto_id, "clienteId": cliente_id}
    data = await bi_service.obtener_dashboard_calidad(db, empresa_id, filtros)
    return {"success": True, "data": data}

# app/api/v1/bi.py (referenciado como bi_12.py)

@router.get("/inventario-estrategico", response_model=InventarioEstrategicoResponse)
async def get_inventario_estrategico(
    bodega_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Dashboard de Inventario Estratégico (HU-042)[cite: 22]."""
    # Roles con acceso: Supply Chain, Dirección y Finanzas[cite: 22]
    roles_ok = ["SUPPLY_CHAIN_MANAGER", "DIRECTOR_LOGISTICA", "FINANCIAL_DIRECTOR", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No tiene permisos para ver el inventario estratégico")

    data = await bi_service.obtener_inventario_estrategico(db, empresa_id, bodega_id)
    return {"success": True, "data": data}

@router.get("/compras-estrategicas", response_model=ComprasEstrategicasResponse)
async def get_compras_estrategicas(
    fecha_desde: date,
    fecha_hasta: date,
    proveedor_id: Optional[int] = None,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Métricas estratégicas de Compras (HU-043)[cite: 28]."""
    roles_ok = ["SUPPLY_CHAIN_MANAGER", "GERENTE_COMPRAS", "FINANCIAL_DIRECTOR", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(status_code=403, detail="No autorizado para Compras Estratégicas")

    filtros = {"fechaDesde": fecha_desde, "fechaHasta": fecha_hasta, "proveedorId": proveedor_id}
    data = await bi_service.obtener_compras_estrategicas(db, empresa_id, filtros)
    return {"success": True, "data": data}

# Agregar a bi_14.py
@router.get("/kpi-logisticos", response_model=KpiLogisticosResponse)
async def get_kpi_logisticos(
    fecha_desde: date,
    fecha_hasta: date,
    db: Session = Depends(get_bi_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    """Métricas de eficiencia logística y última milla (HU-044)[cite: 30]."""
    roles_ok = ["DIRECTOR_LOGISTICA", "SUPPLY_CHAIN_MANAGER", "ADMIN"]
    if not any(r in roles_ok for r in [getattr(current_user, 'rol', None)]):
        raise HTTPException(
            status_code=403, 
            detail="No autorizado para visualización de KPIs Logísticos"
        )

    data = await bi_service.obtener_kpis_logisticos(db, empresa_id, fecha_desde, fecha_hasta)
    return {"success": True, "data": data}





