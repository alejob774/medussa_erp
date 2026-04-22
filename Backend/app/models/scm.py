from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Bodega(Base):
    __tablename__ = "bodegas"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    codigo = Column(String(20), nullable=False)
    nombre = Column(String(100), nullable=False)
    tipo = Column(String(50)) # Seco, Frío, etc.
    estado = Column(Boolean, default=True)

class Ubicacion(Base):
    __tablename__ = "ubicaciones"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    bodega_id = Column(Integer, ForeignKey("scm.bodegas.id"), nullable=False)
    zona = Column(String(50))
    pasillo = Column(String(20))
    rack = Column(String(20))
    nivel = Column(String(20))
    posicion = Column(String(20))
    capacidad_maxima = Column(Numeric(10, 2))
    capacidad_ocupada = Column(Numeric(10, 2), default=0)
    tipo_almacenamiento = Column(String(50))
    restriccion_sanitaria = Column(Boolean, default=False)
    estado = Column(Boolean, default=True)

class UbicacionSKU(Base):
    __tablename__ = "ubicacion_sku"
    __table_args__ = {"schema": "scm"}

    id = Column(Integer, primary_key=True, index=True)
    ubicacion_id = Column(Integer, ForeignKey("scm.ubicaciones.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    prioridad = Column(Integer, default=1) # 1: Primaria, 2: Reserva
    fecha_asignacion = Column(DateTime(timezone=True), server_default=func.now())