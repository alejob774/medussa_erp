from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from app.models.ventas import FacturaVenta
from app.models.produccion import OrdenProduccion
from app.models.inventario import Producto
from app.models.bi import AlertaDashboard, FactRentabilidadProducto, FactVentasComercial, FactClienteVentas, DimCliente
from app.models.oee import OEE_Registro
from datetime import date, timedelta

def calcular_rentabilidad(db: Session, empresa_id: str, fecha_desde: str, fecha_hasta: str, top: int = 10):
    query_base = db.query(
        Producto.producto_nom,
        func.sum(FacturaVenta.total_venta).label("ventas"),
        func.sum(FacturaVenta.total_costo_venta).label("costo_v")
    ).join(FacturaVenta, Producto.id == FacturaVenta.id) \
     .filter(Producto.empresa_id == empresa_id, FacturaVenta.fecha_emision.between(fecha_desde, fecha_hasta)) \
     .group_by(Producto.producto_nom).all()

    results = []
    total_v_periodo = sum(q.ventas for q in query_base) if query_base else 0
    costos_ind_totales = total_v_periodo * 0.15 

    for q in query_base:
        peso_ventas = q.ventas / total_v_periodo if total_v_periodo > 0 else 0
        c_indirecto = costos_ind_totales * peso_ventas
        utilidad = q.ventas - q.costo_v - c_indirecto
        margen = (utilidad / q.ventas * 100) if q.ventas > 0 else 0
        
        results.append({
            "producto": q.producto_nom,
            "ventas": float(q.ventas),
            "utilidad": float(utilidad),
            "margen_pct": float(margen)
        })

    top_rentables = sorted(results, key=lambda x: x['utilidad'], reverse=True)[:top]
    top_no_rentables = sorted(results, key=lambda x: x['utilidad'])[:top]

    return {
        "productoMasRentable": top_rentables[0]['producto'] if top_rentables else "N/A",
        "productoMenosRentable": top_no_rentables[0]['producto'] if top_no_rentables else "N/A",
        "margenBrutoPromedio": sum(r['margen_pct'] for r in results) / len(results) if results else 0,
        "topRentables": top_rentables,
        "topNoRentables": top_no_rentables
    }

async def procesar_motor_alertas(db: Session, empresa_id: str):
    # Lógica de reglas de la HU-035
    oee_bajo = db.query(OEE_Registro).filter(
        OEE_Registro.empresa_id == empresa_id,
        OEE_Registro.oee_total < 65.0
    ).all()
    return oee_bajo

async def obtener_alertas_gerenciales(db: Session, empresa_id: str, estado: str = "ABIERTA"):
    return db.query(AlertaDashboard).filter(
        AlertaDashboard.empresa_id == empresa_id,
        AlertaDashboard.estado == estado
    ).order_by(desc(AlertaDashboard.fecha_creacion)).all()

async def obtener_cumplimiento_comercial(
    db: Session, 
    empresa_id: str, 
    fecha_desde: date, 
    fecha_hasta: date,
    zona_id: int = None,
    vendedor_id: int = None
):
    # Filtros base
    filters = [
        FactVentasComercial.empresa_id == empresa_id,
        FactVentasComercial.fecha.between(fecha_desde, fecha_hasta)
    ]
    if zona_id: filters.append(FactVentasComercial.zona_id == zona_id)
    if vendedor_id: filters.append(FactVentasComercial.vendedor_id == vendedor_id)

    # Agregación de KPIs Principales
    stats = db.query(
        func.sum(FactVentasComercial.ventas).label("total_ventas"),
        func.sum(FactVentasComercial.meta).label("total_meta"),
        func.sum(FactVentasComercial.pedidos).label("total_pedidos"),
        func.sum(FactVentasComercial.oportunidades).label("total_op"),
        func.sum(FactVentasComercial.cerradas).label("total_cerradas")
    ).filter(and_(*filters)).first()

    # Ventas del día (hoy)
    ventas_hoy = db.query(func.sum(FactVentasComercial.ventas)).filter(
        FactVentasComercial.empresa_id == empresa_id,
        FactVentasComercial.fecha == date.today()
    ).scalar() or 0

    # Cálculos de ratios (Evitando división por cero)
    ticket_prom = (stats.total_ventas / stats.total_pedidos) if stats.total_pedidos and stats.total_pedidos > 0 else 0
    cumplimiento = (stats.total_ventas / stats.total_meta * 100) if stats.total_meta and stats.total_meta > 0 else 0
    conversion = (stats.total_cerradas / stats.total_op * 100) if stats.total_op and stats.total_op > 0 else 0

    return {
        "ventasDia": float(ventas_hoy),
        "ventasMes": float(stats.total_ventas or 0),
        "cumplimientoMeta": round(float(cumplimiento), 2),
        "ticketPromedio": float(ticket_prom),
        "conversionComercial": round(float(conversion), 2),
        "topVendedores": [], # Implementar con joins a dim_vendedor si es requerido
        "ventasZona": [],
        "topClientes": []
    }

