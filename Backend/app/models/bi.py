from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, func, Boolean
from app.db.session import Base

class AlertaDashboard(Base):
    __tablename__ = "bi_alerta_dashboard"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    empresa_id = Column(String(50), nullable=False)
    sede_id = Column(Integer, nullable=True)
    tipo = Column(String(50))
    severidad = Column(String(20))
    mensaje = Column(String(255))
    valor_detectado = Column(Numeric(14, 2))
    umbral = Column(Numeric(14, 2))
    responsable = Column(String(100))
    estado = Column(String(20), default="ABIERTA")
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_cierre = Column(DateTime, nullable=True)

class FactRentabilidadProducto(Base):
    __tablename__ = "fact_rentabilidad_producto"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    empresa_id = Column(String(50), nullable=False)
    fecha = Column(DateTime, server_default=func.now())
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    ventas = Column(Numeric(14, 2), default=0)
    costo_variable = Column(Numeric(14, 2), default=0)
    costo_indirecto = Column(Numeric(14, 2), default=0)
    utilidad = Column(Numeric(14, 2), default=0)
    margen_pct = Column(Numeric(5, 2), default=0)

class FactVentasComercial(Base):
    __tablename__ = "fact_ventas_comercial"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    vendedor_id = Column(Integer, index=True)
    cliente_id = Column(Integer, index=True)
    zona_id = Column(Integer, index=True)
    pedidos = Column(Integer, default=0)
    ventas = Column(Numeric(14, 2), default=0)
    meta = Column(Numeric(14, 2), default=0)
    oportunidades = Column(Integer, default=0)
    cerradas = Column(Integer, default=0)
    ticket_promedio = Column(Numeric(14, 2), default=0)
    conversion_pct = Column(Numeric(5, 2), default=0)
    fecha_carga = Column(DateTime, server_default=func.now())

class FactClienteVentas(Base):
    __tablename__ = "fact_cliente_ventas"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    cliente_id = Column(Integer, index=True)
    vendedor_id = Column(Integer, index=True)
    zona_id = Column(Integer, index=True)
    pedidos = Column(Integer, default=0)
    ventas = Column(Numeric(14, 2), default=0)
    ticket_promedio = Column(Numeric(14, 2), default=0)
    fecha_ultima_compra = Column(Date)
    fecha_carga = Column(DateTime, server_default=func.now())

class DimCliente(Base):
    __tablename__ = "dim_cliente"
    __table_args__ = {"schema": "bi"}

    cliente_id = Column(Integer, primary_key=True)
    nombre = Column(String(200))
    segmento = Column(String(100))
    ciudad = Column(String(100))
    fecha_alta = Column(Date)
    
class FactForecastDemanda(Base):
    __tablename__ = "fact_forecast_demanda"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    linea_id = Column(Integer)
    zona_id = Column(Integer)
    forecast_qty = Column(Numeric(14, 2), default=0)
    venta_real_qty = Column(Numeric(14, 2), default=0)
    error_pct = Column(Numeric(14, 2), default=0)
    precision_pct = Column(Numeric(14, 2), default=0)
    fecha_carga = Column(DateTime, server_default=func.now())

class DimLinea(Base):
    __tablename__ = "dim_linea"
    __table_args__ = {"schema": "bi"}

    linea_id = Column(Integer, primary_key=True)
    nombre = Column(String(100))
    planta_id = Column(Integer)
    capacidad_hora = Column(Numeric(14, 2))

class FactProduccionRT(Base):
    __tablename__ = "fact_produccion_rt"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha_hora = Column(DateTime, server_default=func.now())
    empresa_id = Column(String(50), nullable=False, index=True)
    planta_id = Column(Integer)
    linea_id = Column(Integer, ForeignKey("bi.dim_linea.linea_id"))
    orden_id = Column(Integer)
    producto_id = Column(Integer)
    unidades = Column(Numeric(14, 2), default=0)
    plan_unidades = Column(Numeric(14, 2), default=0)
    estado_linea = Column(String(30)) # ACTIVA, PARADA
    parada_activa = Column(Boolean, default=False)
    minutos_parada = Column(Integer, default=0)
    turno = Column(String(20))

class FactOEEConsolidado(Base):
    __tablename__ = "fact_oee_consolidado"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    planta_id = Column(Integer, index=True)
    linea_id = Column(Integer, ForeignKey("bi.dim_linea.linea_id"))
    turno = Column(String(20))
    
    # Métricas base
    disponibilidad_avg = Column(Numeric(5, 4))
    rendimiento_avg = Column(Numeric(5, 4))
    calidad_avg = Column(Numeric(5, 4))
    oee_ponderado = Column(Numeric(5, 4))
    
    # Metadatos de carga
    fecha_carga = Column(DateTime, server_default=func.now())

