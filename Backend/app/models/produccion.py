from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, func
from app.db.session import Base

class OrdenProduccion(Base):
    __tablename__ = "ordenes_produccion"
    __table_args__ = {"schema": "produccion"}

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String(50), nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"), nullable=False)
    cantidad_producida = Column(Numeric(14, 2))
    costo_mp = Column(Numeric(14, 2), default=0)    # Materia Prima
    costo_mo = Column(Numeric(14, 2), default=0)    # Mano de Obra
    costo_ind = Column(Numeric(14, 2), default=0)   # Indirectos
    costo_unitario_final = Column(Numeric(14, 2))   # Costo del lote
    fecha_registro = Column(DateTime, server_default=func.now())