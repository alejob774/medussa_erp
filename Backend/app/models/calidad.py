from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class CalidadInspeccion(Base):
    __tablename__ = "cal_inspeccion"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    tipo_control = Column(String(30)) # RECEPCION, PROCESO, PRODUCTO_TERMINADO
    lote = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    
    fecha_muestra = Column(DateTime)
    analista = Column(String(100))
    equipo_utilizado = Column(String(100))
    estado_lote = Column(String(20), default="PENDIENTE") # APROBADO, RECHAZADO, CUARENTENA
    liberado = Column(Boolean, default=False)
    observaciones = Column(Text)
    
    fecha_crea = Column(DateTime(timezone=True), server_default=func.now())
    
    detalles = relationship("CalidadInspeccionDetalle", back_populates="inspeccion", cascade="all, delete-orphan")

class CalidadInspeccionDetalle(Base):
    __tablename__ = "cal_inspeccion_detalle"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    inspeccion_id = Column(Integer, ForeignKey("produccion.cal_inspeccion.id"))
    parametro = Column(String(100))
    resultado = Column(Float)
    min_esperado = Column(Float)
    max_esperado = Column(Float)
    conforme = Column(Boolean)

    inspeccion = relationship("CalidadInspeccion", back_populates="detalles")