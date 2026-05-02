from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, func
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