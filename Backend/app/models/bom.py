from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class ProduccionBOM(Base):
    __tablename__ = "prod_bom"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    
    version = Column(String(10), default="1.0")
    estado = Column(String(20), default="BORRADOR") # BORRADOR, PENDIENTE, VIGENTE, OBSOLETA
    vigencia_desde = Column(Date)
    vigencia_hasta = Column(Date, nullable=True)
    
    merma_esperada = Column(Float, default=0.0)
    tiempo_proceso = Column(Integer) # Minutos
    rendimiento_esperado = Column(Float)
    
    observaciones = Column(Text)
    usuario_crea = Column(Integer)
    fecha_crea = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    ingredientes = relationship("ProduccionBOMDetalle", back_populates="bom", cascade="all, delete-orphan")

class ProduccionBOMDetalle(Base):
    __tablename__ = "prod_bom_detalle"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("produccion.prod_bom.id"))
    materia_prima_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    
    cantidad = Column(Float, nullable=False)
    unidad_medida = Column(String(10))
    costo_unitario = Column(Float)

    bom = relationship("ProduccionBOM", back_populates="ingredientes")