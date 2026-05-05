from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
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

async def obtener_produccion_tiempo_real(db: Session, empresa_id: str, planta_id: Optional[int] = None, linea_id: Optional[int] = None):
    """Calcula KPIs operativos en tiempo real desde FactProduccionRT[cite: 14]."""
    hoy = date.today()
    filters = [FactProduccionRT.empresa_id == empresa_id, func.date(FactProduccionRT.fecha_hora) == hoy]
    
    if planta_id: filters.append(FactProduccionRT.planta_id == planta_id)
    if linea_id: filters.append(FactProduccionRT.linea_id == linea_id)

    res = db.query(
        func.sum(FactProduccionRT.unidades).label("total_u"),
        func.sum(FactProduccionRT.plan_unidades).label("total_p"),
        func.count(func.distinct(FactProduccionRT.orden_id)).label("ordenes"),
        func.sum(FactProduccionRT.minutos_parada).label("t_parada")
    ).filter(and_(*filters)).first()

    # Cálculo de cumplimiento[cite: 14]
    cumplimiento = (res.total_u / res.total_p * 100) if res.total_p and res.total_p > 0 else 0

    # Detalle por línea
    lineas = db.query(
        DimLinea.nombre,
        func.sum(FactProduccionRT.unidades).label("u")
    ).join(FactProduccionRT).filter(and_(*filters)).group_by(DimLinea.nombre).all()

    return {
        "produccionHoy": float(res.total_u or 0),
        "ordenesAbiertas": res.ordenes or 0,
        "cumplimientoPlanPct": round(float(cumplimiento), 2),
        "unidadesPorLinea": [{"linea": l.nombre, "unidades": float(l.u)} for l in lineas],
        "paradasActivas": [], # Lógica para eventos activos
        "tiempoDetenidoMin": int(res.t_parada or 0)
    }
    
# app/services/bi_service.py (referenciado como bi_service_12.py)

async def obtener_dashboard_calidad(db: Session, empresa_id: str, filtros: dict):
    """Calcula indicadores de calidad y costo de mala calidad (HU-041)[cite: 19]."""
    
    base_query = db.query(FactCalidad).filter(
        FactCalidad.empresa_id == empresa_id,
        FactCalidad.fecha.between(filtros['desde'], filtros['hasta'])
    )

    if filtros.get('productoId'):
        base_query = base_query.filter(FactCalidad.producto_id == filtros['productoId'])
    if filtros.get('clienteId'):
        base_query = base_query.filter(FactCalidad.cliente_id == filtros['clienteId'])

    eventos = base_query.all()

    # Agregaciones manuales para optimizar una sola pasada[cite: 19]
    metrics = {
        "RECHAZO": {"count": 0, "costo": 0},
        "RECLAMO": {"count": 0, "costo": 0},
        "SCRAP": {"qty": 0.0, "costo": 0},
        "RETRABAJO": {"count": 0, "costo": 0}
    }

    for e in eventos:
        if e.tipo_evento in metrics:
            if e.tipo_evento == "SCRAP":
                metrics["SCRAP"]["qty"] += float(e.cantidad)
            else:
                metrics[e.tipo_evento]["count"] += 1
            metrics[e.tipo_evento]["costo"] += float(e.costo)

    total_costo = sum(m["costo"] for m in metrics.values())[cite: 19]

    # Pareto de causas[cite: 19]
    causas = db.query(
        DimCausaNC.nombre,
        func.sum(FactCalidad.costo).label("total")
    ).join(FactCalidad).filter(FactCalidad.empresa_id == empresa_id).group_by(DimCausaNC.nombre).order_by(desc("total")).limit(5).all()

    return {
        "lotesRechazados": metrics["RECHAZO"]["count"],
        "reclamosCliente": metrics["RECLAMO"]["count"],
        "scrapKg": metrics["SCRAP"]["qty"],
        "retrabajos": metrics["RETRABAJO"]["count"],
        "costoMalaCalidad": total_costo,
        "tasaRechazo": 0.0, # Requiere cruce con total lotes producidos
        "scrapPct": 0.0,
        "causasTop": [{"causa": c.nombre, "impacto": float(c.total)} for c in causas],
        "tendenciaMensual": [] 
    }
    
# app/services/bi_service.py (referenciado como bi_service_13.py)