# app/models/bi.py (referenciado como bi_models_9.py)

class DimCausaNC(Base):
    __tablename__ = "dim_causa_nc"
    __table_args__ = {"schema": "bi"}

    causa_id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    categoria = Column(String(50)) # Materia Prima, Proceso, Empaque, etc.[cite: 19]

class FactCalidad(Base):
    __tablename__ = "fact_calidad"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True, nullable=False)
    empresa_id = Column(String(50), nullable=False, index=True)
    planta_id = Column(Integer, index=True)
    linea_id = Column(Integer, ForeignKey("bi.dim_linea.linea_id"))
    producto_id = Column(Integer, index=True)
    cliente_id = Column(Integer, index=True)
    lote_id = Column(String(100))
    
    tipo_evento = Column(String(50)) # SCRAP, RETRABAJO, RECHAZO, RECLAMO[cite: 19]
    causa_id = Column(Integer, ForeignKey("bi.dim_causa_nc.causa_id"))
    cantidad = Column(Numeric(14, 2), default=0)
    costo = Column(Numeric(14, 2), default=0) # Costo de mala calidad calculado[cite: 19]
    fecha_carga = Column(DateTime, server_default=func.now())

# app/models/bi.py (referenciado como bi_models_10.py)

class FactInventario(Base):
    __tablename__ = "fact_inventario"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha_corte = Column(Date, index=True, nullable=False)
    empresa_id = Column(String(50), nullable=False, index=True)
    bodega_id = Column(Integer, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    
    # Métricas de Stock
    stock_actual = Column(Numeric(14, 2), default=0)
    valor_inventario = Column(Numeric(14, 2), default=0)
    costo_unitario = Column(Numeric(14, 2), default=0)
    
    # KPIs de Gestión[cite: 22]
    consumo_mensual_promedio = Column(Numeric(14, 2), default=0)
    dias_cobertura = Column(Numeric(10, 2), default=0)
    indice_rotacion = Column(Numeric(10, 4), default=0)
    dias_sin_movimiento = Column(Integer, default=0)
    
    # Flags de Estrategia[cite: 22]
    es_sobrestock = Column(Boolean, default=False)
    es_quiebre = Column(Boolean, default=False)
    es_lento_movimiento = Column(Boolean, default=False)
    
    fecha_carga = Column(DateTime, server_default=func.now())

class FactCompras(Base):
    __tablename__ = "fact_compras"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha_oc = Column(Date, index=True, nullable=False)
    fecha_rec = Column(Date, nullable=True)
    empresa_id = Column(String(50), nullable=False, index=True)
    proveedor_id = Column(Integer, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"))
    categoria_id = Column(Integer, index=True)
    
    # Métricas Base
    cantidad = Column(Numeric(14, 2))
    precio_unitario = Column(Numeric(14, 2))
    precio_referencia = Column(Numeric(14, 2))
    
    # KPIs Calculados
    urgente = Column(Boolean, default=False)
    cumplio = Column(Boolean, default=True)
    lead_time_dias = Column(Integer)
    ahorro = Column(Numeric(14, 2))
    
    fecha_carga = Column(DateTime, server_default=func.now())

# Agregar a bi_models_12.py
class DimRuta(Base):
    __tablename__ = "dim_ruta"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    origen = Column(String(100))
    destino = Column(String(100))
    distancia_estimada_km = Column(Numeric(10, 2))

class FactLogistica(Base):
    __tablename__ = "fact_logistica"
    __table_args__ = {"schema": "bi"}

    id = Column(Integer, primary_key=True)
    fecha = Column(Date, index=True, nullable=False)
    empresa_id = Column(String(50), nullable=False, index=True)
    ruta_id = Column(Integer, ForeignKey("bi.dim_ruta.id"))
    conductor_id = Column(Integer)
    vehiculo_id = Column(Integer)
    
    # Métricas de la HU-044
    costo_transporte = Column(Numeric(14, 2), default=0)
    distancia_real_km = Column(Numeric(10, 2), default=0)
    pedidos_entregados = Column(Integer, default=0)
    capacidad_utilizada_vol = Column(Numeric(10, 2)) # m3 o kg
    capacidad_total_vehiculo = Column(Numeric(10, 2))
    
    # Flags de calidad de servicio[cite: 30]
    es_puntual = Column(Boolean, default=True)
    entrega_completa = Column(Boolean, default=True)
    
    fecha_carga = Column(DateTime, server_default=func.now())





