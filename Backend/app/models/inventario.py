from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = {"schema": "inventario"}

    id = Column(Integer, primary_key=True, index=True)
    producto_nom = Column(String(50), nullable=False)
    producto_sku = Column(String(50), nullable=False) # Único por empresa validado en lógica
    producto_fam = Column(String(50), nullable=False)
    producto_descrip = Column(String(200), nullable=False)
    uom_base = Column(String(10), nullable=False) # Unidad de medida
    producto_ref = Column(String(50), nullable=True)
    maneja_lote = Column(Boolean, default=False, nullable=False)
    maneja_venc = Column(Boolean, default=False, nullable=False)
    vida_util = Column(Integer, nullable=True)
    producto_status = Column(String(10), default="Activo", nullable=False) # Activo/Inactivo
    fact_convers = Column(Numeric(10, 4), nullable=True)
    
    # Relación Multiempresa
    empresa_id = Column(String(50), ForeignKey("configuracion.configuraciones.empresa_id"), nullable=False)
    
    # Relación para auditoría o movimientos futuros
    # movimientos = relationship("MovimientoInventario", back_populates="producto")