async def obtener_inventario_estrategico(db: Session, empresa_id: str, bodega_id: Optional[int] = None):
    """Calcula KPIs estratégicos de inventario (HU-042)[cite: 22]."""
    
    filters = [FactInventario.empresa_id == empresa_id]
    if bodega_id:
        filters.append(FactInventario.bodega_id == bodega_id)

    # 1. Resumen General[cite: 22]
    resumen = db.query(
        func.sum(FactInventario.valor_inventario).label("valor_total"),
        func.sum(case((FactInventario.es_quiebre == True, 1), else_=0)).label("quiebres"),
        func.sum(case((FactInventario.es_sobrestock == True, 1), else_=0)).label("sobrestock"),
        func.avg(FactInventario.indice_rotacion).label("rotacion_avg")
    ).filter(*filters).first()

    # 2. Top SKUs Críticos (Por valor inmovilizado o quiebre)[cite: 22]
    criticos = db.query(
        Producto.nombre,
        FactInventario.stock_actual,
        FactInventario.dias_cobertura,
        FactInventario.valor_inventario
    ).join(Producto, FactInventario.producto_id == Producto.id)\
     .filter(*filters)\
     .order_by(desc(FactInventario.es_quiebre), desc(FactInventario.valor_inventario))\
     .limit(10).all()

    # 3. Análisis de Lento Movimiento[cite: 22]
    lento = db.query(
        case(
            (FactInventario.dias_sin_movimiento > 90, "90+ días"),
            (FactInventario.dias_sin_movimiento > 60, "60-90 días"),
            else_="Normal"
        ).label("rango"),
        func.count(FactInventario.id).label("total")
    ).filter(*filters).group_by("rango").all()

    return {
        "valorTotalCartera": float(resumen.valor_total or 0),
        "skuEnQuiebre": int(resumen.quiebres or 0),
        "skuSobreStock": int(resumen.sobrestock or 0),
        "rotacionGlobal": round(float(resumen.rotacion_avg or 0), 2),
        "topCriticos": [{"producto": c.nombre, "stock": float(c.stock_actual), "cobertura": float(c.dias_cobertura)} for c in criticos],
        "composicionPorBodega": [], # Agregación opcional por bodega
        "analisisAntiguedad": {row.rango: row.total for row in lento}
    }
    
async def obtener_compras_estrategicas(db: Session, empresa_id: str, filtros: dict):
    """Calcula KPIs de abastecimiento (HU-043)[cite: 28]."""
    query = db.query(FactCompras).filter(
        FactCompras.empresa_id == empresa_id,
        FactCompras.fecha_oc.between(filtros['fechaDesde'], filtros['fechaHasta'])
    )
    
    if filtros.get('proveedorId'):
        query = query.filter(FactCompras.proveedor_id == filtros['proveedorId'])

    # 1. KPIs Generales[cite: 28]
    stats = db.query(
        func.sum(FactCompras.ahorro).label("total_ahorro"),
        func.avg(FactCompras.lead_time_dias).label("avg_lead"),
        func.sum(case((FactCompras.urgente == True, 1), else_=0)).label("total_urgentes")
    ).filter(FactCompras.empresa_id == empresa_id).first()

    # 2. Proveedor más costoso[cite: 28]
    costoso = db.query(FactCompras.proveedor_id, func.avg(FactCompras.precio_unitario).label("p"))\
        .group_by(FactCompras.proveedor_id).order_by(desc("p")).first()

    # 3. Variación de Precios (Simplificado: Comparativa vs Referencia)[cite: 28]
    variacion = db.query(
        func.avg((FactCompras.precio_unitario - FactCompras.precio_referencia) / 
                 FactCompras.precio_referencia * 100)
    ).filter(FactCompras.precio_referencia > 0).scalar() or 0

    return {
        "ahorrosCompras": float(stats.total_ahorro or 0),
        "proveedorMasCostoso": str(costoso.proveedor_id if costoso else "N/A"),
        "leadTimePromedioDias": round(float(stats.avg_lead or 0), 1),
        "comprasUrgentes": int(stats.total_urgentes or 0),
        "variacionPreciosPct": round(float(variacion), 2)
    }

# Agregar a bi_service_15.py
async def obtener_kpis_logisticos(db: Session, empresa_id: str, desde: date, hasta: date):
    """Calcula KPIs de última milla (HU-044)[cite: 30]."""
    
    query = db.query(
        func.sum(FactLogistica.costo_transporte).label("costo_t"),
        func.sum(FactLogistica.pedidos_entregados).label("pedidos_t"),
        func.sum(FactLogistica.capacidad_utilizada_vol).label("vol_u"),
        func.sum(FactLogistica.capacidad_total_vehiculo).label("vol_t"),
        func.sum(FactLogistica.distancia_real_km).label("km_t"),
        func.count(FactLogistica.id).label("total_viajes"),
        func.sum(case((FactLogistica.es_puntual == True, 1), else_=0)).label("puntuales")
    ).filter(
        FactLogistica.empresa_id == empresa_id,
        FactLogistica.fecha.between(desde, hasta)
    ).first()

    # Cálculo de KPIs[cite: 30]
    costo_pedido = (query.costo_t / query.pedidos_t) if query.pedidos_t and query.pedidos_t > 0 else 0
    utilizacion = (query.vol_u / query.vol_t * 100) if query.vol_t and query.vol_t > 0 else 0
    puntualidad = (query.puntuales / query.total_viajes * 100) if query.total_viajes and query.total_viajes > 0 else 0
    
    # Ranking de rutas por costo por pedido[cite: 30]
    rutas = db.query(
        DimRuta.nombre,
        (func.sum(FactLogistica.costo_transporte) / func.sum(FactLogistica.pedidos_entregados)).label("cpp")
    ).join(FactLogistica, FactLogistica.ruta_id == DimRuta.id)\
     .filter(FactLogistica.empresa_id == empresa_id)\
     .group_by(DimRuta.nombre)\
     .order_by(desc("cpp")).limit(5).all()

    return {
        "costoPromedioPorPedido": round(float(costo_pedido), 2),
        "utilizacionFlotaPct": round(float(utilizacion), 2),
        "productividadPromedioConductor": round(float(query.pedidos_t / 1), 2), # Ajustar según conteo de conductores
        "nivelServicioPuntualidad": round(float(puntualidad), 2),
        "distanciaTotalKm": float(query.km_t or 0),
        "rankingRutasCostosas": [{"ruta": r.nombre, "costo_pedido": float(r.cpp)} for r in rutas]
    }




