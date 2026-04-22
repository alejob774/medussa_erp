from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.db.session import Base

class UbicacionLayout(Base):
    __tablename__ = "scm_layout_ubicaciones"
    __table_args__ = {"schema": "scm"}
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    bodega_id = Column(Integer, nullable=False)
    zona = Column(String(50)) # Picking, Pulmón, Cuarentena, Frío
    pasillo = Column(String(10))
    rack = Column(String(10))
    nivel = Column(String(10))
    posicion = Column(String(10))
    
    capacidad_volumen = Column(Numeric(10, 2)) # m3
    capacidad_peso = Column(Numeric(10, 2)) # kg
    estado = Column(String(20), default="VACIO") # VACIO, OCUPADO, RESERVADO
    es_estrategica = Column(Boolean, default=False) # Para ABC Alta Rotación

class ReubicacionLog(Base):
    __tablename__ = "scm_layout_reubicaciones"
    __table_args__ = {"schema": "scm"}
    
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    lote_id = Column(String(50))
    u_origen_id = Column(Integer, ForeignKey("scm.scm_layout_ubicaciones.id"))
    u_destino_id = Column(Integer, ForeignKey("scm.scm_layout_ubicaciones.id"))
    cantidad = Column(Numeric(15, 4))
    usuario_id = Column(Integer)
    fecha_movimiento = Column(DateTime(timezone=True), server_default=func.now())
    motivo = Column(String(100)) # Optimización, FEFO, Calidad