async def obtener_clientes_estrategicos(
    db: Session, 
    empresa_id: str, 
    fecha_desde: date, 
    fecha_hasta: date,
    vendedor_id: int = None,
    zona_id: int = None
):
    # Filtros base
    filters = [FactClienteVentas.empresa_id == empresa_id, FactClienteVentas.fecha.between(fecha_desde, fecha_hasta)]
    if vendedor_id: filters.append(FactClienteVentas.vendedor_id == vendedor_id)
    if zona_id: filters.append(FactClienteVentas.zona_id == zona_id)

    # 1. Ranking Top Clientes y Ventas Totales para Concentración
    query_ventas = db.query(
        FactClienteVentas.cliente_id,
        DimCliente.nombre,
        func.sum(FactClienteVentas.ventas).label("total_ventas")
    ).join(DimCliente, FactClienteVentas.cliente_id == DimCliente.cliente_id)\
     .filter(and_(*filters)).group_by(FactClienteVentas.cliente_id, DimCliente.nombre)\
     .order_by(desc("total_ventas")).all()

    total_ventas_periodo = sum(c.total_ventas for c in query_ventas) or 1
    top_clientes = [{"id": c.cliente_id, "nombre": c.nombre, "ventas": float(c.total_ventas)} for c in query_ventas[:10]]

    # 2. Concentración Ventas
    ventas_top5 = sum(c["ventas"] for c in top_clientes[:5])
    ventas_top10 = sum(c["ventas"] for c in top_clientes[:10])

    # 3. Clientes Inactivos (> 60 días)
    fecha_limite_inactivos = date.today() - timedelta(days=60)
    inactivos = db.query(DimCliente.nombre, func.max(FactClienteVentas.fecha_ultima_compra).label("ultima"))\
        .join(FactClienteVentas, DimCliente.cliente_id == FactClienteVentas.cliente_id)\
        .filter(FactClienteVentas.empresa_id == empresa_id)\
        .group_by(DimCliente.nombre).having(func.max(FactClienteVentas.fecha_ultima_compra) < fecha_limite_inactivos).all()

    return {
        "topClientes": top_clientes,
        "clientesInactivos": [{"nombre": i.nombre, "ultimaCompra": i.ultima} for i in inactivos],
        "concentracionVentasTop5": round((ventas_top5 / total_ventas_periodo) * 100, 2),
        "concentracionVentasTop10": round((ventas_top10 / total_ventas_periodo) * 100, 2),
        "crecimientoClientes": [] # Requiere lógica de comparación con periodo anterior
    }

async def obtener_demanda_vs_forecast(db: Session, empresa_id: str, params: dict):
    # Filtros dinámicos
    filters = [FactForecastDemanda.empresa_id == empresa_id, 
               FactForecastDemanda.fecha.between(params['fechaDesde'], params['fechaHasta'])]
    
    if params.get('productoId'): filters.append(FactForecastDemanda.producto_id == params['productoId'])
    if params.get('zonaId'): filters.append(FactForecastDemanda.zona_id == params['zonaId'])

    data = db.query(
        func.sum(FactForecastDemanda.forecast_qty).label("f_total"),
        func.sum(FactForecastDemanda.venta_real_qty).label("v_total")
    ).filter(and_(*filters)).first()

    f_total = float(data.f_total or 0)
    v_total = float(data.v_total or 0)
    
    # Fórmulas HU-038: Error% = |Real-Forecast|/Forecast * 100
    error_abs = abs(v_total - f_total)
    error_pct = (error_abs / f_total * 100) if f_total > 0 else 0
    precision = 100 - error_pct

    # Rankings subestimados (Real > Forecast) y sobrestimados (Forecast > Real)
    sub = db.query(Producto.producto_nom, (FactForecastDemanda.venta_real_qty - FactForecastDemanda.forecast_qty).label("diff"))\
            .join(Producto).filter(*filters, FactForecastDemanda.venta_real_qty > FactForecastDemanda.forecast_qty)\
            .order_by(desc("diff")).limit(5).all()

    return {
        "forecastTotal": f_total,
        "ventaReal": v_total,
        "errorForecastPct": round(error_pct, 2),
        "precisionPct": round(max(0, precision), 2),
        "subestimados": [{"nombre": s.producto_nom, "diferencia": float(s.diff)} for s in sub],
        "sobrestimados": [] # Lógica análoga a subestimados
    }