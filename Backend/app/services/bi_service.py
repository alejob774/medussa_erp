from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import date, timedelta
from app.models.bi import (
    AlertaDashboard, FactRentabilidadProducto, FactVentasComercial, 
    FactClienteVentas, DimCliente, FactForecastDemanda
)
from app.models.oee import OEE_Registro
from app.models.inventario import Producto

async def obtener_kpis_ejecutivos(db: Session, empresa_id: str, desde: date, hasta: date):
    """Dashboard de alto nivel[cite: 11, 12]."""
    ventas = db.query(func.sum(FactVentasComercial.ventas)).filter(
        FactVentasComercial.empresa_id == empresa_id,
        FactVentasComercial.fecha.between(desde, hasta)
    ).scalar() or 0

    oee_prom = db.query(func.avg(OEE_Registro.oee_total)).filter(
        OEE_Registro.empresa_id == empresa_id,
        OEE_Registro.fecha.between(desde, hasta)
    ).scalar() or 0

    alertas = db.query(func.count(AlertaDashboard.id)).filter(
        AlertaDashboard.empresa_id == empresa_id,
        AlertaDashboard.estado == "ABIERTA"
    ).scalar() or 0

    return {
        "ventasMes": float(ventas),
        "oeePromedio": round(float(oee_prom), 2),
        "alertasActivas": alertas
    }

def calcular_rentabilidad(db: Session, empresa_id: str, desde: date, hasta: date, top: int):
    """Ranking de rentabilidad basado en FactRentabilidadProducto[cite: 12, 14, 15]."""
    query = db.query(
        Producto.nombre,
        func.sum(FactRentabilidadProducto.ventas).label("ventas"),
        func.sum(FactRentabilidadProducto.utilidad).label("utilidad"),
        func.avg(FactRentabilidadProducto.margen_pct).label("margen")
    ).join(Producto, FactRentabilidadProducto.producto_id == Producto.id)\
     .filter(FactRentabilidadProducto.empresa_id == empresa_id, 
             FactRentabilidadProducto.fecha.between(desde, hasta))\
     .group_by(Producto.nombre).all()

    results = [{
        "producto": q.nombre,
        "ventas": float(q.ventas),
        "utilidad": float(q.utilidad),
        "margen_pct": float(q.margen)
    } for q in query]

    return {
        "topRentables": sorted(results, key=lambda x: x['utilidad'], reverse=True)[:top],
        "topNoRentables": sorted(results, key=lambda x: x['utilidad'])[:top]
    }

async def obtener_alertas_gerenciales(db: Session, empresa_id: str, estado: str):
    """Consulta de alertas activas[cite: 12, 14]."""
    return db.query(AlertaDashboard).filter(
        AlertaDashboard.empresa_id == empresa_id,
        AlertaDashboard.estado == estado
    ).order_by(desc(AlertaDashboard.fecha_creacion)).all()

async def obtener_cumplimiento_comercial(db: Session, empresa_id: str, desde: date, hasta: date, zona_id, vendedor_id):
    """Ratios de conversión y cumplimiento de metas[cite: 12, 14]."""
    filters = [FactVentasComercial.empresa_id == empresa_id, FactVentasComercial.fecha.between(desde, hasta)]
    if zona_id: filters.append(FactVentasComercial.zona_id == zona_id)
    if vendedor_id: filters.append(FactVentasComercial.vendedor_id == vendedor_id)

    stats = db.query(
        func.sum(FactVentasComercial.ventas).label("t_ventas"),
        func.sum(FactVentasComercial.meta).label("t_meta"),
        func.sum(FactVentasComercial.oportunidades).label("t_op"),
        func.sum(FactVentasComercial.cerradas).label("t_cerradas")
    ).filter(and_(*filters)).first()

    cumplimiento = (stats.t_ventas / stats.t_meta * 100) if stats.t_meta and stats.t_meta > 0 else 0
    conversion = (stats.t_cerradas / stats.t_op * 100) if stats.t_op and stats.t_op > 0 else 0

    return {
        "cumplimientoMeta": round(float(cumplimiento), 2),
        "conversionComercial": round(float(conversion), 2),
        "totalVentas": float(stats.t_ventas or 0)
    }

async def obtener_clientes_estrategicos(db: Session, empresa_id: str, desde: date, hasta: date, vendedor_id, zona_id):
    """Análisis de concentración y clientes inactivos[cite: 12, 14]."""
    filters = [FactClienteVentas.empresa_id == empresa_id, FactClienteVentas.fecha.between(desde, hasta)]
    if vendedor_id: filters.append(FactClienteVentas.vendedor_id == vendedor_id)
    if zona_id: filters.append(FactClienteVentas.zona_id == zona_id)

    query = db.query(
        DimCliente.nombre,
        func.sum(FactClienteVentas.ventas).label("v")
    ).join(DimCliente, FactClienteVentas.cliente_id == DimCliente.cliente_id)\
     .filter(and_(*filters)).group_by(DimCliente.nombre)\
     .order_by(desc("v")).limit(10).all()

    return {
        "topClientes": [{"nombre": q.nombre, "ventas": float(q.v)} for q in query]
    }

async def obtener_demanda_vs_forecast(db: Session, empresa_id: str, params: dict):
    """Precisión del forecast (HU-038)[cite: 12, 14]."""
    filters = [FactForecastDemanda.empresa_id == empresa_id, 
               FactForecastDemanda.fecha.between(params['fechaDesde'], params['fechaHasta'])]
    
    data = db.query(
        func.sum(FactForecastDemanda.forecast_qty).label("f"),
        func.sum(FactForecastDemanda.venta_real_qty).label("v")
    ).filter(and_(*filters)).first()

    f_total = float(data.f or 0)
    v_total = float(data.v or 0)
    error_pct = (abs(v_total - f_total) / f_total * 100) if f_total > 0 else 0
    
    return {
        "precisionPct": round(max(0, 100 - error_pct), 2),
        "errorPct": round(error_pct, 2)
    }