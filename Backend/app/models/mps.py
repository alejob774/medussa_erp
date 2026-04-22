from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class MPSPlan(Base):
    __tablename__ = "prod_mps_plan"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    planta = Column(String(100))
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)
    estado = Column(String(20), default="BORRADOR") # BORRADOR, APROBADO, CERRADO
    
    usuario_crea = Column(String(100))
    fecha_crea = Column(DateTime(timezone=True), server_default=func.now())

    detalles = relationship("MPSDetalle", back_populates="plan", cascade="all, delete-orphan")

class MPSDetalle(Base):
    __tablename__ = "prod_mps_detalle"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("produccion.prod_mps_plan.id"))
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    
    fecha_produccion = Column(Date)
    cantidad_proponer = Column(Float)
    prioridad = Column(Integer, default=1)
    horas_estimadas = Column(Float)

    plan = relationship("MPSPlan", back_populates="detalles")