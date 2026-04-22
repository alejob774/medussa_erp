from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class InventarioConteo(Base):
    __tablename__ = "scm_inventario_conteo"
    __table_args__ = {"schema": "scm"}
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    bodega_id = Column(Integer, nullable=False) # Relación con tabla bodegas
    responsable_id = Column(Integer, ForeignKey("usuarios.usuarios.id"))
    fecha_inicio = Column(DateTime(timezone=True), server_default=func.now())
    estado = Column(String(20), default="ABIERTO") # ABIERTO, CERRADO, APLICADO
    observaciones = Column(Text)

class InventarioConteoDetalle(Base):
    __tablename__ = "scm_inventario_conteo_detalle"
    __table_args__ = {"schema": "scm"}
    
    id = Column(Integer, primary_key=True, index=True)
    conteo_id = Column(Integer, ForeignKey("scm.scm_inventario_conteo.id"))
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    lote_id = Column(String(50), nullable=True)
    cantidad_sistema = Column(Numeric(15, 4))
    cantidad_fisica = Column(Numeric(15, 4))
    diferencia = Column(Numeric(15, 4))
    ajustado = Column(Boolean, default=False)